$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$bundledBin = 'C:\Users\tavar\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin'
$bundledNode = 'C:\Users\tavar\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'

if (Test-Path $bundledBin) {
    $env:Path = "$bundledBin;$env:Path"
}
if (Test-Path $bundledNode) {
    $env:Path = "$bundledNode;$env:Path"
}

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
    throw 'pnpm nao encontrado. Instale Node.js/pnpm ou use o runtime do Codex nesta maquina.'
}

Set-Location $root
pnpm run build:installer
