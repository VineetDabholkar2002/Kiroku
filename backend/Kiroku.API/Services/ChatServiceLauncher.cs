using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Kiroku.API.Services
{
    public static class ChatServiceLauncher
    {
        public static async Task EnsureRunningAsync(IConfiguration configuration, string apiContentRoot, ILogger logger)
        {
            if (string.Equals(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"), "true", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogInformation("Running inside container; skipping local Python process launcher.");
                return;
            }

            var chatSection = configuration.GetSection("ChatService");
            var autoStart = chatSection.GetValue("AutoStart", true);
            if (!autoStart)
            {
                logger.LogInformation("Chat service auto-start is disabled.");
                return;
            }

            var healthUrl = chatSection["HealthUrl"] ?? "http://127.0.0.1:8000/health";
            logger.LogInformation("Checking Kiroku.Chat health at {HealthUrl}...", healthUrl);
            if (await IsChatHealthyAsync(healthUrl))
            {
                logger.LogInformation("Kiroku.Chat is already running. Health check passed at {HealthUrl}.", healthUrl);
                return;
            }

            var chatDir = Path.GetFullPath(Path.Combine(apiContentRoot, "..", "Kiroku.Chat"));
            var venvPython = Path.Combine(chatDir, ".venv", "Scripts", "python.exe");
            var pythonExe = File.Exists(venvPython) ? venvPython : (chatSection["PythonExecutable"] ?? "python");

            if (!Directory.Exists(chatDir))
            {
                logger.LogWarning("Chat service directory was not found at {ChatDir}.", chatDir);
                return;
            }

            try
            {
                logger.LogInformation("Kiroku.Chat is not healthy. Attempting auto-start from {ChatDir}...", chatDir);
                var startInfo = new ProcessStartInfo
                {
                    FileName = pythonExe,
                    Arguments = "-m uvicorn app:app --host 127.0.0.1 --port 8000",
                    WorkingDirectory = chatDir,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                var process = Process.Start(startInfo);
                logger.LogInformation("Started Kiroku.Chat using {PythonExe}. ProcessId: {ProcessId}", pythonExe, process?.Id);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to start Kiroku.Chat automatically.");
                return;
            }

            var startupWaitSeconds = chatSection.GetValue("StartupWaitSeconds", 30);
            for (var attempt = 0; attempt < startupWaitSeconds; attempt++)
            {
                logger.LogInformation("Waiting for Kiroku.Chat health check... attempt {Attempt}/{Total}", attempt + 1, startupWaitSeconds);
                await Task.Delay(1000);
                if (await IsChatHealthyAsync(healthUrl))
                {
                    logger.LogInformation("Kiroku.Chat is healthy at {HealthUrl}.", healthUrl);
                    return;
                }
            }

            logger.LogWarning("Kiroku.Chat was launched but did not become healthy at {HealthUrl}.", healthUrl);
        }

        private static async Task<bool> IsChatHealthyAsync(string healthUrl)
        {
            try
            {
                var uri = new Uri(healthUrl);
                using var tcpClient = new TcpClient();
                var connectTask = tcpClient.ConnectAsync(uri.Host, uri.Port);
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
    }
}
