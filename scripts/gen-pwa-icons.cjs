/* Genera los iconos PWA cuadrados a partir del logo 1000x1000.
   Sin dependencias: decodifica PNG RGBA con zlib, remuestrea por área y
   vuelve a codificar como PNG RGB opaco. */
const fs = require('fs');
const zlib = require('zlib');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// ── Decodificar PNG (bitDepth 8, colorType 6, sin entrelazado) ─────────────
function decodePNG(file) {
  const b = fs.readFileSync(file);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (b[24] !== 8 || b[25] !== 6 || b[28] !== 0) throw new Error('Solo soporto PNG RGBA de 8 bits sin entrelazar');

  const idat = [];
  let off = 8;
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(b.subarray(off + 8, off + 8 + len));
    if (type === 'IEND') break;
    off += 12 + len;
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp;
  const px = Buffer.alloc(h * stride);

  const paeth = (a, bb, c) => {
    const p = a + bb - c, pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
  };

  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const up = y > 0 ? px[(y - 1) * stride + x] : 0;
      const ul = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (a + up) >> 1;
      else if (filter === 4) v += paeth(a, up, ul);
      px[y * stride + x] = v & 0xff;
    }
  }
  return { w, h, px };
}

// ── Codificar PNG RGB opaco, filtro Paeth por fila ─────────────────────────
function encodePNG(w, h, rgb) {
  const stride = w * 3;
  const raw = Buffer.alloc(h * (stride + 1));
  const paeth = (a, bb, c) => {
    const p = a + bb - c, pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
  };
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 4;
    for (let x = 0; x < stride; x++) {
      const a  = x >= 3 ? rgb[y * stride + x - 3] : 0;
      const up = y > 0 ? rgb[(y - 1) * stride + x] : 0;
      const ul = x >= 3 && y > 0 ? rgb[(y - 1) * stride + x - 3] : 0;
      raw[y * (stride + 1) + 1 + x] = (rgb[y * stride + x] - paeth(a, up, ul)) & 0xff;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* Remuestreo por área: promedia todos los píxeles origen que caen en cada
   píxel destino. Un muestreo simple dejaría el trazo fino del logo con
   escalones a 192 px. El logo se compone antes sobre blanco para que el
   canal alfa no deje halos grises al promediar. */
function render(src, size, escala) {
  const out = Buffer.alloc(size * size * 3, 0xff);
  const lado = Math.round(size * escala);
  const margen = Math.round((size - lado) / 2);
  const paso = src.w / lado;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const x0 = Math.floor(x * paso), x1 = Math.max(x0 + 1, Math.floor((x + 1) * paso));
      const y0 = Math.floor(y * paso), y1 = Math.max(y0 + 1, Math.floor((y + 1) * paso));
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = y0; sy < y1 && sy < src.h; sy++) {
        for (let sx = x0; sx < x1 && sx < src.w; sx++) {
          const i = (sy * src.w + sx) * 4;
          const a = src.px[i + 3] / 255;
          r += src.px[i]     * a + 255 * (1 - a);
          g += src.px[i + 1] * a + 255 * (1 - a);
          b += src.px[i + 2] * a + 255 * (1 - a);
          n++;
        }
      }
      const d = ((y + margen) * size + (x + margen)) * 3;
      out[d]     = Math.round(r / n);
      out[d + 1] = Math.round(g / n);
      out[d + 2] = Math.round(b / n);
    }
  }
  return encodePNG(size, size, out);
}

const [, , fuente, ...destinos] = process.argv;
const src = decodePNG(fuente);
console.log(`Fuente: ${fuente} ${src.w}x${src.h}`);
for (const d of destinos) {
  const [ruta, size, escala] = d.split('|');
  const png = render(src, Number(size), Number(escala));
  fs.writeFileSync(ruta, png);
  console.log(`  → ${ruta}  ${size}x${size}  logo al ${Math.round(escala * 100)}%  ${(png.length / 1024).toFixed(1)} KB`);
}

/* Uso:
 *   node scripts/gen-pwa-icons.cjs public/img/logoolea.png \
 *     "public/pwa-192x192.png|192|0.82" \
 *     "public/pwa-512x512.png|512|0.82" \
 *     "public/pwa-maskable-512x512.png|512|0.6"
 *
 * Cada destino es ruta|lado|escala del logo dentro del cuadro. El separador es
 * "|" y no ":" porque en Windows la ruta ya trae los dos puntos de la unidad.
 */
