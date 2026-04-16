using Kiroku.Data.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Kiroku.Infrastructure.Services;
using Kiroku.Application.Services;
using Kiroku.Infrastructure.Data.Repositories;
using Kiroku.Data.Seeders;
using Kiroku.Domain.Entities;
using Kiroku.API.Services;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System.Diagnostics;
using System.Net.Sockets;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<SpotifyService>();
builder.Services.AddSingleton<SpotifyAuthService>();
builder.Services.AddSingleton<SpotifyService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<CacheWarmService>();

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = configuration.GetConnectionString("Redis");
    options.InstanceName = "Kiroku:";
});

builder.Services.AddScoped<ICacheService, RedisCacheService>();

builder.Services.AddDbContextFactory<AppDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Kiroku API",
        Version = "v1",
        Description = "Kiroku API"
    });
});

var app = builder.Build();
var logger = app.Logger;

if (app.Environment.IsDevelopment())
{
    logger.LogInformation("Kiroku.API starting in Development.");
    await EnsureChatServiceRunningAsync(configuration, app.Environment.ContentRootPath, logger);
    await WarmCachesAsync(app.Services, configuration, logger);
}

using (var scope = app.Services.CreateScope())
{
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Kiroku API v1");
        options.RoutePrefix = string.Empty;
    });
}

app.UseCors("AllowAll");

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();

static async Task EnsureChatServiceRunningAsync(IConfiguration configuration, string apiContentRoot, ILogger logger)
{
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

static async Task<bool> IsChatHealthyAsync(string healthUrl)
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

static async Task WarmCachesAsync(IServiceProvider services, IConfiguration configuration, ILogger logger)
{
    var warmOnStartup = configuration.GetValue("CacheWarmup:RunOnStartup", false);
    if (!warmOnStartup)
    {
        logger.LogInformation("Cache warmup on startup is disabled.");
        return;
    }

    using var scope = services.CreateScope();
    var warmer = scope.ServiceProvider.GetRequiredService<CacheWarmService>();
    var results = await warmer.WarmMostUsedAnimeEndpointsAsync();
    logger.LogInformation("Cache warmup completed for {Count} endpoint groups.", results.Count);
}
