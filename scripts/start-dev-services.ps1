param(
    [string]$Model = "dolphin-mistral",
    [int]$RedisPort = 6379
)

$ErrorActionPreference = "Stop"

Write-Host "Starting Kiroku services..." -ForegroundColor Cyan

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    throw "Ollama is not installed or not on PATH."
}

function Ensure-ChatServiceRunning {
    param(
        [int]$ChatPort = 8000
    )

    $healthUrl = "http://127.0.0.1:$ChatPort/health"
    Write-Host "Checking Kiroku.Chat health at $healthUrl..." -ForegroundColor Cyan

    $chatHealthy = $false
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -Method Get -TimeoutSec 2 2>$null
        if ($response.StatusCode -eq 200) {
            $chatHealthy = $true
        }
    } catch {
        $chatHealthy = $false
    }

    if ($chatHealthy) {
        Write-Host "Kiroku.Chat is already running." -ForegroundColor Green
        return
    }

    $chatDir = Join-Path $PSScriptRoot "..\backend\Kiroku.Chat"
    if (-not (Test-Path $chatDir)) {
        Write-Host "Chat service directory not found at $chatDir. Skipping Kiroku.Chat auto-start." -ForegroundColor Yellow
        return
    }

    $venvPython = Join-Path $chatDir ".venv\Scripts\python.exe"
    $pythonExe = if (Test-Path $venvPython) { $venvPython } else { "python" }

    if (-not (Get-Command $pythonExe -ErrorAction SilentlyContinue)) {
        Write-Host "Python executable '$pythonExe' was not found. Skipping Kiroku.Chat auto-start." -ForegroundColor Yellow
        return
    }

    if (-not (Test-Path $chatDir)) {
        Write-Host "Chat service directory not found at $chatDir. Skipping Kiroku.Chat auto-start." -ForegroundColor Yellow
        return
    }

    Write-Host "Starting Kiroku.Chat from $chatDir..." -ForegroundColor Yellow
    Start-Process -FilePath $pythonExe -ArgumentList "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "$ChatPort" -WorkingDirectory $chatDir -WindowStyle Minimized | Out-Null
    Start-Sleep -Seconds 3

    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -Method Get -TimeoutSec 2 2>$null
        if ($response.StatusCode -eq 200) {
            Write-Host "Kiroku.Chat is now healthy." -ForegroundColor Green
            return
        }
    } catch {
    }

    Write-Host "Kiroku.Chat was started but did not respond on $healthUrl yet." -ForegroundColor Yellow
}

& ollama list *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Starting Ollama..." -ForegroundColor Yellow
    Start-Process ollama -ArgumentList "serve" -WindowStyle Minimized | Out-Null
    Start-Sleep -Seconds 3
}

$models = & ollama list
if ($models -notmatch [regex]::Escape($Model)) {
    Write-Host "Pulling model $Model..." -ForegroundColor Yellow
    & ollama pull $Model
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to pull model $Model."
    }
} else {
    Write-Host "Model $Model already installed." -ForegroundColor Green
}

$redisUp = $false
if (Get-Command redis-cli -ErrorAction SilentlyContinue) {
    $pong = & redis-cli -p $RedisPort ping 2>$null
    if ($LASTEXITCODE -eq 0 -and $pong -match "PONG") {
        $redisUp = $true
    }
}

if (-not $redisUp) {
    if (Get-Command redis-server -ErrorAction SilentlyContinue) {
        Write-Host "Starting redis-server..." -ForegroundColor Yellow
        Start-Process redis-server -ArgumentList "--port", "$RedisPort" -WindowStyle Minimized | Out-Null
        Start-Sleep -Seconds 2
        $redisUp = $true
    } elseif (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "Starting Redis with Docker..." -ForegroundColor Yellow
        & docker version *> $null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker is installed but not running."
        }

        $containerName = "kiroku-redis"
        $exists = (& docker ps -aq -f "name=^${containerName}$" 2>$null | Select-Object -First 1)

        if ($exists) {
            & docker start $containerName | Out-Null
        } else {
            & docker run -d --name $containerName -p "${RedisPort}:6379" redis:7-alpine | Out-Null
        }

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to start Redis container."
        }

        Start-Sleep -Seconds 2
        $redisUp = $true
    } else {
        throw "Redis is not installed and Docker is not available."
    }
} else {
    Write-Host "Redis already running." -ForegroundColor Green
}

Ensure-ChatServiceRunning -ChatPort 8000

Write-Host ""
Write-Host "Ready:" -ForegroundColor Cyan
Write-Host "  Ollama model: $Model"
Write-Host "  Redis: 127.0.0.1:$RedisPort"
