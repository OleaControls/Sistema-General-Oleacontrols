# Servidor Realtime — Olea Controls

Avisa a las vistas abiertas que algo cambió en la base, para que refresquen solas.

**Vive en la PC de la oficina: `192.168.1.175`, puerto `3002`.**

## Qué hace y qué NO hace

| Hace | No hace |
|---|---|
| Avisa `{ tabla, op, id }` | Mandar datos — el cliente relee por la API |
| Escucha Postgres con `LISTEN` | Escribir en la base |
| Reenviar GPS de técnicos (efímero) | Guardar el GPS |

**Si este servidor se cae, la app sigue funcionando.** Las vistas caen a su
polling de respaldo: más lentas, pero correctas. Nunca se pierde información,
porque por aquí no pasa ningún dato que no esté ya en Postgres.

## Arranque

```bash
npm run realtime
```

Comprobar desde otra PC: `http://192.168.1.175:3002/salud`

## Configuración (`.env` en la raíz)

| Variable | Para qué |
|---|---|
| `REALTIME_PORT` | Puerto. **3002** — el 3001 es de la API Express |
| `VITE_REALTIME_URL` | A dónde se conecta el navegador |
| `VITE_REALTIME_ENABLED` | `false` apaga el realtime en toda la app |
| `REALTIME_ORIGINS` | Dominios extra permitidos, separados por comas |

## Instalación en la PC de la oficina

### 1. Los triggers de la base (una sola vez)

```bash
node prisma/migrations-manual/aplicar.mjs 2026-09-18-realtime-notify.sql
```

Sin esto el servidor arranca pero nunca avisa de nada: no hay quien dispare el
`NOTIFY`.

### 2. Firewall de Windows

```powershell
New-NetFirewallRule -DisplayName "Olea Realtime 3002" -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow
```

### 3. Que arranque solo (sin que nadie abra una terminal)

Con [NSSM](https://nssm.cc), como servicio de Windows:

```powershell
nssm install OleaRealtime "C:\Program Files\nodejs\node.exe" "C:\ruta\al\proyecto\realtime-server\server.js"
nssm set OleaRealtime AppDirectory "C:\ruta\al\proyecto"
nssm set OleaRealtime Start SERVICE_AUTO_START
nssm start OleaRealtime
```

Como servicio arranca **antes de que alguien inicie sesión** en Windows. Si se
deja como tarea programada al login, tras un apagón la PC enciende, se queda en
la pantalla de bloqueo y el servidor nunca levanta.

### 4. Que la PC encienda sola al volver la luz

BIOS/UEFI → **Restore on AC Power Loss** → `Power On`.

Por defecto viene en `Stay Off`: se va la luz, vuelve, y la PC sigue apagada
hasta que alguien va y le pica el botón.

### 5. No-break

Uno de 600–900 VA. No es para seguir trabajando durante el apagón — es para que
Windows se apague ordenado y no se corrompa nada, y para aguantar los cortes de
uno o dos minutos, que son la mayoría.

Conecta también el **módem y el router**: de nada sirve la PC encendida si el
internet se murió con el apagón.

## Diagnóstico

| Síntoma | Causa probable |
|---|---|
| `/salud` responde, `escuchandoPostgres: false` | La PC no alcanza la base. Revisa internet |
| Conecta pero no llegan avisos | Faltan los triggers — corre el `.sql` del paso 1 |
| `TcpTestSucceeded : False` desde otra PC | Firewall (paso 2) o el servicio está caído |
| En producción no conecta | Mixed content: la app va en HTTPS y esto en http. Ver abajo |

## Pendiente para producción

El realtime no funciona en producción por **dos** razones independientes:

1. La app en Vercel va por HTTPS y el navegador **bloquea `ws://` en claro**
   desde una página segura. El cliente lo detecta y se desactiva solo con un
   aviso en consola, en vez de reintentar en vano.
2. `192.168.1.175` es una IP de red local: desde fuera de la oficina no la
   alcanza nadie, aunque fuera HTTPS.

Cloudflare Tunnel resuelve las dos, gratis y **sin abrir un solo puerto** en el
router: el túnel sale desde esta PC hacia Cloudflare, igual que la conexión
`LISTEN` sale hacia Postgres.

### Cómo se reparte el dominio

`oleacontrols.net` a secas solo puede apuntar a un sitio, y aquí hay dos
servicios distintos:

| Nombre | Apunta a | Nube en Cloudflare |
|---|---|---|
| `oleacontrols.net` | La app, en Vercel | **Gris** (DNS only) |
| `realtime.oleacontrols.net` | Esta PC, por el túnel | **Naranja** (proxied) |

Esa diferencia de color importa y es la causa más común de que esto falle:

- El registro del **túnel** lo crea `cloudflared` solo y va proxeado. Es la
  única forma de que el túnel funcione: el tráfico tiene que pasar por
  Cloudflare para bajar por él.
- El registro de **Vercel** va en DNS only. Si se deja proxeado, Cloudflare y
  Vercel intentan resolver el certificado cada uno por su lado y salen bucles
  de redirección o errores de SSL difíciles de leer.

### Requisito

`oleacontrols.net` tiene que estar en Cloudflare (plan gratuito). Si su DNS vive
en otro proveedor hay que cambiar los *nameservers* — trámite de una sola vez.

El correo de la empresa está en `@oleacontrols.com`, que es **otro dominio**:
mover los nameservers de `.net` no lo toca. Si `.net` tuviera algo publicado
—una web, un redirect— conviene copiar antes sus registros DNS, que Cloudflare
importa solos al agregar el dominio.

Para comprobarlo: el paso 2 abre el navegador y lista los dominios de la cuenta.
Si `oleacontrols.net` no aparece, todavía no está en Cloudflare.

### Pasos, en la PC del servidor

```powershell
# 1. Instalar
winget install --id Cloudflare.cloudflared

# 2. Autorizar (abre el navegador; elegir oleacontrols.net)
cloudflared tunnel login

# 3. Crear el túnel. Anotar el UUID que imprime.
cloudflared tunnel create olea-realtime

# 4. Apuntarle un subdominio
cloudflared tunnel route dns olea-realtime realtime.oleacontrols.net
```

Después, el `config.yml`. Lo escribe este script, que resuelve solo el usuario
de Windows y el UUID del paso 3 —se lo pregunta a Cloudflare por el nombre del
túnel— y valida el resultado con `cloudflared` antes de terminar:

```powershell
powershell -ExecutionPolicy Bypass -File .\generar-config-tunel.ps1
```

Si el archivo ya existe no lo pisa: lo muestra y termina. Para regenerarlo,
`-Forzar`. Queda en `%USERPROFILE%\.cloudflared\config.yml` y se ve así:

```yaml
tunnel: olea-realtime
credentials-file: C:\Users\TU-USUARIO\.cloudflared\UUID-DEL-PASO-3.json

ingress:
  - hostname: realtime.oleacontrols.net
    service: http://localhost:3002
  - service: http_status:404
```

El `service: http_status:404` del final no es opcional: sin esa regla de cierre
`cloudflared` rechaza el archivo completo y el túnel no arranca.

Probar y dejarlo como servicio de Windows:

```powershell
cloudflared tunnel run olea-realtime     # probar; Ctrl+C para parar
cloudflared service install              # que arranque solo con la PC
```

Comprobación: `https://realtime.oleacontrols.net/salud` debe responder desde
cualquier red, incluso desde un celular con datos móviles.

### Y en Vercel — el paso que siempre se olvida

`VITE_REALTIME_URL` **la hornea Vite al construir**, no se lee en tiempo de
ejecución. Cambiarla en Vercel no basta por sí solo: hay que volver a desplegar.

1. Vercel → Settings → Environment Variables
2. `VITE_REALTIME_URL` = `https://realtime.oleacontrols.net`
3. Deployments → el último → **Redeploy**

Los orígenes `*.vercel.app` ya están permitidos en el servidor, así que no hay
que tocar `REALTIME_ORIGINS` salvo que la app pase a un dominio propio.

### Si algo no conecta

| Síntoma | Causa |
|---|---|
| En consola: `Realtime desactivado ... es http` | Falta el redeploy con la variable nueva |
| `/salud` responde en la LAN pero no desde fuera | El túnel no está corriendo, o faltó el paso 4 |
| Conecta y se cae cada rato | La PC se está suspendiendo: revisar el plan de energía |
