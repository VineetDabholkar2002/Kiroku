param(
    [string]$Model = "dolphin-mistral",
    [int]$RedisPort = 6379
)

$ErrorActionPreference = "Stop"

Write-Host "Starting Kiroku services..." -ForegroundColor Cyan

$hasOllama = (Get-Command ollama -ErrorAction SilentlyContinue) -ne $null
if (-not $hasOllama) {
    Write-Host "Ollama is not installed or not on PATH. AI local chat model will use cloud fallback." -ForegroundColor Yellow
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

if ($hasOllama) {
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
            Write-Warning "Failed to pull model $Model. Chat fallback will be used."
        }
    } else {
        Write-Host "Model $Model already installed." -ForegroundColor Green
    }
}

$redisUp = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", $RedisPort)
    $tcp.Close()
    $redisUp = $true
} catch {
    $redisUp = $false
}

if (-not $redisUp) {
    if (Get-Command redis-server -ErrorAction SilentlyContinue) {
        Write-Host "Starting redis-server..." -ForegroundColor Yellow
        Start-Process redis-server -ArgumentList "--port", "$RedisPort" -WindowStyle Minimized | Out-Null
        Start-Sleep -Seconds 2
        $redisUp = $true
    } elseif (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "Checking Docker for Redis..." -ForegroundColor Yellow
        & docker version *> $null
        if ($LASTEXITCODE -ne 0) {
            $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
            if (Test-Path $dockerDesktopPath) {
                Write-Host "Launching Docker Desktop..." -ForegroundColor Yellow
                Start-Process -FilePath $dockerDesktopPath
                for ($i = 0; $i -lt 30; $i++) {
                    Start-Sleep -Seconds 1
                    & docker version *> $null
                    if ($LASTEXITCODE -eq 0) { break }
                }
            }
        }

        & docker version *> $null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Docker is installed but daemon is not running. In-memory cache fallback will be used."
        } else {
            $containerName = "kiroku-redis"
            $exists = (& docker ps -aq -f "name=^${containerName}$" 2>$null | Select-Object -First 1)

            if ($exists) {
                Write-Host "Starting existing '$containerName' container..." -ForegroundColor Yellow
                & docker start $containerName | Out-Null
            } else {
                Write-Host "Creating and starting '$containerName' container..." -ForegroundColor Yellow
                & docker run -d --name $containerName -p "${RedisPort}:6379" --restart unless-stopped redis:alpine | Out-Null
            }

            for ($i = 0; $i -lt 10; $i++) {
                try {
                    $tcp = New-Object System.Net.Sockets.TcpClient
                    $tcp.Connect("127.0.0.1", $RedisPort)
                    $tcp.Close()
                    $redisUp = $true
                    break
                } catch {
                    Start-Sleep -Seconds 1
                }
            }
        }
    } else {
        Write-Warning "Neither redis-server nor Docker found. In-memory cache fallback will be used."
    }
}

if ($redisUp) {
    Write-Host "Redis is running on 127.0.0.1:$RedisPort." -ForegroundColor Green
} else {
    Write-Host "Redis is not active. Backend will fall back to in-memory caching." -ForegroundColor Yellow
}

Ensure-ChatServiceRunning -ChatPort 8000

Write-Host ""
Write-Host "Ready:" -ForegroundColor Cyan
Write-Host "  Ollama model: $Model"
Write-Host "  Redis: 127.0.0.1:$RedisPort"
