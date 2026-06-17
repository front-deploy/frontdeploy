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

function Read-OptionalPlainText {
  param([string]$Prompt)

  $value = Read-Host -Prompt $Prompt
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
  DATABASE_SSL = "true"
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

if ($env:SUPABASE_ACCESS_TOKEN) {
  try {
    $projects = Invoke-RestMethod `
      -Uri "https://api.supabase.com/v1/projects" `
      -Headers @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" } `
      -Method Get

    Write-Host "Supabase token works. Visible projects:"
    $projects | ForEach-Object {
      Write-Host "- $($_.name) [$($_.id)]"
    }
  }
  catch {
    Write-Host "Supabase token check failed. Continue with DATABASE_URL setup."
  }
}
else {
  Write-Host "SUPABASE_ACCESS_TOKEN is not set. Skipping project listing."
}

$databaseUrl = Read-SecretPlainText -Prompt "Paste Supabase Postgres DATABASE_URL URI (hidden, leave blank to keep current)"
if ($databaseUrl.Trim().Length -gt 0) {
  $current["DATABASE_URL"] = $databaseUrl.Trim()
}

$databaseSsl = Read-OptionalPlainText -Prompt "Use DATABASE_SSL=true? (press Enter for true)"
if ($databaseSsl.Length -gt 0) {
  $current["DATABASE_SSL"] = $databaseSsl.ToLowerInvariant()
}
else {
  $current["DATABASE_SSL"] = "true"
}

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

$node = "node"
if (Test-Path (Join-Path $root "..\tools\node-v24.15.0-win-x64\node.exe")) {
  $node = Resolve-Path (Join-Path $root "..\tools\node-v24.15.0-win-x64\node.exe")
}

& $node (Join-Path $root "scripts/apply-supabase-migration.mjs")
