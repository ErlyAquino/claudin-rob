# Gera DOCX (node) e converte para ODT e PDF com LibreOffice
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$saida = Join-Path $here '..\saida'
node (Join-Path $here 'gerar.js')
$soffice = 'C:\Program Files\LibreOffice\program\soffice.com'
$docs = Get-ChildItem $saida -Filter *.docx
# ODT (Writer) e PDF; --convert-to com filtro explicito
& $soffice --headless --convert-to odt --outdir $saida $docs.FullName | Out-Null
& $soffice --headless --convert-to 'pdf:writer_pdf_Export' --outdir $saida $docs.FullName | Out-Null
Get-ChildItem $saida | Select-Object Name, @{n='KB';e={[math]::Round($_.Length/1KB)}} | Format-Table -AutoSize
