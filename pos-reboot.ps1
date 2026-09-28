# Finaliza a stack apos a reinicializacao do Windows:
#   1. instala Ubuntu no WSL2
#   2. inicia o Docker Desktop e espera o engine
#   3. sobe InfluxDB + Grafana (iot-stack/docker-compose.yml)
# Uso: powershell -ExecutionPolicy Bypass -File .\pos-reboot.ps1

$ErrorActionPreference = 'Continue'
$env:WSL_UTF8 = 1
$root = $PSScriptRoot

Write-Host "`n=== 1/3 WSL2 + Ubuntu ===" -ForegroundColor Cyan
$status = (wsl --status 2>&1) -join "`n"
if ($status -match 'virtualiza|virtualization') {
    Write-Host $status
    throw "WSL2 nao consegue iniciar: hipervisor inativo. Reinicie o Windows (Reiniciar, nao Desligar) e rode este script novamente."
}
$distros = @(wsl -l -q 2>$null | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
if ($distros -notcontains 'Ubuntu') {
    wsl --install -d Ubuntu --no-launch
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar Ubuntu (codigo $LASTEXITCODE)." }
    Write-Host "Ubuntu instalado. Na primeira abertura ('wsl'), crie usuario/senha do Linux." -ForegroundColor Yellow
} else { Write-Host "Ubuntu ja instalado." }
wsl -l -v

Write-Host "`n=== 2/3 Docker Desktop ===" -ForegroundColor Cyan
$dd = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) {
    # Sockets Unix orfaos em Docker\run (reparse points) impedem o backend de iniciar
    # e nao podem ser apagados; renomear a pasta resolve.
    foreach ($dir in @("$env:LOCALAPPDATA\Docker\run", "$env:LOCALAPPDATA\docker-secrets-engine")) {
        $socks = Get-ChildItem $dir -Force -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -eq 0 }
        if ($socks) {
            Rename-Item $dir "$dir.old_$(Get-Date -Format yyyyMMdd_HHmmss)"
            New-Item -ItemType Directory $dir | Out-Null
            Write-Host "  $dir limpa ($($socks.Count) sockets orfaos)"
        }
    }
    Start-Process $dd
}
$docker = "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe"
$env:Path += ";$env:ProgramFiles\Docker\Docker\resources\bin"
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
    & $docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ok = $true; break }
    Write-Host "  aguardando engine Docker... ($i)"; Start-Sleep 5
}
if (-not $ok) { throw "Docker nao respondeu em 5 min. Abra o Docker Desktop, aceite os termos e rode este script de novo." }
& $docker version --format 'Docker {{.Server.Version}} OK'

Write-Host "`n=== 3/3 InfluxDB + Grafana ===" -ForegroundColor Cyan
Set-Location "$root\iot-stack"
& $docker compose up -d
& $docker compose ps

Write-Host "`nPronto!" -ForegroundColor Green
Write-Host "  InfluxDB: http://localhost:8086  (admin / admin12345, org escola, bucket sensores)"
Write-Host "  Grafana : http://localhost:3000  (admin / admin)"
Write-Host "  Ponte MQTT->Influx: cd python-dados; uv run python ../iot-stack/mqtt_para_influx.py"
