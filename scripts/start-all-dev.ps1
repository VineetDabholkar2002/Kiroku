param(
    [string]$Model = "dolphin-mistral",
    [int]$RedisPort = 6379,
    [int]$ChatPort = 8000
)

$ErrorActionPreference = 'Stop'

Write-Host "Starting Kiroku dev environment..." -ForegroundColor Cyan

# Start service dependencies first
Write-Host "Starting local services..." -ForegroundColor Cyan
& "${PSScriptRoot}\start-dev-services.cmd" -Model $Model -RedisPort $RedisPort

# Launch backend in a separate PowerShell window
$backendDir = Resolve-Path (Join-Path $PSScriptRoot "..\backend")
$backendProject = Join-Path $backendDir "Kiroku.API\Kiroku.API.csproj"
$backendCommand = "Set-Location -LiteralPath '$backendDir'; dotnet run --project '$backendProject'"
Write-Host "Launching backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-NoProfile', '-Command', $backendCommand -WorkingDirectory $backendDir

# Launch frontend in a separate PowerShell window
$frontendDir = Resolve-Path (Join-Path $PSScriptRoot "..\frontend")
$frontendCommand = "Set-Location -LiteralPath '$frontendDir'; npm run dev"
Write-Host "Launching frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-NoProfile', '-Command', $frontendCommand -WorkingDirectory $frontendDir

Write-Host "Launched backend and frontend in new windows." -ForegroundColor Green
Write-Host "If one of the windows does not appear, make sure PowerShell is allowed to start new processes." -ForegroundColor Yellow
