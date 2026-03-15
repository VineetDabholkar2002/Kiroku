using Kiroku.Data.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Kiroku.Infrastructure.Services;
using Kiroku.Application.Services;
using Kiroku.Data.Seeders;
using Kiroku.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Internal;

// Build the web application
var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

// Register essential services
builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<SpotifyService>();
builder.Services.AddSingleton<SpotifyAuthService>();
builder.Services.AddSingleton<SpotifyService>();

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

// ]Seed database data here if needed
using (var scope = app.Services.CreateScope())
{
    //var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    //await UserAndListSeeder.SeedAsync(context);
    ////await CharacterSeeder.SeedCharactersAsync(context);

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
