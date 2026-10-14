param([switch]$Production)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    $toolDirectory = Join-Path $PSScriptRoot '.tools'
    $nodeVersion = 'v24.22.0'
    $nodeDirectory = Join-Path $toolDirectory "node-$nodeVersion-win-x64"
    if (-not (Test-Path -LiteralPath (Join-Path $nodeDirectory 'node.exe'))) {
        New-Item -ItemType Directory -Force -Path $toolDirectory | Out-Null
        $archiveName = "node-$nodeVersion-win-x64.zip"
        $archivePath = Join-Path $toolDirectory $archiveName
        Write-Host 'Preparando o Node.js portatil oficial...'
        Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/$nodeVersion/$archiveName" -OutFile $archivePath
        $checksums = (Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/$nodeVersion/SHASUMS256.txt").Content
        $checksumLine = ($checksums -split "`n" | Where-Object { $_.Trim().EndsWith($archiveName) } | Select-Object -First 1)
        if (-not $checksumLine) { throw 'Checksum oficial nao encontrado.' }
        $expectedHash = ($checksumLine.Trim() -split '\s+')[0]
        if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ne $expectedHash) { throw 'Checksum do Node.js divergente.' }
        Expand-Archive -LiteralPath $archivePath -DestinationPath $toolDirectory -Force
    }
    $env:PATH = $nodeDirectory + ';' + $env:PATH
}
if (-not (Test-Path -LiteralPath 'node_modules/tsx')) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel instalar as dependencias.' }
}
if ($Production) {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'O build falhou.' }
    Write-Host 'Abra http://localhost:3001 para jogar.'
    & npm.cmd start
} else {
    Write-Host 'Abra http://localhost:5173 para jogar.'
    & npm.cmd run dev
}
