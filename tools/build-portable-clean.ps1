$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$portableRoot = Join-Path $root 'dist\PlanilhaTrader-Portable-Limpa'
$electronExe = Get-ChildItem -LiteralPath 'C:\Users\tavar\Downloads' -Recurse -Filter electron.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like '*node_modules*electron*dist*electron.exe' } |
    Select-Object -First 1

if (-not $electronExe) {
    throw 'Nao encontrei electron.exe em Downloads. Rode npm install neste projeto ou mantenha uma copia com Electron em Downloads.'
}

if (Test-Path $portableRoot) {
    Remove-Item -LiteralPath $portableRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $portableRoot | Out-Null

$electronDist = Split-Path -Parent $electronExe.FullName
$runtimeTarget = Join-Path $portableRoot 'runtime'
Copy-Item -LiteralPath $electronDist -Destination $runtimeTarget -Recurse -Force

$appTarget = Join-Path $portableRoot 'app'
New-Item -ItemType Directory -Path $appTarget | Out-Null

$itemsToCopy = @(
    'index.html',
    'package.json',
    'css',
    'js',
    'electron',
    'img',
    'data',
    'data football',
    'tools',
    'rf.html',
    'scoreboard.js',
    'scoreboard_test.js',
    'pressao.html'
)

foreach ($item in $itemsToCopy) {
    $source = Join-Path $root $item
    if (Test-Path $source) {
        Copy-Item -LiteralPath $source -Destination (Join-Path $appTarget $item) -Recurse -Force
    }
}

$portableData = Join-Path $portableRoot 'DadosDoTeste'
New-Item -ItemType Directory -Path $portableData | Out-Null

$launcher = @'
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PLANILHA_TRADER_PORTABLE_DATA = Join-Path $root 'DadosDoTeste'
$electron = Join-Path $root 'runtime\electron.exe'
$app = Join-Path $root 'app'
Start-Process -FilePath $electron -ArgumentList @($app) -WorkingDirectory $app
'@
Set-Content -LiteralPath (Join-Path $portableRoot 'Abrir Planilha Trader Portable.ps1') -Value $launcher -Encoding UTF8

$launcherSource = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

public static class PortableLauncher
{
    [STAThread]
    public static int Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
        string electron = Path.Combine(root, "runtime", "electron.exe");
        string app = Path.Combine(root, "app");
        string data = Path.Combine(root, "DadosDoTeste");

        try
        {
            Directory.CreateDirectory(data);

            if (!File.Exists(electron))
            {
                MessageBox.Show("Nao encontrei runtime\\electron.exe. Extraia o ZIP inteiro antes de abrir.", "Planilha Trader Portable", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }

            if (!Directory.Exists(app))
            {
                MessageBox.Show("Nao encontrei a pasta app. Extraia o ZIP inteiro antes de abrir.", "Planilha Trader Portable", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }

            ProcessStartInfo info = new ProcessStartInfo(electron);
            info.Arguments = "\"" + app + "\"";
            info.WorkingDirectory = app;
            info.UseShellExecute = false;
            info.EnvironmentVariables["PLANILHA_TRADER_PORTABLE_DATA"] = data;
            Process.Start(info);
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "Planilha Trader Portable", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
'@

$exePath = Join-Path $portableRoot 'Planilha Trader Portable.exe'
try {
    Add-Type -TypeDefinition $launcherSource -ReferencedAssemblies 'System.Windows.Forms' -OutputAssembly $exePath -OutputType WindowsApplication
} catch {
    Write-Host "Nao foi possivel compilar o .exe iniciador. O .ps1 continua disponivel." -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

$readme = @'
PLANILHA TRADER - VERSAO PORTABLE LIMPA

Como abrir:
1. Extraia a pasta inteira.
2. Dê dois cliques em "Planilha Trader Portable.exe".

Se o Windows bloquear o arquivo:
- Clique em "Mais informacoes".
- Clique em "Executar assim mesmo".

Dados:
- Esta versao NAO leva os dados/importacoes/backups do desenvolvedor.
- Os dados criados pelo testador ficam somente na pasta "DadosDoTeste".
- Para resetar a versao de teste, feche o app e apague a pasta "DadosDoTeste".

Observacao:
- Nao mova arquivos para fora desta pasta. Envie a pasta completa ou o ZIP completo.
'@
Set-Content -LiteralPath (Join-Path $portableRoot 'LEIA-ME.txt') -Value $readme -Encoding UTF8

$zipPath = Join-Path $root 'dist\PlanilhaTrader-Portable-Limpa.zip'
if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -LiteralPath $portableRoot -DestinationPath $zipPath -Force

Write-Host "Portable limpo criado em:" -ForegroundColor Green
Write-Host $portableRoot -ForegroundColor Cyan
Write-Host "ZIP criado em:" -ForegroundColor Green
Write-Host $zipPath -ForegroundColor Cyan
