using Kiroku.API.Extensions;
using Kiroku.API.Middlewares;
using Kiroku.API.Services;
using Kiroku.Application.Interfaces;
using Kiroku.Application.Options;
using Kiroku.Application.Services;
using Kiroku.Data.Contexts;
using Kiroku.Data.Seeders;
using Kiroku.Infrastructure.Data.Repositories;
using Kiroku.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

// Strongly-Typed Configuration (Options Pattern)
builder.Services.Configure<SpotifyOptions>(configuration.GetSection(SpotifyOptions.SectionName));
builder.Services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

// 1. Framework, HTTP Services & Rate Limiting
builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<SpotifyService>();
builder.Services.AddKirokuRateLimiting();

// 2. Application & Infrastructure Services (SOLID)
builder.Services.AddSingleton<ISpotifyService, SpotifyService>();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAnimeService, AnimeService>();
builder.Services.AddScoped<ICharacterService, CharacterService>();
builder.Services.AddScoped<IPersonService, PersonService>();
builder.Services.AddScoped<IMangaService, MangaService>();
builder.Services.AddScoped<IPlaylistService, PlaylistService>();
builder.Services.AddScoped<DatabaseSeeder>();

// 3. Distributed Caching (Redis)
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = configuration.GetConnectionString("Redis");
    options.InstanceName = "Kiroku:";
});
builder.Services.AddScoped<ICacheService, RedisCacheService>();

// 4. Persistence (PostgreSQL / EF Core)
builder.Services.AddDbContextFactory<AppDbContext>(options =>
{
    options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));
    options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
});
builder.Services.AddScoped(sp =>
    sp.GetRequiredService<IDbContextFactory<AppDbContext>>().CreateDbContext());

// 5. Cross-Origin Resource Sharing (CORS)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 6. JWT Authentication
var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtOptions.Secret)),
        ValidateIssuer = true,
        ValidIssuer = jwtOptions.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtOptions.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(5)
    };
});
builder.Services.AddAuthorization();

// 7. OpenAPI / Swagger Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Kiroku API",
        Version = "v1",
        Description = "Kiroku Anime & Music API"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();

// Optional CLI-driven database seeder:
// Usage: dotnet run -- --seed
//        dotnet run -- --seed:users
//        dotnet run -- --seed:characters
//        dotnet run -- --seed:anime
var seedArg = args.FirstOrDefault(a => a.StartsWith("--seed", StringComparison.OrdinalIgnoreCase));
if (seedArg != null)
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
    app.Logger.LogInformation("Database seeding triggered via argument: {Arg}", seedArg);

    if (seedArg.Equals("--seed:users", StringComparison.OrdinalIgnoreCase))
        await seeder.SeedUsersAndListsAsync();
    else if (seedArg.Equals("--seed:characters", StringComparison.OrdinalIgnoreCase))
        await seeder.SeedCharactersAsync();
    else if (seedArg.Equals("--seed:anime", StringComparison.OrdinalIgnoreCase))
        await seeder.SeedAnimeAsync();
    else
        await seeder.SeedAllAsync();

    app.Logger.LogInformation("Database seeding finished.");
    return;
}

// Database Migrations (Automatic EF Core schema updates on startup)
try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var retries = 5;
    while (retries > 0)
    {
        try
        {
            app.Logger.LogInformation("Checking database and applying EF Core migrations...");
            await dbContext.Database.MigrateAsync();
            app.Logger.LogInformation("Database migrations applied successfully.");
            break;
        }
        catch (Exception ex) when (retries > 1)
        {
            retries--;
            app.Logger.LogWarning("Database not ready ({Message}). Retrying in 3s... ({Retries} attempts left)", ex.Message, retries);
            await Task.Delay(3000);
        }
    }
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Failed to apply database migrations on startup.");
}

// Development Environment Setup
if (app.Environment.IsDevelopment())
{
    app.Logger.LogInformation("Kiroku.API starting in Development.");
    await RedisServiceLauncher.EnsureRunningAsync(configuration, app.Logger);
    await ChatServiceLauncher.EnsureRunningAsync(configuration, app.Environment.ContentRootPath, app.Logger);
    if (!string.Equals(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"), "true", StringComparison.OrdinalIgnoreCase))
    {
        app.UseHttpsRedirection();
    }
}

// Swagger UI
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Kiroku API v1");
    options.RoutePrefix = string.Empty;
});

// Middleware Pipeline
app.UseCors("AllowAll");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Cloud Port Binding (Render / Heroku / Container dynamic port allocation)
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    app.Urls.Add($"http://*:{port}");
}

app.Run();
