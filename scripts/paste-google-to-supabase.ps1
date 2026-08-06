# .env.local 의 Google OAuth 값을 Supabase Management API로 등록
# 필요: .env.local 에 SUPABASE_ACCESS_TOKEN=sbp_...

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root '.env.local'
if (-not (Test-Path $envFile)) {
  Write-Error ".env.local 이 없습니다."
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    Set-Item -Path "env:$name" -Value $value
  }
}

if (-not $env:GOOGLE_OAUTH_CLIENT_ID -or -not $env:GOOGLE_OAUTH_CLIENT_SECRET) {
  Write-Error "GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET 가 .env.local 에 필요합니다."
}
if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Error "SUPABASE_ACCESS_TOKEN 이 .env.local 에 필요합니다. https://supabase.com/dashboard/account/tokens"
}

$ProjectRef = 'ainftwifvclgiookzrwm'
$body = @{
  external_google_enabled = $true
  external_google_client_id = $env:GOOGLE_OAUTH_CLIENT_ID
  external_google_secret = $env:GOOGLE_OAUTH_CLIENT_SECRET
  site_url = 'http://localhost:5173'
  uri_allow_list = 'http://localhost:5173/login,http://127.0.0.1:5173/login'
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Patch `
  -Uri "https://api.supabase.com/v1/projects/$ProjectRef/config/auth" `
  -Headers @{
    Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"
    'Content-Type' = 'application/json'
  } `
  -Body $body | Out-Null

Write-Host "Supabase Google Provider 활성화 완료." -ForegroundColor Green
