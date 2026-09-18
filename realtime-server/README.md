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

La app en Vercel corre sobre HTTPS y el navegador **bloquea `ws://` en claro**
desde una página segura. El cliente lo detecta y se desactiva solo con un aviso
en consola, en vez de reintentar en vano.

Mientras no se resuelva, el realtime funciona en la LAN con `npm run dev`. Para
producción hace falta **Cloudflare Tunnel** (gratis: da dominio y certificado
sin abrir puertos ni IP fija).
