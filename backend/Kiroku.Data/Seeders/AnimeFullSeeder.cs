using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Kiroku.Data.Contexts;
using Kiroku.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Kiroku.Data.Seeders
{
    public class AnimeFullSeeder
    {
        private readonly AppDbContext _db;
        private readonly string _jsonPath;
        private readonly string _checkpointPath;

        private const int BatchSize = 50; // You can adjust batch size based on your environment

        public AnimeFullSeeder(AppDbContext db, string jsonPath, string checkpointPath = "checkpoint.json")
        {
            _db = db;
            _jsonPath = jsonPath;
            _checkpointPath = checkpointPath;
        }

        public async Task SeedAsync()
        {
            var jsonStr = await File.ReadAllTextAsync(_jsonPath);
            var animeList = JArray.Parse(jsonStr);

            // Load checkpointed MAL IDs already processed
            var processedIds = File.Exists(_checkpointPath)
                ? JsonConvert.DeserializeObject<HashSet<int>>(File.ReadAllText(_checkpointPath)) ?? new HashSet<int>()
                : new HashSet<int>();
            var a = Directory.GetCurrentDirectory();
            int count = 0;

            // Disable AutoDetectChanges for performance in bulk inserts
            var originalDetectChanges = _db.ChangeTracker.AutoDetectChangesEnabled;
            _db.ChangeTracker.AutoDetectChangesEnabled = false;

            try
            {
                foreach (var animeJson in animeList)
                {
                    var malId = animeJson.Value<int>("mal_id");
                    // Skip if already checkpointed or exists in DB
                    if (processedIds.Contains(malId) || await _db.Animes.AnyAsync(a => a.MalId == malId))
                        continue;

                    Anime animeEntity = null;
                    try
                    {
                        animeEntity = new Anime
                        {
                            MalId = malId,
                            Url = animeJson.Value<string>("url"),
                            Approved = animeJson.Value<bool?>("approved") ?? false,
                            Title = animeJson.Value<string>("title"),
                            TitleEnglish = animeJson.Value<string>("title_english"),
                            TitleJapanese = animeJson.Value<string>("title_japanese"),
                            Type = animeJson.Value<string>("type"),
                            Source = animeJson.Value<string>("source"),
                            Episodes = animeJson.Value<int?>("episodes"),
                            Status = animeJson.Value<string>("status"),
                            Airing = animeJson.Value<bool?>("airing") ?? false,
                            Duration = animeJson.Value<string>("duration"),
                            Rating = animeJson.Value<string>("rating"),
                            Score = animeJson.Value<double?>("score"),
                            ScoredBy = animeJson.Value<int?>("scored_by"),
                            Rank = animeJson.Value<int?>("rank"),
                            Popularity = animeJson.Value<int?>("popularity"),
                            Members = animeJson.Value<int?>("members"),
                            Favorites = animeJson.Value<int?>("favorites"),
                            Synopsis = animeJson.Value<string>("synopsis"),
                            Background = animeJson.Value<string>("background"),
                            Season = animeJson.Value<string>("season"),
                            Year = animeJson.Value<int?>("year"),
                        };

                        // Titles
                        foreach (var t in animeJson["titles"] ?? new JArray())
                            animeEntity.Titles.Add(new AnimeTitle { Type = t.Value<string>("type"), Title = t.Value<string>("title") });

                        // Title synonyms
                        foreach (var s in animeJson["title_synonyms"] ?? new JArray())
                            animeEntity.TitleSynonyms.Add(new AnimeTitleSynonym { Synonym = s?.ToString() });

                        // Images
                        foreach (var fmt in new[] { "jpg", "webp" })
                        {
                            var imgObj = animeJson["images"]?[fmt];
                            if (imgObj != null)
                            {
                                animeEntity.Images.Add(new AnimeImage
                                {
                                    Format = fmt,
                                    ImageUrl = imgObj.Value<string>("image_url"),
                                    SmallImageUrl = imgObj.Value<string>("small_image_url"),
                                    LargeImageUrl = imgObj.Value<string>("large_image_url")
                                });
                            }
                        }

                        // Trailer and images
                        if (animeJson["trailer"] != null)
                        {
                            var t = animeJson["trailer"];
                            var trailerEntity = new Trailer
                            {
                                YoutubeId = t.Value<string>("youtube_id"),
                                Url = t.Value<string>("url"),
                                EmbedUrl = t.Value<string>("embed_url")
                            };
                            if (t["images"] != null)
                            {
                                trailerEntity.Images = new TrailerImages
                                {
                                    ImageUrl = t["images"].Value<string>("image_url"),
                                    SmallImageUrl = t["images"].Value<string>("small_image_url"),
                                    MediumImageUrl = t["images"].Value<string>("medium_image_url"),
                                    LargeImageUrl = t["images"].Value<string>("large_image_url"),
                                    MaximumImageUrl = t["images"].Value<string>("maximum_image_url")
                                };
                            }
                            animeEntity.Trailer = trailerEntity;
                        }

                        // Aired
                        if (animeJson["aired"] != null)
                        {
                            var aired = animeJson["aired"];

                            DateTime? from = TryParseDate(aired.Value<string>("from"));
                            DateTime? to = TryParseDate(aired.Value<string>("to"));

                            var airedObj = new Aired
                            {
                                From = from,
                                To = to,
                                String = aired.Value<string>("string")
                            };

                            if (aired["prop"] != null)
                            {
                                var prop = aired["prop"];
                                airedObj.Prop = new AiredProp
                                {
                                    From = prop["from"] != null ? new AiredPropDate
                                    {
                                        Day = prop["from"].Value<int?>("day"),
                                        Month = prop["from"].Value<int?>("month"),
                                        Year = prop["from"].Value<int?>("year")
                                    } : null,
                                    To = prop["to"] != null ? new AiredPropDate
                                    {
                                        Day = prop["to"].Value<int?>("day"),
                                        Month = prop["to"].Value<int?>("month"),
                                        Year = prop["to"].Value<int?>("year")
                                    } : null
                                };
                            }
                            animeEntity.Aired = airedObj;
                        }

                        // Broadcast
                        if (animeJson["broadcast"] != null)
                        {
                            var b = animeJson["broadcast"];
                            animeEntity.Broadcast = new Broadcast
                            {
                                Day = b.Value<string>("day"),
                                Time = b.Value<string>("time"),
                                Timezone = b.Value<string>("timezone"),
                                String = b.Value<string>("string")
                            };
                        }

                        // External links
                        foreach (var ext in animeJson["external"] ?? new JArray())
                            animeEntity.ExternalLinks.Add(new ExternalLink { Name = ext["name"]?.ToString(), Url = ext["url"]?.ToString() });

                        // Streaming links
                        foreach (var stream in animeJson["streaming"] ?? new JArray())
                            animeEntity.StreamingLinks.Add(new StreamingLink { Name = stream["name"]?.ToString(), Url = stream["url"]?.ToString() });

                        // Studios
                        foreach (var entry in animeJson["studios"] ?? new JArray())
                        {
                            int studioMalId = entry.Value<int>("mal_id");
                            string studioName = entry.Value<string>("name");
                            var studioEntity = _db.Studios.Local.FirstOrDefault(s => s.MalId == studioMalId)
                                ?? await _db.Studios.FirstOrDefaultAsync(s => s.MalId == studioMalId);
                            if (studioEntity == null)
                            {
                                studioEntity = new Studio { MalId = studioMalId, Name = studioName };
                                _db.Studios.Add(studioEntity);
                                await _db.SaveChangesAsync(); // Save to get PK before join insert
                            }
                            animeEntity.AnimeStudios.Add(new AnimeStudio { Anime = animeEntity, Studio = studioEntity });
                        }

                        // Producers
                        foreach (var entry in animeJson["producers"] ?? new JArray())
                        {
                            int producerMalId = entry.Value<int>("mal_id");
                            string producerName = entry.Value<string>("name");
                            var producerEntity = _db.Producers.Local.FirstOrDefault(p => p.MalId == producerMalId)
                                ?? await _db.Producers.FirstOrDefaultAsync(p => p.MalId == producerMalId);
                            if (producerEntity == null)
                            {
                                producerEntity = new Producer { MalId = producerMalId, Name = producerName };
                                _db.Producers.Add(producerEntity);
                                await _db.SaveChangesAsync();
                            }
                            animeEntity.AnimeProducers.Add(new AnimeProducer { Anime = animeEntity, Producer = producerEntity });
                        }

                        // Licensors
                        foreach (var entry in animeJson["licensors"] ?? new JArray())
                        {
                            int licensorMalId = entry.Value<int>("mal_id");
                            string licensorName = entry.Value<string>("name");
                            var licensorEntity = _db.Licensors.Local.FirstOrDefault(l => l.MalId == licensorMalId)
                                ?? await _db.Licensors.FirstOrDefaultAsync(l => l.MalId == licensorMalId);
                            if (licensorEntity == null)
                            {
                                licensorEntity = new Licensor { MalId = licensorMalId, Name = licensorName };
                                _db.Licensors.Add(licensorEntity);
                                await _db.SaveChangesAsync();
                            }
                            animeEntity.AnimeLicensors.Add(new AnimeLicensor { Anime = animeEntity, Licensor = licensorEntity });
                        }

                        // Genres and others
                        await SeedGenres(animeEntity, animeJson, "genres", "genre");
                        await SeedGenres(animeEntity, animeJson, "explicit_genres", "explicit_genre");
                        await SeedGenres(animeEntity, animeJson, "themes", "theme");
                        await SeedGenres(animeEntity, animeJson, "demographics", "demographic");

                        // Theme entries
                        if (animeJson["theme"] is JObject themeObj)
                        {
                            foreach (var type in new[] { "openings", "endings" })
                            {
                                var arr = themeObj[type] as JArray;
                                if (arr != null)
                                {
                                    int seq = 1;
                                    foreach (var entry in arr)
                                    {
                                        animeEntity.ThemeEntries.Add(new ThemeEntry
                                        {
                                            Category = type[..^1], // Remove "s"
                                            Sequence = seq++,
                                            RawText = entry.ToString()
                                        });
                                    }
                                }
                            }
                        }

                        // Relations
                        foreach (var rel in animeJson["relations"] ?? new JArray())
                        {
                            var relEntity = new Relation { RelationType = rel.Value<string>("relation") };
                            foreach (var entry in rel["entry"] ?? new JArray())
                            {
                                relEntity.Entries.Add(new RelationEntry
                                {
                                    MalId = entry.Value<int>("mal_id"),
                                    EntryType = entry.Value<string>("type"),
                                    Name = entry.Value<string>("name"),
                                    Url = entry.Value<string>("url")
                                });
                            }
                            animeEntity.Relations.Add(relEntity);
                        }

                        _db.Animes.Add(animeEntity);

                        processedIds.Add(malId);
                        count++;

                        // Save changes in batches
                        if (count % BatchSize == 0)
                        {
                            _db.ChangeTracker.DetectChanges();
                            await _db.SaveChangesAsync();
                            File.WriteAllText(_checkpointPath, JsonConvert.SerializeObject(processedIds, Formatting.Indented));
                            Console.WriteLine($"Checkpoint at MAL ID {malId} ({count} total processed)");
                        }
                    }
                    catch (Exception innerEx)
                    {
                        Console.WriteLine($"Error processing MAL ID {malId}, Title '{animeEntity?.Title}': {innerEx.Message}");
                        if (innerEx.InnerException != null)
                            Console.WriteLine($"Inner Exception: {innerEx.InnerException.Message}");
                        File.WriteAllText(_checkpointPath, JsonConvert.SerializeObject(processedIds, Formatting.Indented));
                        throw;
                    }
                }

                // Final save
                _db.ChangeTracker.AutoDetectChangesEnabled = originalDetectChanges;
                await _db.SaveChangesAsync();
                File.WriteAllText(_checkpointPath, JsonConvert.SerializeObject(processedIds, Formatting.Indented));
                Console.WriteLine("Seeding complete!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Seeding failed: {ex.Message}");
                if (ex.InnerException != null)
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                throw;
            }
        }

        private static DateTime? TryParseDate(string? dateStr)
        {
            if (string.IsNullOrWhiteSpace(dateStr)) return null;
            if (DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var date))
                return date;
            return null;
        }

        private async Task SeedGenres(Anime anime, JToken animeJson, string jsonField, string genreType)
        {
            foreach (var entry in animeJson[jsonField] ?? new JArray())
            {
                int genreMalId = entry.Value<int>("mal_id");
                string genreName = entry.Value<string>("name");

                var genre = _db.Genres.Local.FirstOrDefault(g => g.MalId == genreMalId && g.Type == genreType)
                    ?? await _db.Genres.FirstOrDefaultAsync(g => g.MalId == genreMalId && g.Type == genreType);
                if (genre == null)
                {
                    genre = new Genre { MalId = genreMalId, Name = genreName, Type = genreType };
                    _db.Genres.Add(genre);
                    await _db.SaveChangesAsync(); // Save to get PK
                }
                anime.AnimeGenres.Add(new AnimeGenre { Genre = genre, GenreId = genre.Id });
            }
        }
    }
}
