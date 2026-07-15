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

if (-not $env:GH_TOKEN) {
    throw 'Defina GH_TOKEN antes de publicar: $env:GH_TOKEN = "seu_token"'
}

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
    throw 'pnpm nao encontrado. Instale Node.js/pnpm ou use o runtime do Codex nesta maquina.'
}

Set-Location $root
pnpm run publish:release

$package = Get-Content -Path (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$version = [string]$package.version
$requiredAssets = @(
    "Planilha-Trader-Setup-$version.exe",
    "Planilha-Trader-Setup-$version.exe.blockmap",
    'latest.yml'
)

$missingAssets = $requiredAssets
for ($attempt = 1; $attempt -le 8; $attempt += 1) {
    $release = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/Michaeltf7/planilha-trader/releases/tags/v$version" `
        -Headers @{ Authorization = "Bearer $env:GH_TOKEN"; 'User-Agent' = 'PlanilhaTraderPublisher' }

    $assetNames = @($release.assets | ForEach-Object { $_.name })
    $missingAssets = @($requiredAssets | Where-Object { $assetNames -notcontains $_ })
    if ($missingAssets.Count -eq 0) {
        break
    }
    Start-Sleep -Seconds 5
}

if ($missingAssets.Count -gt 0) {
    throw "Publicacao incompleta da versao $version. Assets faltando no GitHub: $($missingAssets -join ', ')"
}

Write-Host "Release v$version publicada com instalador, blockmap e latest.yml."
