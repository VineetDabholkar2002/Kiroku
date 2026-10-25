using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Kiroku.Data.Contexts;
using Kiroku.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Kiroku.Data.Seeders
{
    public class CharacterSeeder
    {
        public static async Task SeedCharactersAsync(AppDbContext context, string? filePath = null)
        {
            filePath ??= PathResolver.ResolveDataPath("anime_characters.json");
            if (!File.Exists(filePath))
            {
                Console.WriteLine($"[CharacterSeeder] File not found: {filePath}");
                return;
            }

            // Ensure 'about' column exists in database
            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE characters ADD COLUMN IF NOT EXISTS about text DEFAULT '';");
            }
            catch { }
            try
            {
                await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"Characters\" ADD COLUMN IF NOT EXISTS \"About\" text DEFAULT '';");
            }
            catch { }

            Console.WriteLine($"[CharacterSeeder] Loading character JSON from {filePath}...");
            var jsonStr = await File.ReadAllTextAsync(filePath);
            var parsed = JsonSerializer.Deserialize<Dictionary<string, List<AnimeCharacterBlock>>>(
                jsonStr, 
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            ) ?? new();

            Console.WriteLine($"[CharacterSeeder] Found {parsed.Count:N0} anime entries in JSON. Preloading database lookups...");

            // Fast integer dictionary lookups: MalId -> DB Id
            var animeIdByMalId = await context.Animes
                .AsNoTracking()
                .Select(a => new { a.Id, a.MalId })
                .ToDictionaryAsync(a => a.MalId, a => a.Id);

            var charIdByMalId = await context.Characters
                .AsNoTracking()
                .Select(c => new { c.Id, c.MalId })
                .ToDictionaryAsync(c => c.MalId, c => c.Id);

            var personIdByMalId = await context.People
                .AsNoTracking()
                .Select(p => new { p.Id, p.MalId })
                .ToDictionaryAsync(p => p.MalId, p => p.Id);

            var animeCharSet = new HashSet<(int, int)>(
                await context.AnimeCharacters
                    .AsNoTracking()
                    .Select(x => new ValueTuple<int, int>(x.AnimeId, x.CharacterId))
                    .ToListAsync()
            );

            var charVoiceSet = new HashSet<(int, int, string)>(
                await context.CharacterVoices
                    .AsNoTracking()
                    .Select(x => new ValueTuple<int, int, string>(x.CharacterId, x.PersonId, x.Language))
                    .ToListAsync()
            );

            Console.WriteLine($"[CharacterSeeder] Existing in DB: {charIdByMalId.Count:N0} characters, {personIdByMalId.Count:N0} people, {animeCharSet.Count:N0} anime-character links.");
            Console.WriteLine($"[CharacterSeeder] Beginning ingestion...");

            int processedAnime = 0;
            int newCharactersCount = 0;
            int newPeopleCount = 0;
            int newLinksCount = 0;

            var pendingAnimeChars = new List<AnimeCharacter>();
            var pendingVoices = new List<CharacterVoice>();

            foreach (var kvp in parsed)
            {
                if (!int.TryParse(kvp.Key, out int animeMalId)) continue;
                if (!animeIdByMalId.TryGetValue(animeMalId, out int animeDbId)) continue;
                if (kvp.Value == null || kvp.Value.Count == 0) continue;

                // 1. Collect all characters in this anime that aren't in DB yet
                var animeNewChars = new List<Character>();
                foreach (var entry in kvp.Value)
                {
                    if (entry?.Character == null || entry.Character.MalId <= 0) continue;
                    int charMalId = entry.Character.MalId;

                    if (!charIdByMalId.ContainsKey(charMalId))
                    {
                        var ch = new Character
                        {
                            MalId = charMalId,
                            Name = entry.Character.Name ?? "",
                            Url = entry.Character.Url ?? "",
                            About = entry.Character.About ?? entry.Character.Biography ?? "",
                            Favorites = entry.Favorites,
                            Images = new List<CharacterImage>()
                        };

                        if (!string.IsNullOrWhiteSpace(entry.Character.Images?.Jpg?.ImageUrl))
                            ch.Images.Add(new CharacterImage { Format = "jpg", ImageUrl = entry.Character.Images.Jpg.ImageUrl });
                        if (!string.IsNullOrWhiteSpace(entry.Character.Images?.Webp?.ImageUrl))
                            ch.Images.Add(new CharacterImage { Format = "webp", ImageUrl = entry.Character.Images.Webp.ImageUrl });

                        charIdByMalId[charMalId] = 0; // temporary placeholder to avoid dups in same batch
                        animeNewChars.Add(ch);
                    }
                }

                if (animeNewChars.Count > 0)
                {
                    try
                    {
                        context.Characters.AddRange(animeNewChars);
                        await context.SaveChangesAsync();
                        foreach (var ch in animeNewChars)
                        {
                            charIdByMalId[ch.MalId] = ch.Id;
                        }
                        newCharactersCount += animeNewChars.Count;
                    }
                    catch (DbUpdateException)
                    {
                        foreach (var ch in animeNewChars)
                        {
                            context.Entry(ch).State = EntityState.Detached;
                            foreach (var img in ch.Images)
                                context.Entry(img).State = EntityState.Detached;
                        }

                        var missingMalIds = animeNewChars.Select(c => c.MalId).ToList();
                        var existing = await context.Characters
                            .AsNoTracking()
                            .Where(c => missingMalIds.Contains(c.MalId))
                            .Select(c => new { c.Id, c.MalId })
                            .ToListAsync();

                        foreach (var ec in existing)
                            charIdByMalId[ec.MalId] = ec.Id;

                        foreach (var ch in animeNewChars.Where(c => !charIdByMalId.ContainsKey(c.MalId) || charIdByMalId[c.MalId] <= 0))
                        {
                            try
                            {
                                context.Characters.Add(ch);
                                await context.SaveChangesAsync();
                                charIdByMalId[ch.MalId] = ch.Id;
                                newCharactersCount++;
                            }
                            catch
                            {
                                context.Entry(ch).State = EntityState.Detached;
                                foreach (var img in ch.Images)
                                    context.Entry(img).State = EntityState.Detached;
                            }
                        }
                    }
                }

                // 2. Collect all voice actors in this anime that aren't in DB yet
                var animeNewPeople = new List<Person>();
                foreach (var entry in kvp.Value)
                {
                    if (entry?.VoiceActors == null) continue;
                    foreach (var va in entry.VoiceActors)
                    {
                        if (va?.Person == null || va.Person.MalId <= 0) continue;
                        int personMalId = va.Person.MalId;

                        if (!personIdByMalId.ContainsKey(personMalId))
                        {
                            var p = new Person
                            {
                                MalId = personMalId,
                                Name = va.Person.Name ?? "",
                                Url = va.Person.Url ?? "",
                                Images = new List<PersonImage>()
                            };
                            if (!string.IsNullOrWhiteSpace(va.Person.Images?.Jpg?.ImageUrl))
                                p.Images.Add(new PersonImage { Format = "jpg", ImageUrl = va.Person.Images.Jpg.ImageUrl });

                            personIdByMalId[personMalId] = 0; // placeholder
                            animeNewPeople.Add(p);
                        }
                    }
                }

                if (animeNewPeople.Count > 0)
                {
                    try
                    {
                        context.People.AddRange(animeNewPeople);
                        await context.SaveChangesAsync();
                        foreach (var p in animeNewPeople)
                        {
                            personIdByMalId[p.MalId] = p.Id;
                        }
                        newPeopleCount += animeNewPeople.Count;
                    }
                    catch (DbUpdateException)
                    {
                        foreach (var p in animeNewPeople)
                        {
                            context.Entry(p).State = EntityState.Detached;
                            foreach (var img in p.Images)
                                context.Entry(img).State = EntityState.Detached;
                        }

                        var missingMalIds = animeNewPeople.Select(p => p.MalId).ToList();
                        var existing = await context.People
                            .AsNoTracking()
                            .Where(p => missingMalIds.Contains(p.MalId))
                            .Select(p => new { p.Id, p.MalId })
                            .ToListAsync();

                        foreach (var ep in existing)
                            personIdByMalId[ep.MalId] = ep.Id;

                        foreach (var p in animeNewPeople.Where(p => !personIdByMalId.ContainsKey(p.MalId) || personIdByMalId[p.MalId] <= 0))
                        {
                            try
                            {
                                context.People.Add(p);
                                await context.SaveChangesAsync();
                                personIdByMalId[p.MalId] = p.Id;
                                newPeopleCount++;
                            }
                            catch
                            {
                                context.Entry(p).State = EntityState.Detached;
                                foreach (var img in p.Images)
                                    context.Entry(img).State = EntityState.Detached;
                            }
                        }
                    }
                }

                // 3. Link AnimeCharacter and CharacterVoice joins
                foreach (var entry in kvp.Value)
                {
                    if (entry?.Character == null || entry.Character.MalId <= 0) continue;
                    if (!charIdByMalId.TryGetValue(entry.Character.MalId, out int charDbId) || charDbId <= 0) continue;

                    if (animeCharSet.Add((animeDbId, charDbId)))
                    {
                        pendingAnimeChars.Add(new AnimeCharacter
                        {
                            AnimeId = animeDbId,
                            CharacterId = charDbId,
                            Role = string.IsNullOrWhiteSpace(entry.Role) ? "Supporting" : entry.Role,
                            Favorites = entry.Favorites
                        });
                        newLinksCount++;
                    }

                    if (entry.VoiceActors != null)
                    {
                        foreach (var va in entry.VoiceActors)
                        {
                            if (va?.Person == null || va.Person.MalId <= 0) continue;
                            if (!personIdByMalId.TryGetValue(va.Person.MalId, out int personDbId) || personDbId <= 0) continue;

                            string lang = string.IsNullOrWhiteSpace(va.Language) ? "Japanese" : va.Language;
                            if (charVoiceSet.Add((charDbId, personDbId, lang)))
                            {
                                pendingVoices.Add(new CharacterVoice
                                {
                                    CharacterId = charDbId,
                                    PersonId = personDbId,
                                    Language = lang
                                });
                            }
                        }
                    }
                }

                processedAnime++;

                // Batch save joins every 50 anime or 1,000 links
                if (processedAnime % 50 == 0 || pendingAnimeChars.Count >= 1000)
                {
                    if (pendingAnimeChars.Count > 0)
                    {
                        context.AnimeCharacters.AddRange(pendingAnimeChars);
                        pendingAnimeChars.Clear();
                    }
                    if (pendingVoices.Count > 0)
                    {
                        context.CharacterVoices.AddRange(pendingVoices);
                        pendingVoices.Clear();
                    }
                    try
                    {
                        await context.SaveChangesAsync();
                    }
                    catch (DbUpdateException)
                    {
                        // Clean change tracker on conflict to maintain resilience
                        context.ChangeTracker.Clear();
                    }
                    Console.WriteLine($"[{processedAnime:N0} / {parsed.Count:N0} anime] +{newCharactersCount:N0} characters, +{newPeopleCount:N0} people, +{newLinksCount:N0} links");
                }
            }

            // Flush remaining joins
            if (pendingAnimeChars.Count > 0)
            {
                context.AnimeCharacters.AddRange(pendingAnimeChars);
                pendingAnimeChars.Clear();
            }
            if (pendingVoices.Count > 0)
            {
                context.CharacterVoices.AddRange(pendingVoices);
                pendingVoices.Clear();
            }
            await context.SaveChangesAsync();

            Console.WriteLine($"[CharacterSeeder] Complete! Added {newCharactersCount:N0} new characters, {newPeopleCount:N0} new people, {newLinksCount:N0} new joins.");
        }

        // DTOs for deserialization
        public class AnimeCharacterBlock
        {
            [JsonPropertyName("character")]
            public CharacterInfo? Character { get; set; }
            [JsonPropertyName("role")]
            public string? Role { get; set; }
            [JsonPropertyName("favorites")]
            public int Favorites { get; set; }
            [JsonPropertyName("voice_actors")]
            public List<VoiceActorBlock>? VoiceActors { get; set; }
        }

        public class CharacterInfo
        {
            [JsonPropertyName("mal_id")]
            public int MalId { get; set; }
            [JsonPropertyName("url")]
            public string? Url { get; set; }
            [JsonPropertyName("name")]
            public string? Name { get; set; }
            [JsonPropertyName("about")]
            public string? About { get; set; }
            [JsonPropertyName("biography")]
            public string? Biography { get; set; }
            [JsonPropertyName("images")]
            public CharacterImages? Images { get; set; }
        }

        public class CharacterImages
        {
            [JsonPropertyName("jpg")]
            public ImageUrlObj? Jpg { get; set; }
            [JsonPropertyName("webp")]
            public ImageUrlObj? Webp { get; set; }
        }

        public class ImageUrlObj
        {
            [JsonPropertyName("image_url")]
            public string? ImageUrl { get; set; }
            [JsonPropertyName("small_image_url")]
            public string? SmallImageUrl { get; set; }
        }

        public class VoiceActorBlock
        {
            [JsonPropertyName("person")]
            public PersonInfo? Person { get; set; }
            [JsonPropertyName("language")]
            public string? Language { get; set; }
        }

        public class PersonInfo
        {
            [JsonPropertyName("mal_id")]
            public int MalId { get; set; }
            [JsonPropertyName("url")]
            public string? Url { get; set; }
            [JsonPropertyName("name")]
            public string? Name { get; set; }
            [JsonPropertyName("images")]
            public PersonImages? Images { get; set; }
        }

        public class PersonImages
        {
            [JsonPropertyName("jpg")]
            public ImageUrlObj? Jpg { get; set; }
        }
    }
}
