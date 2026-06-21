$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$electronCli = Join-Path $root 'node_modules\electron\cli.js'

if (-not (Test-Path $electronCli)) {
    $fallbackElectron = Get-ChildItem -LiteralPath 'C:\Users\tavar\Downloads' -Recurse -Filter electron.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like '*node_modules*electron*dist*electron.exe' } |
        Select-Object -First 1

    if ($fallbackElectron) {
        Set-Location $root
        Start-Process -FilePath $fallbackElectron.FullName -ArgumentList @('.') -WorkingDirectory $root -WindowStyle Hidden
        exit 0
    }

    Write-Host ""
    Write-Host "Electron ainda nao esta instalado nesta pasta e nao encontrei um Electron reutilizavel em Downloads." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Instale Node.js em https://nodejs.org/ e depois rode, nesta pasta:" -ForegroundColor White
    Write-Host "  npm install" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Depois abra o app com:" -ForegroundColor White
    Write-Host "  .\start-desktop.ps1" -ForegroundColor Cyan
    Write-Host ""
    Pause
    exit 1
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    $bundledNode = 'C:\Users\tavar\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path $bundledNode) {
        $nodePath = $bundledNode
    } else {
        Write-Host "Node.js nao encontrado." -ForegroundColor Red
        Pause
        exit 1
    }
} else {
    $nodePath = $node.Source
}

Set-Location $root
Start-Process -FilePath $nodePath -ArgumentList @($electronCli, '.') -WorkingDirectory $root -WindowStyle Hidden
