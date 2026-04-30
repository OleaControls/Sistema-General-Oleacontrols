// Importa prospectos para jorge.gr@oleacontrols.com (cmnnrj9nz000004l5hmumbhkx)
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const ASSIGNEE_ID = 'cmnnrj9nz000004l5hmumbhkx';

// ── Datos ────────────────────────────────────────────────────────────────────
// [source, company, phone, email, address, delegacion, comoContactar, comentarios]
const RAW = [
  // despacho de arq
  ['despacho de arq','ESRUDIO 0726','56 3956 4449','','Boulevar Bosque de Las Naciones 75, Bosques de Aragon, 57170 Cdad. Nezahualcóyotl, Méx.','NEZAHUALCOYOTL','',''],
  ['despacho de arq','ARQUITECTOS DIGITARQ','55 2325 2284','','Dr. Roberto Gayol 1255, Col del Valle Sur, Benito Juárez, 03100 Ciudad de México, CDMX','BENITO JUAREZ','','no ofrecen proyectos especiales solo diseño'],
  ['despacho de arq','MIRAI BY GROUP DEI','55 2475 6089','','Calz. Gral. Mariano Escobedo 373, Polanco, Polanco V Secc, Miguel Hidalgo, 11560 Ciudad de México, CDMX','MIGUEL HIDALGO','',''],
  ['despacho de arq','ARQUITECTURA 11 11','55 3683 2478','','Av. Baja California 274, Hipódromo, Cuauhtémoc, 06100 Ciudad de México, CDMX','CUAUHTEMOC','',''],
  ['despacho de arq','ESKEMA ARQUITECTOS','55 5255 4472','','Lago Tanganica 71 Int-102 1er. Piso Alcaldía:, Granada, Miguel Hidalgo, 11520 Ciudad de México','MIGUEL HIDALGO','',''],
  ['despacho de arq','ALL ARQUITECTURA','55 5914 5408','','Moras 224, Tlacoquemecatl del Valle, Narvarte Poniente, Benito Juárez, 03200 Ciudad de México, CDMX','BENITO JUAREZ','',''],
  ['despacho de arq','RIVALIA DESPACHO ARQ','55 1686 7750','','C. Querétaro 219, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX','CUAUHTEMOC','',''],
  ['despacho de arq','ESPINOBARROS ARQU','55 4807 7593','','Nte. 81-A 443-Piso 1, Benito Juárez, Sindicato Mexicano de Electricistas, Azcapotzalco, 02500 Ciudad de México, CDMX','AZCAPOTZALCO','',''],
  ['despacho de arq','2H STUDIO','55 4678 4158','','Av. P.º de la Reforma 26, Juárez, Cuauhtémoc, Benito Juárez, 06600 Ciudad de México, CDMX','BENITO JUAREZ','',''],
  ['despacho de arq','SORDO MADALENO ARQ','55 5251 8104','','Av. Ejército Nacional Mexicano 843 B, Granada, Miguel Hidalgo, 11520 Ciudad de México, CDMX','MIGUEL HIDALGO','',''],
  ['despacho de arq','ARQUITECTURA AG','55 8263 8650','','','BENITO JUAREZ','',''],
  ['despacho de arq','ARREOLA & ROBLES','55 9246 7408','','Universidad 199 301, Av. Universidad 199-Interior 301, Narvarte Oriente, Benito Juárez, 03020 Ciudad de México, CDMX','BENITO JUAREZ','',''],
  ['despacho de arq','BOUTIQUE DE ARQUITECTURA','55 5554 4892','','C. Tres Cruces 26, Coyoacán, 04000 Ciudad de México, CDMX','COYOACAN','',''],
  ['despacho de arq','CASA DEL ARQUITECTO','55 5211 6051','','Av. Veracruz 24, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX','CUAUHTEMOC','',''],
  ['despacho de arq','MANZANOS ARQUITECTOS','664 368 6351','','','','',''],
  ['despacho de arq','MANUEL TORRES DESIGN','55 2623 0304','','Calle Ámsterdam, 163 A, Hipódromo +52 (55) 2623 0304, Cuauhtémoc, 06100 Ciudad de México, CDMX','CUAUHTEMOC','',''],
  ['despacho de arq','Adaltia Arquitectura','55 5181 8785','','','','',''],
  ['despacho de arq','Vgz Arquitectura','55 5280 3021','','Av. Emilio Castelar 111-Interior 2, Polanco, Polanco III Secc, Miguel Hidalgo, 11560 Ciudad de México, CDMX','MIGUEL HIDALGO','',''],
  ['despacho de arq','DESPACHO DE ARQUITECTURA','55 5347 0805','','Miguel Hidalgo, entre Calle San Mateo y Calle San Isidro 48, San Francisco Tetecala, Azcapotzalco, 02730 Ciudad de México, CDMX','AZCAPOTZALCO','',''],
  ['despacho de arq','M3 Arquitectos y Proyectos','55 1560 6341','','Av Parque de Chapultepec 48-MZ 012, El Parque, 53398 Naucalpan de Juárez, Méx.','NAUCALPAN','',''],
  ['despacho de arq','Farah Arquitectura y Construcción','55 3964 4319','','Rtno 7 del Tepozteco 12, Colinas del Bosque, Tlalpan, 14608 Ciudad de México, CDMX','TLALPAN','',''],
  ['despacho de arq','Despacho de Arquitectura JC','55 4051 5878','','Nahuatlacas 10, Ancon de los Reyes, 56410 Los Reyes Acaquilpan, Méx.','LOS REYES','',''],
  ['despacho de arq','ADQ arquitectos','55 5084 0596','','C. Naranjo 34, El Capulin, Los Cajones, 52948 Cdad. López Mateos, Méx.','CDAD LOPEZ MATEOS','',''],
  ['despacho de arq','Elías DEZER Arquitectura','56 4040 4079','','Av. Insurgentes Sur 1677-Int. 907, Guadalupe Inn, Álvaro Obregón, 01020 Ciudad de México, CDMX','ALVARO OBREGON','',''],
  ['despacho de arq','Despacho de Arquitéctos HV S.A. de C.V.','55 7159 5587','','Atlanta 143, Noche Buena, Benito Juárez, 03720 Ciudad de México, CDMX','BENITO JUAREZ','',''],
  ['despacho de arq','Aparente Studio','55 5103 1560','','Av. Álvaro Obregón 278, Hipódromo, Cuauhtémoc, 06100 Ciudad de México, CDMX','CUAUHTEMOC','',''],
  ['despacho de arq','Despachos de arquitectura en cdmx - RT Proyectos','55 8506 3871','','Priv. De Las Flores 4-10, San Diego Ocoyoacac, Miguel Hidalgo, 11290 Ciudad de México, CDMX','MIGUEL HIDALGO','',''],
  ['despacho de arq','SER MAS ARQUITECTOS, S.A. DE C.V.','55 6390 2249','','Cto. Circunvalación Ote. 8-DESPACHO 201-B, Cd. Satélite, 53100 Naucalpan de Juárez, Méx','NAUCALPAN','',''],
  ['despacho de arq','García de Alba + Ponce Arquitectos (GA__P studio)','999 216 9468','','Río Guadalquivir 45, Cuauhtémoc, 06500 Ciudad de México, CDMX','CUAUHTEMOC','',''],
  ['despacho de arq','MUSSARQ (Taller de Arquitectura y Diseño)','56 4301 4409','','','','',''],
  ['despacho de arq','HCH STUDIO ARQUITECTURA','55 7030 9472','','Durango 192, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX','CUAUHTEMOC','',''],
  ['despacho de arq','Arquitectura en Procesos Administrativos S.A de C.V','55 9002 2302','','Emma 25, Nativitas, Benito Juárez, 03500 Ciudad de México, CDMX','BENITO JUAREZ','',''],
  ['despacho de arq','Ek arquitectos','55 6140 9243','','Viveros del, Río Yautepec 52, Habitviveros del Rio, 54060 Mexico, Méx.','VIVEROS','',''],
  ['despacho de arq','V&V Arquitectura','55 5236 4186','','Cto. Arquitectos 11, Cd. Satélite, 53100 Naucalpan de Juárez, Méx.','NAUCALPAN','',''],
  ['despacho de arq','Rendering y Diseño Arquitectónico','55 4454 6225','','Av. Tamaulipas 150 Piso 18 Col, Hipódromo Condesa, 06100 CDMX','CUAUHTEMOC','',''],
  ['despacho de arq','BRAG Arquitectos','56 2135 8687','','Av. Insurgentes Sur 427, Hipódromo, Cuauhtémoc, 06100 Ciudad de México, CDMX','CUAUHTEMOC','',''],
  ['despacho de arq','POSADA ARQUITECTOS','55 5913 6474','','Blvrd Popocatépetl 136-A, Hab los Pirules, 54040 Tlalnepantla, Méx','TLALNEPANTLA','',''],
  ['despacho de arq','Despacho de Arquitectos / MMS Arquitectos','55 3415 8261','','Av Instituto Politécnico Nacional 1901, Lindavista Nte., Gustavo A. Madero, 07300 Ciudad de México, CDMX','GUSTAVO A MADERO','',''],
  ['despacho de arq','ROJOarquitectura','55 4444 4611','','Av. Río Churubusco 601, Xoco, Benito Juárez, 03330 Ciudad de México, CDMX','BENITO JUAREZ','',''],
  ['despacho de arq','TEN Arquitectos','55 5211 8004','','Cuernavaca 114-Planta baja, Colonia Condesa, Cuauhtémoc, 06140 Ciudad de México, CDMX','CUAUHTEMOC','',''],
  ['despacho de arq','LEGORRETA Y ALONSO ARQUITECTOS','55 8437 0322','','Av. P.º de la Reforma 2345, Lomas de la Reforma, Miguel Hidalgo, 11930 Ciudad de México, CDMX','MIGUEL HIDALGO','',''],
  ['despacho de arq','bgp arquitectura','55 5401 1335','','Ave María 23, Santa Catarina, Coyoacán, 04010 Ciudad de México, CDMX','COYOACAN','',''],
  ['despacho de arq','MB ARQUITECTO','55 4532 1504','','calle Aguiluchos LOMAS DEL LAGO NICOLAS ROMERO, 54400 MEXICO, Méx.','NICOLAS ROMERO','',''],
  ['despacho de arq','Marovisa Arquitectos - Avalúos y servicios inmobiliarios','722 692 4625','','Calle Prol Ramón Corona 501, Francisco Murguía, 50130 Toluca de Lerdo, Méx.','TOLUCA','',''],
  ['despacho de arq','Bia Buro de Ingeniería y Arquitectura','55 5384 5311','','Cda. Guerrero 19, Tlalnepantla Centro, 54000 Tlalnepantla, Méx.','TLALNEPANTLA CENTRO','',''],
  ['despacho de arq','Acanthus Despacho de Arquitectos en México','55 4627 1563','','Colegio 3B, Cd. Satélite, 53100 Naucalpan de Juárez, Méx.','NAUCALPAN','',''],
  ['despacho de arq','MOXX - Arquitectura de Taller','55 1553 6064','','Petrel 12, Las Alamedas, 52970 Cdad. López Mateos, Méx.','CDAD LOPEZ MATEOS','',''],
  ['despacho de arq','Modena Arquitectura','55 6908 2520','','Avenida Jorge Jiménez Cantú S/N Edificio 5B Piso 3, oficina 319 Antigua (centro de negocios Hacienda de Valle Escondido, Bosque Esmeralda, 52938 Méx.','BOSQUE ESMERALDA','',''],
  ['despacho de arq','TARE Arquitectos','55 1703 3837','','Av. Dr. Gustavo Baz 170, Bosques de Echegaray, 53310 Estado de Mexico, Méx.','BOSQUES ECHEGARAY','',''],
  ['despacho de arq','Despacho de Arquitectura y Diseño','55 4923 4077','','C. Zaragoza Manzana 020, San Antonio el Cuadro, 54960 Tultepec, Méx.','TULTEPEC','',''],
  ['despacho de arq','Gimetric Arquitectos','55 1802 5508','','Manzana 011, Bosque Esmeralda, 52930 Cdad. López Mateos, Méx.','CDAD LOAD. LÓPEZ MATEOS','',''],
  ['despacho de arq','Agustín Pedrote','55 5393 8603','','Colina de La Escondida 10, Boulevares, 53140 Naucalpan de Juárez, Méx.','NAUCALPAN','',''],
  ['despacho de arq','BG Arquitectos','55 9030 0749','','Convento San Agustín 54, Hab Jardines de Santa Monica, 54050 Tlalnepantla, Méx','JARDINES SANTA MONICA','',''],
  ['despacho de arq','Despacho de Arquitectura de Arte y Construir','55 5945 4253','','C. Florida Ote. 23-Loc.A, San Salvador Atenco, 56300 San Salvador Atenco, Méx.','ATENCO','',''],
  ['despacho de arq','MONTAGE ARQUITECTOS','55 2124 2705','','Coral 5 Av. Lomas del Río, Fraccionamiento Lomas del Río 57, 53800 México, Méx.','RÍO LOMAS DEL RÍO 57','',''],
  ['despacho de arq','Despacho de Arquitectura | CADICZA Arquitectos','55 1559 4797','','Bosques de los héroes Manzana 10 Lote 15-10, 55767 Ojo de Agua, Méx.','OJO DE AGUA','',''],
  ['despacho de arq','Ingeniero arquitecto Miguel Ernesto Cuéllar Morales','55 3001 1913','','C. Vallarta 40-despacho 203, Tlalnepantla Centro, 54000 Tlalnepantla, Méx.','TLALNEPANTLA','',''],
  ['despacho de arq','Despacho de Arquitecto, Diseño y Construcción XAA','5514877557','','Vicente Guerrero Entre Gregorio Aguilar Y José Maria Morelos, 55940 Axapusco','AXAPUSCO','',''],
  ['despacho de arq','despacho de ingenieria y arquitectura cuellar','55 3001 1913','','C. Vallarta 40-despacho 203, Tlalnepantla Centro, 54000 Tlalnepantla, Méx.','TLALNEPANTLA','',''],
  ['despacho de arq','Despacho Arquitectónico Calmananis','55 2460 0514','','Pl. Hidalgo 3, Centro, 54960 Tultepec, Méx.','TULTEPEC','',''],
  ['despacho de arq','D´ Kart Arquitectos','55 6104 2369','','Av. México Manzana 101 Lote 8, Bulevares del Lago, 54400 México, Méx.','BOULEVARES DEL LAGO','',''],
  ['despacho de arq','Arquitectura Armonia y Arte','55 2219 1710','','Ahuehuetes 16, U.H. Valle del Tenayo, 54147 Tlalnepantla, Méx.','TLALNEPANTLA','',''],
  ['despacho de arq','Arquitectura DC obras','722 535 4335','','Carr Toluca-Temoaya s/n, 50850 Molino Abajo, Méx.','MOLINO','',''],
  // Hoja4
  ['Hoja4','Marhnos','55 5980 7800','contacto@marhnos.com.mx','','','Buscar en LinkedIn: "Marhnos Director de Construcción"','Muy buen target'],
  ['Hoja4','Yama','55 8526 8372','info@yama.mx','','','Buscar: "Yama Project Manager"','Accesibles'],
  ['Hoja4','Grupo NIBIR','','','','','LinkedIn directo (empresa pequeña)','Alta conversión'],
  ['Hoja4','Grupo Somma','','','','','LinkedIn + mensaje directo','Proyectos activos'],
  ['Hoja4','Liva','','','','','Buscar socios / founders','Decisión rápida'],
  ['Hoja4','Dreamers','','','','','Buscar "Director" en LinkedIn','Mixto'],
  ['Hoja4','Meliora','','','','','LinkedIn directo','Residencial'],
  ['Hoja4','T18','','','','','Fundadores en LinkedIn','Muy accesibles'],
  ['Hoja4','AGGE','','','','','LinkedIn + página web','Pequeña'],
  ['Hoja4','Alfa Desarrolladora','','','','','LinkedIn','Similar perfil'],
  ['Hoja4','Constructora Moderna','','','','','LinkedIn (gerente obra)','Sustentable'],
  ['Hoja4','Grupo RSantos','','','','','Buscar "Project Manager"','Residencial'],
  ['Hoja4','Econstruye','','','','','LinkedIn directo','Activos'],
  ['Hoja4','Del Sol','','','','','Buscar director obra','Mixto'],
  ['Hoja4','Desarrollos Premium','','','','','Fundadores','Ticket alto'],
  ['Hoja4','Fibra UNO','55 4170 7070','contacto@funo.mx','','','Corporativo grande',''],
  ['Hoja4','Vesta','55 5950 0070','info@vesta.com.mx','','','Industrial',''],
  ['Hoja4','Prologis','55 1105 2900','mexico@prologis.com','','','Parques industriales',''],
];

// ── Helper: armar notas combinando todos los campos extra ────────────────────
function buildNotes(delegacion, comoContactar, comentarios) {
  const parts = [];
  if (delegacion)    parts.push(`Delegación: ${delegacion}`);
  if (comoContactar) parts.push(`Cómo contactar decisor: ${comoContactar}`);
  if (comentarios)   parts.push(`Comentarios: ${comentarios}`);
  return parts.join(' | ') || null;
}

// ── Helper: email placeholder único para prospectos sin correo ───────────────
function buildEmail(email, company, index) {
  if (email && email.trim() && email.trim().toLowerCase() !== 'n/d') return email.trim();
  const slug = company.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  return `prospecto-${slug}-${index}@sin-correo.local`;
}

async function main() {
  const pool = new (await import('pg')).default.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma  = new PrismaClient({ adapter });

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < RAW.length; i++) {
    const [source, company, phone, emailRaw, address, delegacion, comoContactar, comentarios] = RAW[i];

    const email = buildEmail(emailRaw, company, i);
    const notes = buildNotes(delegacion, comoContactar, comentarios);

    // Evitar duplicados por empresa + vendedor
    const existing = await prisma.lead.findFirst({
      where: { company: company.trim(), assignedToId: ASSIGNEE_ID },
    });

    if (existing) {
      console.log(`⏭  Ya existe: ${company}`);
      skipped++;
      continue;
    }

    await prisma.lead.create({
      data: {
        name:         company.trim(),
        company:      company.trim(),
        email,
        phone:        phone && phone !== 'N/D' ? phone.trim() : null,
        address:      address && address.trim() ? address.trim() : null,
        source:       source.trim(),
        stage:        'PROSPECT',
        estimatedValue: 0,
        assignedToId: ASSIGNEE_ID,
        notes,
      },
    });

    console.log(`✅ ${company}`);
    created++;
  }

  console.log(`\n📊 Resultado: ${created} creados, ${skipped} ya existían`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
