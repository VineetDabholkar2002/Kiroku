using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Kiroku.Data.Contexts;
using Kiroku.Domain.Entities;
using Microsoft.EntityFrameworkCore;

public static class UserAndListSeeder
{
    private const int BatchSize = 100;

    public static async Task SeedAsync(AppDbContext ctx)
    {
        var dataDir = @"C:\Main\Main Projects\Kiroku\data\data";
        var usersFile = Path.Combine(dataDir, "users.csv");
        var usersDir = Path.Combine(dataDir, "users");

        // Step 1: Load existing MAL IDs from DB to skip already-seeded users
        var existingMalIds = await ctx.Users.Select(u => u.MalUserId).ToHashSetAsync();

        // Step 2: Seed users (skip already existing)
        if (File.Exists(usersFile))
        {
            Console.WriteLine("Seeding users from users.csv...");
            var userLines = File.ReadLines(usersFile)
                                .Skip(1)
                                .Where(line => !string.IsNullOrWhiteSpace(line));

            var newUsers = new List<User>();

            foreach (var line in userLines)
            {
                var parts = line.Split(',');
                if (parts.Length < 2)
                {
                    Console.WriteLine($"Skipping malformed user line: {line}");
                    continue;
                }

                if (!int.TryParse(parts[0], out int userMalId))
                {
                    Console.WriteLine($"Invalid MAL ID in line: {line}");
                    continue;
                }

                var username = parts[1].Trim();
                if (string.IsNullOrEmpty(username))
                {
                    Console.WriteLine($"Empty username in line: {line}");
                    continue;
                }

                // Skip if already in DB or already queued
                if (existingMalIds.Contains(userMalId))
                    continue;

                existingMalIds.Add(userMalId);

                newUsers.Add(new User
                {
                    MalUserId = userMalId,
                    Username = username,
                    Password = "Pass@1234",
                    Email = $"{username}@kiroku.com"
                });

                if (newUsers.Count >= BatchSize)
                {
                    ctx.Users.AddRange(newUsers);
                    await ctx.SaveChangesAsync();
                    newUsers.Clear();
                }
            }

            if (newUsers.Count > 0)
            {
                ctx.Users.AddRange(newUsers);
                await ctx.SaveChangesAsync();
            }
        }
        else
        {
            Console.WriteLine($"Users file not found at {usersFile} - skipping user seeding.");
            return;
        }

        // Step 3: Build lookup maps
        Console.WriteLine("Loading User and Anime lookups for bulk seeding UserAnimeLists...");
        var userMap = await ctx.Users.AsNoTracking().ToDictionaryAsync(u => u.MalUserId, u => u);
        var animeMap = await ctx.Animes.AsNoTracking().ToDictionaryAsync(a => a.MalId, a => a);

        // Step 4: Preload existing UserAnimeLists into a HashSet to avoid per-row DB queries
        var existingListSet = await ctx.UserAnimeLists
            .Select(x => x.UserId + "_" + x.AnimeId)
            .ToHashSetAsync();

        // Step 5: Seed UserAnimeLists
        var userAnimeLists = new List<UserAnimeList>();

        var userCsvFiles = Directory.EnumerateFiles(usersDir, "*.csv")
                                    .Where(f => !f.EndsWith("users.csv", StringComparison.OrdinalIgnoreCase));

        Console.WriteLine($"Processing {userCsvFiles.Count()} user list files...");

        foreach (var userFilePath in userCsvFiles)
        {
            var fileName = Path.GetFileNameWithoutExtension(userFilePath);
            if (!int.TryParse(fileName, out int userMalId))
            {
                Console.WriteLine($"Skipped user list file '{fileName}': invalid MAL ID.");
                continue;
            }

            if (!userMap.TryGetValue(userMalId, out var userEntity))
            {
                Console.WriteLine($"User with MAL ID {userMalId} not found in DB, skipping their anime list.");
                continue;
            }

            var listLines = File.ReadLines(userFilePath)
                .Skip(1)
                .Where(line => !string.IsNullOrWhiteSpace(line));

            foreach (var line in listLines)
            {
                var parts = line.Split(new[] { '\t', ',' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 3)
                {
                    Console.WriteLine($"Skipping malformed list line for user {userMalId}: {line}");
                    continue;
                }

                if (!int.TryParse(parts[0], out int animeMalId))
                {
                    Console.WriteLine($"Invalid anime MAL ID in line for user {userMalId}: {line}");
                    continue;
                }

                if (!int.TryParse(parts[1], out int score))
                {
                    Console.WriteLine($"Invalid score in line for user {userMalId}: {line}");
                    continue;
                }

                string rawStatus = parts[2].Trim().ToLowerInvariant();
                string status = rawStatus switch
                {
                    "completed" => "Completed",
                    "dropped" => "Dropped",
                    "plan_to_watch" => "Plan to Watch",
                    "on_hold" => "On Hold",
                    _ => CultureInfo.CurrentCulture.TextInfo.ToTitleCase(rawStatus)
                };

                if (!animeMap.TryGetValue(animeMalId, out var animeEntity))
                {
                    Console.WriteLine($"Anime with MAL ID {animeMalId} not found in DB, skipping user {userMalId} entry.");
                    continue;
                }

                // Skip if already seeded (uses in-memory HashSet, not DB query)
                string key = userEntity.Id + "_" + animeEntity.Id;
                if (existingListSet.Contains(key)) 
                    continue;
                existingListSet.Add(key);

                userAnimeLists.Add(new UserAnimeList
                {
                    UserId = userEntity.Id,
                    AnimeId = animeEntity.Id,
                    Score = score,
                    Status = status
                });
                Console.WriteLine($"Added {userEntity.Username}");
                if (userAnimeLists.Count >= BatchSize)
                {
                    ctx.UserAnimeLists.AddRange(userAnimeLists);
                    await ctx.SaveChangesAsync();
                    userAnimeLists.Clear();
                }
            }
        }

        if (userAnimeLists.Count > 0)
        {
            ctx.UserAnimeLists.AddRange(userAnimeLists);
            await ctx.SaveChangesAsync();
            userAnimeLists.Clear();
        }

        Console.WriteLine("User and user anime lists seeding complete.");
    }
}