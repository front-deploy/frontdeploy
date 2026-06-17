param(
  [string]$ApiEnvPath = "apps/api/.env"
)

$ErrorActionPreference = "Stop"

function Read-SecretPlainText {
  param([string]$Prompt)

  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Read-OptionalSecret {
  param([string]$Prompt)

  $value = Read-SecretPlainText -Prompt $Prompt
  return $value.Trim()
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $root $ApiEnvPath
$envDir = Split-Path -Parent $envPath
New-Item -ItemType Directory -Force -Path $envDir | Out-Null

$current = @{}
if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    if ($_ -match "^([^#=]+)=(.*)$") {
      $current[$matches[1]] = $matches[2]
    }
  }
}

$defaults = @{
  HOST = "127.0.0.1"
  PORT = "8787"
  NODE_ENV = "development"
  ALLOWED_ORIGINS = "chrome-extension://*,http://localhost:1012,http://localhost:1815"
  DATABASE_URL = ""
  DATABASE_SSL = "false"
  CLOUD_LABEL_SYNC_ENABLED = "false"
  HELIUS_API_KEY = ""
  BIRDEYE_API_KEY = ""
  JUPITER_API_KEY = ""
  GMGN_API_KEY = ""
  GMGN_CLI_PATH = "gmgn-cli"
  GMGN_ENABLED = "true"
  SOLANA_TRACKER_API_KEY = ""
  GOPLUS_API_KEY = ""
  PROVIDER_TIMEOUT_MS = "7000"
  AI_SUMMARY_ENABLED = "true"
}

foreach ($key in $defaults.Keys) {
  if (-not $current.ContainsKey($key)) {
    $current[$key] = $defaults[$key]
  }
}

$helius = Read-OptionalSecret -Prompt "Paste Helius API key (hidden, leave blank to keep current)"
$jupiter = Read-OptionalSecret -Prompt "Paste Jupiter API key (hidden, leave blank to keep current)"
$birdeye = Read-OptionalSecret -Prompt "Paste Birdeye API key (hidden, leave blank to keep current)"
$gmgn = Read-OptionalSecret -Prompt "Paste GMGN API key (hidden, leave blank to keep current)"
$solanaTracker = Read-OptionalSecret -Prompt "Paste Solana Tracker API key (hidden, leave blank to keep current)"
$goPlus = Read-OptionalSecret -Prompt "Paste GoPlus API key (hidden, leave blank to keep current)"

if ($helius.Length -gt 0) { $current["HELIUS_API_KEY"] = $helius }
if ($jupiter.Length -gt 0) { $current["JUPITER_API_KEY"] = $jupiter }
if ($birdeye.Length -gt 0) { $current["BIRDEYE_API_KEY"] = $birdeye }
if ($gmgn.Length -gt 0) { $current["GMGN_API_KEY"] = $gmgn }
if ($solanaTracker.Length -gt 0) { $current["SOLANA_TRACKER_API_KEY"] = $solanaTracker }
if ($goPlus.Length -gt 0) { $current["GOPLUS_API_KEY"] = $goPlus }

$order = @(
  "HOST",
  "PORT",
  "NODE_ENV",
  "ALLOWED_ORIGINS",
  "DATABASE_URL",
  "DATABASE_SSL",
  "CLOUD_LABEL_SYNC_ENABLED",
  "HELIUS_API_KEY",
  "BIRDEYE_API_KEY",
  "JUPITER_API_KEY",
  "GMGN_API_KEY",
  "GMGN_CLI_PATH",
  "GMGN_ENABLED",
  "SOLANA_TRACKER_API_KEY",
  "GOPLUS_API_KEY",
  "PROVIDER_TIMEOUT_MS",
  "AI_SUMMARY_ENABLED"
)

$lines = foreach ($key in $order) {
  "$key=$($current[$key])"
}

Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8
Write-Host "Updated $ApiEnvPath. Do not commit this file."
