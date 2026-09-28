# Inicia o Docker Desktop limpando antes os sockets Unix orfaos que o impedem de subir
# (erro "rename ...sock ...sock.stale: Nao e possivel o acesso ao arquivo pelo sistema").
# Usado no autostart do Windows no lugar do Docker Desktop.exe direto.
if (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue) { return }
foreach ($dir in @("$env:LOCALAPPDATA\Docker\run", "$env:LOCALAPPDATA\docker-secrets-engine")) {
    $socks = Get-ChildItem $dir -Force -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -eq 0 }
    if ($socks) {
        Rename-Item $dir "$dir.old_$(Get-Date -Format yyyyMMdd_HHmmss)" -ErrorAction SilentlyContinue
        New-Item -ItemType Directory $dir -Force | Out-Null
    }
}
# apaga pastas .old antigas que ja ficaram apagaveis (o Windows libera apos reboot)
Get-ChildItem $env:LOCALAPPDATA -Directory -Filter '*.old_*' -ErrorAction SilentlyContinue | ForEach-Object { cmd /c rmdir /s /q "$($_.FullName)" 2>$null }
Get-ChildItem "$env:LOCALAPPDATA\Docker" -Directory -Filter 'run.old_*' -ErrorAction SilentlyContinue | ForEach-Object { cmd /c rmdir /s /q "$($_.FullName)" 2>$null }
Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
