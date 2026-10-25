using System;
using System.IO;
using System.Threading.Tasks;
using Kiroku.Data.Contexts;
using Microsoft.Extensions.Logging;

namespace Kiroku.Data.Seeders
{
    public class DatabaseSeeder
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DatabaseSeeder> _logger;

        public DatabaseSeeder(AppDbContext context, ILogger<DatabaseSeeder> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task SeedAllAsync()
        {
            _logger.LogInformation("[Seeder] Starting full database seed...");
            // Step 1: Seed Primary Anime Entities & Metadata (required for FK lookups)
            await SeedAnimeAsync();
            // Step 2: Seed Characters & VAs (links to Anime)
            await SeedCharactersAsync();
            // Step 3: Seed Users & Watch Lists (links Users to Anime)
            await SeedUsersAndListsAsync();
            _logger.LogInformation("[Seeder] Full database seed finished successfully.");
        }

        public async Task SeedUsersAndListsAsync(string? customDataDir = null)
        {
            _logger.LogInformation("[Seeder] Seeding users and anime lists...");
            var dir = customDataDir ?? PathResolver.ResolveDataPath("data");
            await UserAndListSeeder.SeedAsync(_context, dir);
            _logger.LogInformation("[Seeder] User and list seeding completed.");
        }

        public async Task SeedCharactersAsync(string? jsonPath = null)
        {
            _logger.LogInformation("[Seeder] Seeding anime characters...");
            var path = jsonPath ?? PathResolver.ResolveDataPath("anime_characters.json");
            await CharacterSeeder.SeedCharactersAsync(_context, path);
            _logger.LogInformation("[Seeder] Character seeding completed.");
        }

        public async Task SeedAnimeAsync(string? jsonPath = null, string? checkpointPath = null)
        {
            _logger.LogInformation("[Seeder] Seeding full anime data...");
            var animePath = jsonPath ?? PathResolver.ResolveDataPath("all_anime_full.json");
            var checkPtPath = checkpointPath ?? PathResolver.ResolveDataPath("checkpoint.json");

            var seeder = new AnimeFullSeeder(_context, animePath, checkPtPath);
            await seeder.SeedAsync();
            _logger.LogInformation("[Seeder] Anime seeding completed.");
        }

        private static string ResolveDataPath(string fileName, string? fallback = null)
        {
            var resolved = PathResolver.ResolveDataPath(fileName);
            if (File.Exists(resolved) || Directory.Exists(resolved))
                return resolved;
            return fallback ?? resolved;
        }
    }
}
