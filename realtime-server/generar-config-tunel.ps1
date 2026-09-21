# Escribe el config.yml del tunel de Cloudflare en la PC de la oficina.
#
# Resuelve solo las dos cosas que no se pueden saber de antemano: el usuario de
# Windows de esta PC y el UUID del tunel, que Cloudflare inventa al crearlo.
#
#   powershell -ExecutionPolicy Bypass -File .\generar-config-tunel.ps1
#
# Si el config.yml ya existe no lo toca, salvo que le pases -Forzar.

param(
  [string]$Tunel      = 'olea-realtime',
  [string]$Subdominio = 'realtime.oleacontrols.net',
  [int]   $Puerto     = 3002,
  [switch]$Forzar
)

$ErrorActionPreference = 'Stop'

$dir = Join-Path $env:USERPROFILE '.cloudflared'
$cfg = Join-Path $dir 'config.yml'

function Abortar($mensaje, $remedio) {
  Write-Host ""
  Write-Host "  $mensaje" -ForegroundColor Red
  Write-Host "  $remedio" -ForegroundColor Yellow
  Write-Host ""
  exit 1
}

# 1. cloudflared instalado
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Abortar "No encuentro cloudflared en esta PC." "Instalalo con:  winget install --id Cloudflare.cloudflared"
}

# 2. Sesion iniciada. El cert.pem es lo que deja 'tunnel login'.
if (-not (Test-Path (Join-Path $dir 'cert.pem'))) {
  Abortar "Falta el certificado de la cuenta ($dir\cert.pem)." "Corre:  cloudflared tunnel login    (abre el navegador; elegir oleacontrols.net)"
}

# 3. El UUID del tunel, preguntandoselo a Cloudflare por su nombre.
$lista = cloudflared tunnel list --output json | ConvertFrom-Json
$este  = $lista | Where-Object { $_.name -eq $Tunel } | Select-Object -First 1

if (-not $este) {
  Abortar "No existe ningun tunel llamado '$Tunel' en esta cuenta." "Crealo con:  cloudflared tunnel create $Tunel"
}

$uuid        = $este.id
$credenciales = Join-Path $dir "$uuid.json"

# 4. El archivo de credenciales lo deja 'tunnel create' en esta misma carpeta.
#    Si el tunel se creo en otra PC, el UUID existe pero el .json no esta aqui.
if (-not (Test-Path $credenciales)) {
  Abortar "El tunel '$Tunel' existe ($uuid) pero no encuentro sus credenciales en $credenciales." "Ese .json lo genero la PC donde se corrio 'tunnel create'. Copialo aqui, o borra el tunel y vuelve a crearlo desde esta PC."
}

if ((Test-Path $cfg) -and -not $Forzar) {
  Write-Host ""
  Write-Host "  Ya existe $cfg y no lo voy a pisar." -ForegroundColor Yellow
  Write-Host "  Si quieres regenerarlo:  .\generar-config-tunel.ps1 -Forzar"
  Write-Host ""
  Get-Content $cfg
  exit 0
}

$fecha = Get-Date -Format 'yyyy-MM-dd'

$yaml = @"
# Tunel de Cloudflare para el servidor realtime de Olea Controls.
# Generado por generar-config-tunel.ps1 el $fecha. No editar a mano:
# vuelve a correr el script si cambia el puerto o el subdominio.
#
# Saca el puerto $Puerto de esta PC a https://$Subdominio sin abrir
# un solo puerto en el router: la conexion sale de aqui hacia Cloudflare,
# igual que la conexion LISTEN sale hacia Postgres.

tunnel: $Tunel
credentials-file: $credenciales

ingress:
  # Lo que llegue al subdominio va al servidor realtime, que escucha local.
  - hostname: $Subdominio
    service: http://localhost:$Puerto
  # Regla de cierre, obligatoria: cualquier otra cosa se rechaza.
  - service: http_status:404
"@

New-Item -ItemType Directory -Force -Path $dir | Out-Null
[System.IO.File]::WriteAllText($cfg, $yaml, (New-Object System.Text.UTF8Encoding $false))

Write-Host ""
Write-Host "  Escrito: $cfg" -ForegroundColor Green
Write-Host ""
Get-Content $cfg
Write-Host ""

# 5. Que el propio cloudflared diga si el archivo le cuadra.
cloudflared tunnel ingress validate --config $cfg

Write-Host ""
Write-Host "  Sigue:" -ForegroundColor Cyan
Write-Host "    cloudflared tunnel route dns $Tunel $Subdominio   # una sola vez"
Write-Host "    cloudflared tunnel run $Tunel                     # probar; Ctrl+C para parar"
Write-Host "    cloudflared --config `"$cfg`" service install      # que arranque solo con la PC"
Write-Host ""
Write-Host "  Prueba final, desde un celular con datos moviles:"
Write-Host "    https://$Subdominio/salud"
Write-Host ""
