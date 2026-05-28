param(
    [int]$RedisPort = 6379,
    [int]$ChatPort = 8000
)

$ErrorActionPreference = 'Continue'

Write-Host "Stopping Kiroku dev services..." -ForegroundColor Cyan

function Stop-ProcessList {
    param(
        [Parameter(Mandatory=$true)]
        [System.Collections.IEnumerable]$Processes
    )

    foreach ($process in $Processes) {
        try {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
            Write-Host "Stopped process $($process.Name) ($($process.ProcessId))." -ForegroundColor Green
        } catch {
            Write-Host "Could not stop process $($process.Name) ($($process.ProcessId)): $_" -ForegroundColor Yellow
        }
    }
}

function Stop-ChatService {
    Write-Host "Stopping Kiroku.Chat processes..." -ForegroundColor Cyan

    $chatProcesses = @()
    try {
        $chatProcesses += Get-CimInstance Win32_Process -Filter "Name='python.exe' OR Name='python3.exe'" 2>$null | Where-Object {
            $_.CommandLine -and ($_.CommandLine -match 'uvicorn' -and $_.CommandLine -match 'app:app' -or $_.CommandLine -match 'Kiroku.Chat')
        }
    } catch {
    }

    if ($chatProcesses.Count -gt 0) {
        Stop-ProcessList -Processes $chatProcesses
    } else {
        Write-Host "No Kiroku.Chat Python processes were found." -ForegroundColor Yellow
    }
}

function Stop-Ollama {
    Write-Host "Stopping Ollama..." -ForegroundColor Cyan
    $ollamaProcesses = Get-Process -Name ollama -ErrorAction SilentlyContinue
    if ($ollamaProcesses) {
        Stop-ProcessList -Processes $ollamaProcesses
    } else {
        Write-Host "No Ollama process was found." -ForegroundColor Yellow
    }
}

function Stop-RedisServer {
    Write-Host "Stopping local redis-server processes..." -ForegroundColor Cyan
    $redisProcesses = Get-Process -Name redis-server -ErrorAction SilentlyContinue
    if ($redisProcesses) {
        Stop-ProcessList -Processes $redisProcesses
    } else {
        Write-Host "No local redis-server process was found." -ForegroundColor Yellow
    }
}

function Stop-RedisDocker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "Docker is not available; skipping Redis Docker stop." -ForegroundColor Yellow
        return
    }

    Write-Host "Stopping Redis Docker container 'kiroku-redis'..." -ForegroundColor Cyan
    try {
        $containerId = (& docker ps -q -f "name=^kiroku-redis$") 2>$null
        if ($containerId) {
            & docker stop kiroku-redis | Out-Null
            Write-Host "Stopped Docker container kiroku-redis." -ForegroundColor Green
        } else {
            Write-Host "No running Docker container named kiroku-redis was found." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Failed to stop Docker container kiroku-redis: $_" -ForegroundColor Yellow
    }
}

Stop-ChatService
Stop-Ollama
Stop-RedisServer
Stop-RedisDocker

Write-Host "Kiroku dev stop sequence finished." -ForegroundColor Cyan
