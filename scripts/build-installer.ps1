$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..")
$installerDir = Join-Path $projectRoot "src-tauri\target\release\bundle\nsis"

Push-Location $projectRoot
try {
    npm run dist:win
    if ($LASTEXITCODE -ne 0) {
        throw "Installer build failed with exit code $LASTEXITCODE"
    }

    $installer = Get-ChildItem -Path $installerDir -Filter "Noctune_*_x64-setup.exe" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $installer) {
        throw "Installer was not found in $installerDir"
    }

    Write-Host "Installer built:"
    Write-Host $installer.FullName
}
finally {
    Pop-Location
}
