using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Kiroku.API.Services
{
    public static class RedisServiceLauncher
    {
        public static async Task EnsureRunningAsync(IConfiguration configuration, ILogger logger)
        {
            if (string.Equals(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"), "true", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogInformation("Running inside container; skipping local Docker Desktop launcher.");
                return;
            }

            var redisSection = configuration.GetSection("RedisService");
            var autoStart = redisSection.GetValue("AutoStart", true);
            if (!autoStart)
            {
                logger.LogInformation("Redis auto-start is disabled in configuration.");
                return;
            }

            var connStr = configuration.GetConnectionString("Redis") ?? "localhost:6379";
            var parts = connStr.Split(':');
            var host = parts[0].Equals("localhost", StringComparison.OrdinalIgnoreCase) ? "127.0.0.1" : parts[0];
            var port = parts.Length > 1 && int.TryParse(parts[1], out var p) ? p : 6379;

            logger.LogInformation("Checking Redis health at {Host}:{Port}...", host, port);
            if (await IsPortOpenAsync(host, port))
            {
                logger.LogInformation("Redis is already running and accessible at {Host}:{Port}.", host, port);
                return;
            }

            logger.LogWarning("Redis is not accessible on {Host}:{Port}. Attempting to start Redis container...", host, port);

            // Step 1: Check if Docker is installed
            var dockerExe = FindExecutable("docker");
            if (string.IsNullOrEmpty(dockerExe))
            {
                logger.LogWarning("Docker executable was not found on PATH. In-memory cache fallback will be used.");
                return;
            }

            // Step 2: Check if Docker daemon is running
            if (!await IsDockerDaemonRunningAsync(dockerExe))
            {
                logger.LogInformation("Docker engine is not active. Attempting to launch Docker Desktop...");
                StartDockerDesktop(logger);

                // Wait up to 35 seconds for Docker daemon to become responsive
                for (int attempt = 0; attempt < 35; attempt++)
                {
                    await Task.Delay(1000);
                    if (await IsDockerDaemonRunningAsync(dockerExe))
                    {
                        logger.LogInformation("Docker engine is now responsive.");
                        break;
                    }
                }
            }

            if (!await IsDockerDaemonRunningAsync(dockerExe))
            {
                logger.LogWarning("Docker daemon did not become responsive in time. Kiroku will use in-memory cache fallback.");
                return;
            }

            // Step 3: Try to start existing 'kiroku-redis' container
            var (startSuccess, _) = await RunProcessAsync(dockerExe, "start kiroku-redis");
            if (!startSuccess)
            {
                // Container does not exist yet -> create and run it
                logger.LogInformation("Container 'kiroku-redis' not found. Creating new Redis container...");
                var (runSuccess, runOut) = await RunProcessAsync(dockerExe, $"run -d --name kiroku-redis -p {port}:6379 --restart unless-stopped redis:alpine");
                if (runSuccess)
                {
                    logger.LogInformation("Created and started 'kiroku-redis' container.");
                }
                else
                {
                    logger.LogWarning("Failed to run Redis container: {Output}", runOut);
                }
            }
            else
            {
                logger.LogInformation("Successfully sent start command to 'kiroku-redis' container.");
            }

            // Step 4: Wait for Redis port to accept connections
            var waitSeconds = redisSection.GetValue("StartupWaitSeconds", 15);
            for (int attempt = 0; attempt < waitSeconds; attempt++)
            {
                await Task.Delay(1000);
                if (await IsPortOpenAsync(host, port))
                {
                    logger.LogInformation("Redis container is now healthy and accepting connections at {Host}:{Port}!", host, port);
                    return;
                }
            }

            logger.LogWarning("Redis container was launched but did not accept connections on port {Port} within {Timeout}s. In-memory cache fallback active.", port, waitSeconds);
        }

        private static async Task<bool> IsPortOpenAsync(string host, int port)
        {
            try
            {
                using var tcpClient = new TcpClient();
                var connectTask = tcpClient.ConnectAsync(host, port);
                var completedTask = await Task.WhenAny(connectTask, Task.Delay(1000));
                if (completedTask != connectTask)
                {
                    return false;
                }
                await connectTask;
                return tcpClient.Connected;
            }
            catch
            {
                return false;
            }
        }

        private static async Task<bool> IsDockerDaemonRunningAsync(string dockerExe)
        {
            var (success, _) = await RunProcessAsync(dockerExe, "ps -q", timeoutMs: 5000);
            return success;
        }

        private static void StartDockerDesktop(ILogger logger)
        {
            string[] possiblePaths =
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Docker", "Docker", "resources", "com.docker.backend.exe"),
                @"C:\Program Files\Docker\Docker\resources\com.docker.backend.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Docker", "Docker", "Docker Desktop.exe"),
                @"C:\Program Files\Docker\Docker\Docker Desktop.exe"
            };

            foreach (var path in possiblePaths)
            {
                if (File.Exists(path))
                {
                    try
                    {
                        var startInfo = new ProcessStartInfo
                        {
                            FileName = path,
                            UseShellExecute = true
                        };
                        Process.Start(startInfo);
                        logger.LogInformation("Launched Docker Desktop from {Path}", path);
                        return;
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Failed to launch Docker Desktop from {Path}", path);
                    }
                }
            }
        }

        private static string FindExecutable(string command)
        {
            try
            {
                using var p = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "where.exe",
                        Arguments = command,
                        RedirectStandardOutput = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };
                p.Start();
                string? line;
                string? chosen = null;
                while ((line = p.StandardOutput.ReadLine()) != null)
                {
                    var trimmed = line.Trim();
                    if (trimmed.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                    {
                        chosen = trimmed;
                        break;
                    }
                    if (chosen == null && !string.IsNullOrWhiteSpace(trimmed))
                    {
                        chosen = trimmed;
                    }
                }
                p.WaitForExit(2000);
                return chosen ?? (OperatingSystem.IsWindows() ? $"{command}.exe" : command);
            }
            catch
            {
                return OperatingSystem.IsWindows() ? $"{command}.exe" : command;
            }
        }

        private static async Task<(bool Success, string Output)> RunProcessAsync(string fileName, string arguments, int timeoutMs = 15000)
        {
            try
            {
                using var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = fileName,
                        Arguments = arguments,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };

                process.Start();
                var readOutput = process.StandardOutput.ReadToEndAsync();
                var readError = process.StandardError.ReadToEndAsync();
                var completedTask = await Task.WhenAny(process.WaitForExitAsync(), Task.Delay(timeoutMs));

                if (completedTask != process.WaitForExitAsync())
                {
                    try { process.Kill(); } catch { }
                    return (false, "Timeout");
                }

                var output = await readOutput;
                var error = await readError;
                var combined = string.IsNullOrWhiteSpace(error) ? output : $"{output}\n{error}";
                return (process.ExitCode == 0, combined.Trim());
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }
    }
}
