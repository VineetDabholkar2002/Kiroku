param(
    [string]$Model = "dolphin-mistral",
    [int]$RedisPort = 6379
)

$ErrorActionPreference = "Stop"

Write-Host "Starting Kiroku services..." -ForegroundColor Cyan

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    throw "Ollama is not installed or not on PATH."
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

Write-Host ""
Write-Host "Ready:" -ForegroundColor Cyan
Write-Host "  Ollama model: $Model"
Write-Host "  Redis: 127.0.0.1:$RedisPort"
