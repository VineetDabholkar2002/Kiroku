using Kiroku.Data.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Kiroku.Infrastructure.Services;
using Kiroku.Application.Services;
using Kiroku.Infrastructure.Data.Repositories;
using Kiroku.Data.Seeders;
using Kiroku.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System.Diagnostics;
using System.Net.Sockets;

// Build the web application
var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

// Register essential services
builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<SpotifyService>();
builder.Services.AddSingleton<SpotifyAuthService>();
builder.Services.AddSingleton<SpotifyService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<UserService>();

// Register Redis distributed cache
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = configuration.GetConnectionString("Redis");
    options.InstanceName = "Kiroku:";
});


// Register reusable CacheService abstraction
builder.Services.AddScoped<ICacheService, RedisCacheService>();

// Register DbContext with PostgreSQL
builder.Services.AddDbContextFactory<AppDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});

// Add CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Enable Swagger/OpenAPI
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
}

// ]Seed database data here if needed
using (var scope = app.Services.CreateScope())
{
    //var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    //await UserAndListSeeder.SeedAsync(context);
    //await CharacterSeeder.SeedCharactersAsync(context);

    //var animeJsonPath = Path.Combine("C:\\Main\\Main Projects\\Kiroku\\backend\\Kiroku.Data", "Seeders", "all_anime_full.json");
    //var checkPtJsonPath = Path.Combine("C:\\Main\\Main Projects\\Kiroku\\backend\\Kiroku.Data", "Seeders", "checkpoint.json");

    //var animeSeeder = new AnimeFullSeeder(context, animeJsonPath, checkPtJsonPath);
    //await animeSeeder.SeedAsync();
}

// Enable Swagger UI in development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Kiroku API v1");
        options.RoutePrefix = string.Empty;
    });
}

// Enable CORS
app.UseCors("AllowAll");

// Enable HTTPS and controller mapping
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
