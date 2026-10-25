using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Kiroku.Data.Contexts;
using Kiroku.Data.Seeders;
using Microsoft.EntityFrameworkCore;

namespace Kiroku.SeederRunner
{
    internal class Program
    {
        static async Task Main(string[] args)
        {
            var seedArg = args.FirstOrDefault() ?? "--seed";

            var rootDir = PathResolver.FindWorkspaceRoot();
            var connectionString = PathResolver.ResolveConnectionString();

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            await using var db = new AppDbContext(optionsBuilder.Options);

            if (seedArg.Equals("--status", StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine("=================================================");
                Console.WriteLine("          KIROKU DATABASE CURRENT COUNTS         ");
                Console.WriteLine("=================================================");
                Console.WriteLine($"Anime:           {await db.Animes.CountAsync():N0}");
                Console.WriteLine($"ThemeEntries:    {await db.ThemeEntries.CountAsync():N0}");
                Console.WriteLine($"Characters:      {await db.Characters.CountAsync():N0}");
                Console.WriteLine($"People/VAs:      {await db.People.CountAsync():N0}");
                Console.WriteLine($"Users:           {await db.Users.CountAsync():N0}");
                Console.WriteLine($"UserAnimeLists:  {await db.UserAnimeLists.CountAsync():N0}");
                Console.WriteLine("=================================================");
                return;
            }

            if (seedArg.Equals("--wipe:characters", StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine("=================================================");
                Console.WriteLine("          WIPING CHARACTER & SEIYUU DATA         ");
                Console.WriteLine("=================================================");
                
                try
                {
                    await db.Database.ExecuteSqlRawAsync(@"
                        TRUNCATE TABLE 
                            animecharacters, 
                            charactervoices, 
                            characterimages, 
                            characters, 
                            personimages, 
                            people 
                        RESTART IDENTITY CASCADE;
                    ");
                }
                catch
                {
                    // Fallback for quoted PascalCase table names if needed
                    await db.Database.ExecuteSqlRawAsync(@"
                        TRUNCATE TABLE 
                            ""AnimeCharacters"", 
                            ""CharacterVoices"", 
                            ""CharacterImages"", 
                            ""Characters"", 
                            ""PersonImages"", 
                            ""People"" 
                        RESTART IDENTITY CASCADE;
                    ");
                }

                Console.WriteLine("✓ Characters, character voices, and voice actors successfully wiped from database.");
                Console.WriteLine($"Remaining Characters: {await db.Characters.CountAsync():N0}");
                Console.WriteLine($"Remaining People:     {await db.People.CountAsync():N0}");
                Console.WriteLine("=================================================");
                return;
            }

            if (seedArg.Equals("--verify-indexes", StringComparison.OrdinalIgnoreCase) || seedArg.Equals("--benchmark", StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine("=================================================");
                Console.WriteLine("       VERIFYING POSTGRESQL DATABASE INDEXES     ");
                Console.WriteLine("=================================================");
                
                var connection = db.Database.GetDbConnection();
                await connection.OpenAsync();
                await using var cmd = connection.CreateCommand();
                cmd.CommandText = @"
                    SELECT tablename, indexname, indexdef 
                    FROM pg_indexes 
                    WHERE schemaname = 'public' 
                    AND tablename IN ('animes', 'useranimelists', 'users', 'themeentries', 'animecharacters', 'genres', 'characters', 'people')
                    ORDER BY tablename, indexname;";

                await using (var reader = await cmd.ExecuteReaderAsync())
                {
                    string currentTable = "";
                    while (await reader.ReadAsync())
                    {
                        var table = reader.GetString(0);
                        var index = reader.GetString(1);
                        var def = reader.GetString(2);

                        if (table != currentTable)
                        {
                            Console.WriteLine($"\n[TABLE: {table.ToUpper()}]");
                            currentTable = table;
                        }
                        Console.WriteLine($"  ✓ {index,-40} | {def}");
                    }
                }
                return;
            }

            Console.WriteLine("=================================================");
            Console.WriteLine("          KIROKU DATABASE RESUME SEEDER          ");
            Console.WriteLine("=================================================");
            Console.WriteLine($"Started at: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            Console.WriteLine($"Project Root: {rootDir}");

            var animeJsonPath = PathResolver.ResolveDataPath("all_anime_full.json");
            var checkpointPath = PathResolver.ResolveDataPath("checkpoint.json");
            var characterJsonPath = PathResolver.ResolveDataPath("anime_characters.json");
            var userDataDir = PathResolver.ResolveDataPath("data");

            Console.WriteLine($"Active seed mode: {seedArg}\n");

            try
            {
                // 1. Verify/Resume Anime (Primary parent entity for lookups)
                if (seedArg.Equals("--seed:anime", StringComparison.OrdinalIgnoreCase) || seedArg.Equals("--seed", StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine("[1/3] --- VERIFYING / SEEDING ANIME METADATA ---");
                    if (File.Exists(animeJsonPath))
                    {
                        var animeSeeder = new AnimeFullSeeder(db, animeJsonPath, checkpointPath);
                        await animeSeeder.SeedAsync();
                        var animeCount = await db.Animes.CountAsync();
                        Console.WriteLine($"✓ Anime verified: {animeCount:N0} total anime in database.");
                    }
                }

                // 2. Seed Characters (links AnimeId to CharacterId)
                if (seedArg.Equals("--seed:characters", StringComparison.OrdinalIgnoreCase) || seedArg.Equals("--seed", StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine("\n[2/3] --- SEEDING CHARACTERS & VOICE ACTORS ---");
                    if (File.Exists(characterJsonPath))
                    {
                        await CharacterSeeder.SeedCharactersAsync(db, characterJsonPath);
                        var charCount = await db.Characters.CountAsync();
                        var personCount = await db.People.CountAsync();
                        Console.WriteLine($"✓ Characters verified: {charCount:N0} characters, {personCount:N0} people in database.");
                    }
                    else
                    {
                        Console.WriteLine($"[WARNING] Character JSON file not found at: {characterJsonPath}");
                    }
                }

                // 3. Seed Users & Lists (links UserId to AnimeId)
                if (seedArg.Equals("--seed:users", StringComparison.OrdinalIgnoreCase) || seedArg.Equals("--seed", StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine("\n[3/3] --- SEEDING USERS & USER ANIME LISTS ---");
                    if (Directory.Exists(userDataDir))
                    {
                        await UserAndListSeeder.SeedAsync(db, userDataDir);
                        var userCount = await db.Users.CountAsync();
                        var listCount = await db.UserAnimeLists.CountAsync();
                        Console.WriteLine($"✓ Users seeded: {userCount:N0} users, {listCount:N0} anime list entries in database.");
                    }
                }

                Console.WriteLine("\n=================================================");
                Console.WriteLine($"✓ ALL REQUESTED SEEDING COMPLETED AT {DateTime.Now:HH:mm:ss}!");
                Console.WriteLine("=================================================");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n[ERROR] Seeding encountered an error: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[INNER ERROR]: {ex.InnerException.Message}");
                }
            }
        }
    }
}
