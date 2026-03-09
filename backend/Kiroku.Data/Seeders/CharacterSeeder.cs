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
using static Kiroku.Data.Seeders.CharacterSeeder;

namespace Kiroku.Data.Seeders
{
    public class CharacterSeeder
    {
        public static async Task SeedCharactersAsync(AppDbContext context, string filePath = @"C:\Users\vinee\Desktop\Work\Main Projects\Kiroku\data\anime_characters.json")
        {
            if (!File.Exists(filePath)) return;

            var jsonStr = await File.ReadAllTextAsync(filePath);
            var parsed = JsonSerializer.Deserialize<Dictionary<string, List<AnimeCharacterBlock>>>(jsonStr, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

            // Load existing IDs into HashSets for fast checking
            var animeByMalId = context.Animes.AsNoTracking().ToDictionary(a => a.MalId, a => a);
            var characterByMalId = context.Characters.Include(c => c.Images).ToDictionary(c => c.MalId, c => c);
            var personByMalId = context.People.Include(p => p.Images).ToDictionary(p => p.MalId, p => p);

            var animeCharSet = new HashSet<(int, int)>(
                context.AnimeCharacters.AsNoTracking().Select(x => new ValueTuple<int, int>(x.AnimeId, x.CharacterId))
            );

            var charVoiceSet = new HashSet<(int, int, string)>(
                context.CharacterVoices.AsNoTracking().Select(x => new ValueTuple<int, int, string>(x.CharacterId, x.PersonId, x.Language))
            );

            int processed = 0;
            context.ChangeTracker.AutoDetectChangesEnabled = false;
            foreach (var kvp in parsed)
            {
                int animeMalId = int.Parse(kvp.Key);
                if (!animeByMalId.TryGetValue(animeMalId, out var anime)) continue;

                foreach (var entry in kvp.Value)
                {
                    int charMalId = entry.Character.MalId;

                    // Upsert Character
                    if (!characterByMalId.TryGetValue(charMalId, out var character))
                    {
                        character = new Character
                        {
                            MalId = charMalId,
                            Name = entry.Character.Name,
                            Url = entry.Character.Url,
                            Images = new List<CharacterImage>()
                        };

                        if (entry.Character.Images?.Jpg?.ImageUrl is { } jpgImg && !string.IsNullOrWhiteSpace(jpgImg))
                            character.Images.Add(new CharacterImage { Format = "jpg", ImageUrl = jpgImg });
                        if (entry.Character.Images?.Webp?.ImageUrl is { } webpImg && !string.IsNullOrWhiteSpace(webpImg))
                            character.Images.Add(new CharacterImage { Format = "webp", ImageUrl = webpImg });

                        context.Characters.Add(character);
                        await context.SaveChangesAsync(); // ensures character.Id is available for join
                        characterByMalId[charMalId] = character;
                    }

                    // AnimeCharacter join
                    if (animeCharSet.Add((anime.Id, character.Id)))
                    {
                        context.AnimeCharacters.Add(new AnimeCharacter
                        {
                            AnimeId = anime.Id,
                            CharacterId = character.Id,
                            Role = entry.Role,
                            Favorites = entry.Favorites
                        });
                    }

                    // Voice actors
                    foreach (var va in entry.VoiceActors ?? new List<VoiceActorBlock>())
                    {
                        int personMalId = va.Person.MalId;
                        if (!personByMalId.TryGetValue(personMalId, out var person))
                        {
                            person = new Person
                            {
                                MalId = personMalId,
                                Name = va.Person.Name,
                                Url = va.Person.Url,
                                Images = new List<PersonImage>()
                            };
                            if (va.Person.Images?.Jpg?.ImageUrl is { } personImg && !string.IsNullOrWhiteSpace(personImg))
                                person.Images.Add(new PersonImage { Format = "jpg", ImageUrl = personImg });

                            context.People.Add(person);
                            await context.SaveChangesAsync();
                            personByMalId[personMalId] = person;
                        }
                        // CharacterVoice join
                        if (charVoiceSet.Add((character.Id, person.Id, va.Language)))
                        {
                            context.CharacterVoices.Add(new CharacterVoice
                            {
                                CharacterId = character.Id,
                                PersonId = person.Id,
                                Language = va.Language
                            });
                        }
                    }
                }

                processed++;
                // Save every 20 anime to avoid huge transactions (and update progress)
                if (processed % 20 == 0)
                {
                    await context.SaveChangesAsync();
                    Console.WriteLine($"{processed} / {parsed.Count} anime processed...");
                }
            }

            await context.SaveChangesAsync();
            context.ChangeTracker.AutoDetectChangesEnabled = true;
            Console.WriteLine("Character seeding complete!");
        }

        // DTOs for deserialization—adapt as needed for your real structure
        public class AnimeCharacterBlock
        {
            [JsonPropertyName("character")]
            public CharacterInfo Character { get; set; }
            [JsonPropertyName("role")]
            public string Role { get; set; }
            [JsonPropertyName("favorites")]
            public int Favorites { get; set; }
            [JsonPropertyName("voice_actors")]
            public List<VoiceActorBlock> VoiceActors { get; set; }
        }

        public class CharacterInfo
        {
            [JsonPropertyName("mal_id")]
            public int MalId { get; set; }
            [JsonPropertyName("url")]
            public string Url { get; set; }
            [JsonPropertyName("name")]
            public string Name { get; set; }
            [JsonPropertyName("images")]
            public CharacterImages Images { get; set; }
        }
        public class CharacterImages
        {
            [JsonPropertyName("jpg")]
            public ImageUrlObj Jpg { get; set; }
            [JsonPropertyName("webp")]
            public ImageUrlObj Webp { get; set; }
        }
        public class ImageUrlObj
        {
            [JsonPropertyName("image_url")]
            public string ImageUrl { get; set; }
            [JsonPropertyName("small_image_url")]
            public string SmallImageUrl { get; set; }
        }

        public class VoiceActorBlock
        {
            [JsonPropertyName("person")]
            public PersonInfo Person { get; set; }
            [JsonPropertyName("language")]
            public string Language { get; set; }
        }
        public class PersonInfo
        {
            [JsonPropertyName("mal_id")]
            public int MalId { get; set; }
            [JsonPropertyName("url")]
            public string Url { get; set; }
            [JsonPropertyName("name")]
            public string Name { get; set; }
            [JsonPropertyName("images")]
            public PersonImages Images { get; set; }
        }
        public class PersonImages
        {
            [JsonPropertyName("jpg")]
            public ImageUrlObj Jpg { get; set; }
        }
    }
}
