$ErrorActionPreference = 'Stop'

$mkcert = Get-Command mkcert -ErrorAction SilentlyContinue
if (-not $mkcert) {
    throw 'mkcert is not installed. Install it with: winget install --id FiloSottile.mkcert --exact'
}

$certDirectory = Join-Path $PSScriptRoot '..\frontend\certs'
New-Item -ItemType Directory -Force -Path $certDirectory | Out-Null
$certPath = Join-Path $certDirectory 'localhost.pem'
$keyPath = Join-Path $certDirectory 'localhost-key.pem'

$previousTrustStores = $env:TRUST_STORES
try {
    $env:TRUST_STORES = 'system'
    & $mkcert.Source -install
    if ($LASTEXITCODE -ne 0) {
        throw 'mkcert could not install its local root certificate in the Windows trust store.'
    }
}
finally {
    if ($null -eq $previousTrustStores) {
        Remove-Item Env:TRUST_STORES -ErrorAction SilentlyContinue
    }
    else {
        $env:TRUST_STORES = $previousTrustStores
    }
}

& $mkcert.Source -cert-file $certPath -key-file $keyPath localhost 127.0.0.1 ::1
if ($LASTEXITCODE -ne 0) {
    throw 'mkcert could not create the localhost certificate.'
}

Write-Host 'Trusted localhost certificate created in frontend\certs.'
