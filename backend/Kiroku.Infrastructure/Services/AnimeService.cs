using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Kiroku.Application.DTOs;
using Kiroku.Application.Interfaces;
using Kiroku.Application.Services;
using Kiroku.Data.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;

namespace Kiroku.Infrastructure.Services
{
    public class AnimeService : IAnimeService
    {
        private readonly AppDbContext _context;
        private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
        private readonly ICacheService _cacheService;
        private readonly HttpClient _httpClient;
        private readonly string _malClientId;
        private readonly string _malBaseUrl;

        private static readonly Regex SongArtistRegex = new Regex(@"""([^""]+)""\s+by\s+(.+)", RegexOptions.Compiled);

        public AnimeService(
            AppDbContext context,
            IDbContextFactory<AppDbContext> dbContextFactory,
            ICacheService cacheService,
            HttpClient httpClient,
            IConfiguration configuration)
        {
            _context = context;
            _dbContextFactory = dbContextFactory;
            _cacheService = cacheService;
            _httpClient = httpClient;
            _malClientId = configuration["MyAnimeList:ClientId"] ?? "07583d4579b7f663d5589edf375b5a7d";
            _malBaseUrl = configuration["MyAnimeList:BaseUrl"] ?? "https://api.myanimelist.net/v2";
        }

        public async Task<PagedResult<AnimeDto>?> GetPopularAnimeAsync(int page = 1, int perPage = 25) =>
            await GetPagedResponse(_context.Animes.Where(a => a.Approved && a.Popularity != null && a.Popularity > 0).OrderBy(a => a.Popularity), page, perPage, "Anime:Popular");

        public async Task<PagedResult<AnimeDto>?> GetTopRatedAnimeAsync(int page = 1, int perPage = 25) =>
            await GetPagedResponse(_context.Animes.Where(a => a.Approved && a.Score != null && a.Rank != null && a.Rank > 0).OrderByDescending(a => a.Score), page, perPage, "Anime:TopRated");

        public async Task<PagedResult<AnimeDto>?> GetAiringAnimeAsync(int page = 1, int perPage = 25) =>
            await GetPagedResponse(_context.Animes.Where(a => a.Approved && a.Status == "Currently Airing" && a.Popularity != null && a.Popularity > 0).OrderBy(a => a.Popularity), page, perPage, "Anime:Airing");

        public async Task<PagedResult<AnimeDto>?> GetUpcomingAnimeAsync(int page = 1, int perPage = 25) =>
            await GetPagedResponse(_context.Animes.Where(a => a.Approved && a.Status == "Not yet aired" && a.Popularity != null && a.Popularity > 0).OrderBy(a => a.Popularity), page, perPage, "Anime:Upcoming");

        public async Task<PagedResult<AnimeDto>?> GetTopFavouritedAnimeAsync(int page = 1, int perPage = 25) =>
            await GetPagedResponse(_context.Animes.Where(a => a.Approved).OrderByDescending(a => a.Favorites), page, perPage, "Anime:Favourites");

        public async Task<PagedResult<AnimeDto>?> SearchAnimeAsync(string query, int page = 1, int perPage = 25)
        {
            if (string.IsNullOrWhiteSpace(query))
                return null;

            var searchQuery = _context.Animes
                .Where(a => a.Approved && a.Popularity != null && a.Popularity > 0)
                .Where(a => EF.Functions.ILike(a.Title, $"%{query}%")
                         || (a.TitleEnglish != null && EF.Functions.ILike(a.TitleEnglish, $"%{query}%"))
                         || (a.TitleJapanese != null && EF.Functions.ILike(a.TitleJapanese, $"%{query}%")))
                .OrderBy(a => a.Popularity);

            return await GetPagedResponse(searchQuery, page, perPage, $"Anime:Search:{query}");
        }

        public async Task<PagedResult<AnimeDto>?> GetAnimeByGenreAsync(int genreId, int page = 1, int perPage = 25)
        {
            var query = _context.Animes
                .Where(a => a.Approved && a.Popularity != null && a.Popularity > 0)
                .Where(a => a.AnimeGenres.Any(ag => ag.Genre.MalId == genreId))
                .OrderBy(a => a.Popularity);

            return await GetPagedResponse(query, page, perPage, $"Anime:Genre:{genreId}");
        }

        public async Task<PagedResult<AnimeDto>?> GetAnimeByStudioAsync(int studioId, int page = 1, int perPage = 25)
        {
            var query = _context.Animes
                .Where(a => a.Approved && a.Popularity != null && a.Popularity > 0)
                .Where(a => a.AnimeStudios.Any(asd => asd.Studio.MalId == studioId))
                .OrderBy(a => a.Popularity);

            return await GetPagedResponse(query, page, perPage, $"Anime:Studio:{studioId}");
        }

        public async Task<object> GetTagsAsync(string? type = null, int limit = 100)
        {
            if (limit < 1) limit = 25;
            if (limit > 300) limit = 300;

            var query = _context.Genres
                .AsNoTracking()
                .Where(g => string.IsNullOrWhiteSpace(type) || g.Type == type)
                .Select(g => new
                {
                    malId = g.MalId,
                    name = g.Name,
                    type = g.Type,
                    animeCount = g.AnimeGenres.Count(ag => ag.Anime.Approved && ag.Anime.Popularity != null && ag.Anime.Popularity > 0)
                })
                .Where(g => g.animeCount > 0)
                .OrderByDescending(g => g.animeCount)
                .ThenBy(g => g.name)
                .Take(limit);

            return await query.ToListAsync();
        }

        public async Task<AnimeDto?> GetAnimeByIdAsync(int id)
        {
            string cacheKey = $"AnimeDetail:{id}";

            var cached = await _cacheService.GetAsync<AnimeDto>(cacheKey);
            if (cached != null)
                return cached;

            var animeMain = await _context.Animes.AsNoTracking()
                .Where(a => a.MalId == id)
                .Select(a => new AnimeDto
                {
                    Id = a.Id,
                    MalId = a.MalId,
                    Url = a.Url,
                    Approved = a.Approved,
                    Title = a.Title,
                    TitleEnglish = a.TitleEnglish,
                    TitleJapanese = a.TitleJapanese,
                    Type = a.Type,
                    Source = a.Source,
                    Episodes = a.Episodes,
                    Status = a.Status,
                    Airing = a.Airing,
                    Duration = a.Duration,
                    Rating = a.Rating,
                    Score = a.Score,
                    ScoredBy = a.ScoredBy,
                    Rank = a.Rank,
                    Popularity = a.Popularity,
                    Members = a.Members,
                    Favorites = a.Favorites,
                    Synopsis = a.Synopsis,
                    Background = a.Background,
                    Season = a.Season,
                    Year = a.Year,
                    Images = a.Images.Select(i => new AnimeImageDto { Format = i.Format, ImageUrl = i.ImageUrl }).ToList(),
                    Trailer = a.Trailer != null ? new TrailerDto
                    {
                        YoutubeId = a.Trailer.YoutubeId,
                        Url = a.Trailer.Url,
                        EmbedUrl = a.Trailer.EmbedUrl,
                        Images = a.Trailer.Images != null ? new TrailerImagesDto
                        {
                            ImageUrl = a.Trailer.Images.ImageUrl,
                            SmallImageUrl = a.Trailer.Images.SmallImageUrl,
                            MediumImageUrl = a.Trailer.Images.MediumImageUrl,
                            LargeImageUrl = a.Trailer.Images.LargeImageUrl,
                            MaximumImageUrl = a.Trailer.Images.MaximumImageUrl
                        } : null
                    } : null,
                    Aired = a.Aired != null ? new AiredDto
                    {
                        From = a.Aired.From,
                        To = a.Aired.To,
                        String = a.Aired.String,
                        Prop = a.Aired.Prop != null ? new AiredPropDto
                        {
                            From = a.Aired.Prop.From != null ? new AiredPropDateDto
                            {
                                Day = a.Aired.Prop.From.Day,
                                Month = a.Aired.Prop.From.Month,
                                Year = a.Aired.Prop.From.Year
                            } : null,
                            To = a.Aired.Prop.To != null ? new AiredPropDateDto
                            {
                                Day = a.Aired.Prop.To.Day,
                                Month = a.Aired.Prop.To.Month,
                                Year = a.Aired.Prop.To.Year
                            } : null
                        } : null
                    } : null,
                    Broadcast = a.Broadcast != null ? new BroadcastDto
                    {
                        Day = a.Broadcast.Day,
                        Time = a.Broadcast.Time,
                        Timezone = a.Broadcast.Timezone,
                        String = a.Broadcast.String
                    } : null
                })
                .FirstOrDefaultAsync();

            if (animeMain == null)
                return null;

            Task<List<GenreDto>> genresTask = Task.Run(async () =>
            {
                using var ctx = _dbContextFactory.CreateDbContext();
                return await ctx.AnimeGenres.AsNoTracking()
                    .Where(ag => ag.AnimeId == animeMain.Id)
                    .Select(ag => new GenreDto
                    {
                        MalId = ag.Genre.MalId,
                        Name = ag.Genre.Name,
                        Type = ag.Genre.Type
                    }).ToListAsync();
            });

            Task<List<StudioDto>> studiosTask = Task.Run(async () =>
            {
                using var ctx = _dbContextFactory.CreateDbContext();
                return await ctx.AnimeStudios.AsNoTracking()
                    .Where(asd => asd.AnimeId == animeMain.Id)
                    .Select(asd => new StudioDto
                    {
                        MalId = asd.Studio.MalId,
                        Name = asd.Studio.Name
                    }).ToListAsync();
            });

            Task<List<ProducerDto>> producersTask = Task.Run(async () =>
            {
                using var ctx = _dbContextFactory.CreateDbContext();
                return await ctx.AnimeProducers.AsNoTracking()
                    .Where(p => p.AnimeId == animeMain.Id)
                    .Select(p => new ProducerDto
                    {
                        MalId = p.Producer.MalId,
                        Name = p.Producer.Name
                    }).ToListAsync();
            });

            Task<List<LicensorDto>> licensorsTask = Task.Run(async () =>
            {
                using var ctx = _dbContextFactory.CreateDbContext();
                return await ctx.AnimeLicensors.AsNoTracking()
                    .Where(l => l.AnimeId == animeMain.Id)
                    .Select(l => new LicensorDto
                    {
                        MalId = l.Licensor.MalId,
                        Name = l.Licensor.Name
                    }).ToListAsync();
            });

            Task<List<ThemeEntryDto>> themesTask = Task.Run(async () =>
            {
                using var ctx = _dbContextFactory.CreateDbContext();
                return await ctx.ThemeEntries.AsNoTracking()
                    .Where(te => te.AnimeId == animeMain.Id)
                    .OrderBy(te => te.Sequence)
                    .Select(te => new ThemeEntryDto
                    {
                        Category = te.Category,
                        Sequence = te.Sequence,
                        RawText = te.RawText
                    }).ToListAsync();
            });

            Task<List<ExternalLinkDto>> extLinksTask = Task.Run(async () =>
            {
                using var ctx = _dbContextFactory.CreateDbContext();
                return await ctx.ExternalLinks.AsNoTracking()
                    .Where(ex => ex.AnimeId == animeMain.Id)
                    .Select(ex => new ExternalLinkDto { Name = ex.Name, Url = ex.Url })
                    .ToListAsync();
            });

            Task<List<StreamingLinkDto>> streamLinksTask = Task.Run(async () =>
            {
                using var ctx = _dbContextFactory.CreateDbContext();
                return await ctx.StreamingLinks.AsNoTracking()
                    .Where(st => st.AnimeId == animeMain.Id)
                    .Select(st => new StreamingLinkDto { Name = st.Name, Url = st.Url })
                    .ToListAsync();
            });

            Task<List<RelationDto>> relationsTask = Task.Run(async () =>
            {
                using var ctx = _dbContextFactory.CreateDbContext();
                var relations = await ctx.Relations.AsNoTracking()
                    .Where(r => r.AnimeId == animeMain.Id)
                    .Select(r => new RelationDto
                    {
                        RelationType = r.RelationType,
                        Entries = r.Entries.Select(e => new RelationEntryDto
                        {
                            MalId = e.MalId,
                            EntryType = e.EntryType,
                            Name = e.Name,
                            Url = e.Url
                        }).ToList()
                    }).ToListAsync();

                var animeMalIds = relations
                    .SelectMany(r => r.Entries)
                    .Where(e => (string.IsNullOrEmpty(e.EntryType) || e.EntryType.ToLower() == "anime") && e.MalId > 0)
                    .Select(e => e.MalId)
                    .Distinct()
                    .ToList();

                if (animeMalIds.Count > 0)
                {
                    var posterMap = await ctx.AnimeImages.AsNoTracking()
                        .Where(ai => animeMalIds.Contains(ai.Anime.MalId) && !string.IsNullOrEmpty(ai.ImageUrl))
                        .GroupBy(ai => ai.Anime.MalId)
                        .Select(g => new
                        {
                            MalId = g.Key,
                            ImageUrl = g.OrderBy(ai => ai.Format == "jpg" ? 0 : 1).Select(ai => ai.ImageUrl).FirstOrDefault()
                        })
                        .ToDictionaryAsync(x => x.MalId, x => x.ImageUrl);

                    foreach (var rel in relations)
                    {
                        foreach (var entry in rel.Entries)
                        {
                            if (posterMap.TryGetValue(entry.MalId, out var img) && !string.IsNullOrEmpty(img))
                            {
                                entry.ImageUrl = img;
                            }
                        }
                    }
                }

                return relations;
            });

            await Task.WhenAll(genresTask, studiosTask, producersTask, licensorsTask, themesTask, extLinksTask, streamLinksTask, relationsTask);

            var allGenres = genresTask.Result;
            animeMain.Genres = allGenres.Where(x => x.Type == "genre").ToList();
            animeMain.ExplicitGenres = allGenres.Where(x => x.Type == "explicit_genre").ToList();
            animeMain.Themes = allGenres.Where(x => x.Type == "theme").ToList();
            animeMain.Demographics = allGenres.Where(x => x.Type == "demographic").ToList();
            animeMain.Studios = studiosTask.Result;
            animeMain.Producers = producersTask.Result;
            animeMain.Licensors = licensorsTask.Result;
            animeMain.ThemeEntries = themesTask.Result;
            animeMain.ExternalLinks = extLinksTask.Result;
            animeMain.StreamingLinks = streamLinksTask.Result;
            animeMain.Relations = relationsTask.Result;

            await _cacheService.SetAsync(cacheKey, animeMain, TimeSpan.FromMinutes(30));
            return animeMain;
        }

        public async Task<AnimeDto?> GetRandomAnimeAsync()
        {
            var total = await _context.Animes.CountAsync();
            if (total == 0) return null;

            var index = new Random().Next(0, total);
            return await _context.Animes
                .AsNoTracking()
                .OrderBy(a => a.Id)
                .Skip(index)
                .Select(a => new AnimeDto
                {
                    Id = a.Id,
                    MalId = a.MalId,
                    Title = a.Title,
                    Images = a.Images.Select(i => new AnimeImageDto { Format = i.Format, ImageUrl = i.ImageUrl }).ToList(),
                })
                .FirstOrDefaultAsync();
        }

        public async Task<object> GetCharactersAsync(int animeMalId)
        {
            var cacheKey = $"AnimeCharactersList:{animeMalId}";

            return await _cacheService.GetOrSetAsync(cacheKey, async () =>
            {
                var localChars = await _context.AnimeCharacters
                    .Where(ac => ac.Anime.MalId == animeMalId)
                    .Select(ac => new
                    {
                        role = ac.Role,
                        favorites = ac.Favorites != 0 ? ac.Favorites : ac.Character.Favorites,
                        character = new
                        {
                            mal_id = ac.Character.MalId,
                            url = ac.Character.Url,
                            name = ac.Character.Name,
                            favorites = ac.Favorites != 0 ? ac.Favorites : ac.Character.Favorites,
                            images = new
                            {
                                jpg = new { image_url = ac.Character.Images.Where(img => img.Format == "jpg").Select(img => img.ImageUrl).FirstOrDefault() },
                                webp = new { image_url = ac.Character.Images.Where(img => img.Format == "webp").Select(img => img.ImageUrl).FirstOrDefault() }
                            }
                        },
                        voice_actors = ac.Character.CharacterVoices
                            .OrderByDescending(cv => cv.Language == "Japanese")
                            .ThenBy(cv => cv.Language)
                            .Select(cv => new
                            {
                                language = cv.Language,
                                person = new
                                {
                                    mal_id = cv.Person.MalId,
                                    url = cv.Person.Url,
                                    name = cv.Person.Name,
                                    images = new
                                    {
                                        jpg = new { image_url = cv.Person.Images.Where(img => img.Format == "jpg").Select(img => img.ImageUrl).FirstOrDefault() }
                                    }
                                }
                            }).ToList(),
                    }).ToListAsync();

                return (object)new { data = localChars };
            }, TimeSpan.FromHours(24)) ?? new { data = Array.Empty<object>() };
        }

        public async Task<object?> GetPersonByMalIdAsync(int personMalId)
        {
            var person = await _context.People
                .AsNoTracking()
                .Include(p => p.Images)
                .Include(p => p.CharacterVoices)
                    .ThenInclude(cv => cv.Character)
                        .ThenInclude(c => c.Images)
                .FirstOrDefaultAsync(p => p.MalId == personMalId);

            if (person == null)
                return null;

            return new
            {
                mal_id = person.MalId,
                url = person.Url,
                name = person.Name,
                images = new
                {
                    jpg = person.Images.Where(i => i.Format == "jpg").Select(i => i.ImageUrl).ToList(),
                    webp = person.Images.Where(i => i.Format == "webp").Select(i => i.ImageUrl).ToList()
                },
                characters_voice = person.CharacterVoices.Select(cv => new
                {
                    mal_id = cv.Character.MalId,
                    url = cv.Character.Url,
                    name = cv.Character.Name,
                    role = cv.Language,
                    images = new
                    {
                        jpg = cv.Character.Images.Where(i => i.Format == "jpg").Select(i => i.ImageUrl).ToList(),
                        webp = cv.Character.Images.Where(i => i.Format == "webp").Select(i => i.ImageUrl).ToList()
                    }
                }).ToList()
            };
        }

        public async Task<RecommendationsResponse?> GetRecommendationsAsync(int animeMalId)
        {
            var cacheKey = $"AnimeRecs:{animeMalId}";

            return await _cacheService.GetOrSetAsync(cacheKey, async () =>
            {
                // 1. Try Official MyAnimeList (MAL) API v2 with a strict 4-second timeout
                try
                {
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(4));
                    var url = $"{_malBaseUrl}/anime/{animeMalId}?fields=recommendations";
                    using var request = new HttpRequestMessage(HttpMethod.Get, url);
                    request.Headers.Add("X-MAL-CLIENT-ID", _malClientId);

                    var response = await _httpClient.SendAsync(request, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(cts.Token);
                        var malResult = JsonConvert.DeserializeObject<MalAnimeRecommendationResponse>(json);
                        if (malResult?.Recommendations != null && malResult.Recommendations.Count > 0)
                        {
                            return new RecommendationsResponse
                            {
                                Data = malResult.Recommendations.Select(r => new RecommendationDto
                                {
                                    Votes = r.NumRecommendations,
                                    Entry = new Entry
                                    {
                                        MalId = r.Node?.Id ?? 0,
                                        Title = r.Node?.Title ?? string.Empty,
                                        Images = new ImageSet
                                        {
                                            Jpg = new JpgImage
                                            {
                                                ImageUrl = r.Node?.MainPicture?.Large ?? r.Node?.MainPicture?.Medium ?? string.Empty,
                                                LargeImageUrl = r.Node?.MainPicture?.Large ?? r.Node?.MainPicture?.Medium ?? string.Empty,
                                                SmallImageUrl = r.Node?.MainPicture?.Medium ?? string.Empty
                                            }
                                        }
                                    }
                                }).ToList()
                            };
                        }
                    }
                }
                catch (Exception)
                {
                    // Official MAL API timed out, rate limited, or unreachable - fallback to local PostgreSQL recommendations
                }

                // 2. Resilient Database Fallback: recommend top anime sharing the same genres
                try
                {
                    await using var ctx = await _dbContextFactory.CreateDbContextAsync();

                    var targetGenres = await ctx.AnimeGenres
                        .Where(ag => ag.Anime.MalId == animeMalId)
                        .Select(ag => ag.GenreId)
                        .ToListAsync();

                    var fallbackQuery = ctx.Animes
                        .AsNoTracking()
                        .Where(a => a.Approved && a.MalId != animeMalId);

                    if (targetGenres.Count > 0)
                    {
                        fallbackQuery = fallbackQuery.Where(a => a.AnimeGenres.Any(ag => targetGenres.Contains(ag.GenreId)));
                    }

                    var fallbackAnimes = await fallbackQuery
                        .OrderByDescending(a => a.Score)
                        .Take(10)
                        .Select(a => new
                        {
                            a.MalId,
                            a.Title,
                            ImageUrl = a.Images.FirstOrDefault(i => i.Format == "jpg")!.ImageUrl
                                    ?? a.Images.FirstOrDefault()!.ImageUrl
                        })
                        .ToListAsync();

                    return new RecommendationsResponse
                    {
                        Data = fallbackAnimes.Select(a => new RecommendationDto
                        {
                            Votes = 1,
                            Entry = new Entry
                            {
                                MalId = a.MalId,
                                Title = a.Title,
                                Images = new ImageSet
                                {
                                    Jpg = new JpgImage
                                    {
                                        ImageUrl = a.ImageUrl ?? "",
                                        LargeImageUrl = a.ImageUrl ?? ""
                                    }
                                }
                            }
                        }).ToList()
                    };
                }
                catch (Exception)
                {
                    return new RecommendationsResponse { Data = new List<RecommendationDto>() };
                }
            }, TimeSpan.FromHours(24));
        }

        private static (string name, string artist) ParseThemeText(string rawText)
        {
            if (string.IsNullOrWhiteSpace(rawText))
                return (string.Empty, string.Empty);

            var match = SongArtistRegex.Match(rawText);
            if (match.Success)
            {
                return (match.Groups[1].Value.Trim(), match.Groups[2].Value.Trim());
            }

            var parts = rawText.Split(new[] { " by " }, StringSplitOptions.None);
            if (parts.Length > 1)
            {
                return (parts[0].Trim(' ', '"', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', '#'), parts[1].Trim(' ', '(', ')'));
            }

            return (rawText.Trim(' ', '"', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', '#'), string.Empty);
        }

        public async Task<AnimeThemesDto?> GetAnimeThemesAsync(int animeMalId)
        {
            string cacheKey = $"AnimeThemes:{animeMalId}";
            return await _cacheService.GetOrSetAsync(cacheKey, async () =>
            {
                var themeEntries = await _context.ThemeEntries
                    .Where(te => te.Anime.MalId == animeMalId)
                    .ToListAsync();

                if (themeEntries != null && themeEntries.Count > 0)
                {
                    return new AnimeThemesDto
                    {
                        Openings = themeEntries.Where(te => te.Category == "opening")
                                    .OrderBy(te => te.Sequence)
                                    .Select(te => te.RawText)
                                    .ToList(),
                        Endings = themeEntries.Where(te => te.Category == "ending")
                                    .OrderBy(te => te.Sequence)
                                    .Select(te => te.RawText)
                                    .ToList()
                    };
                }

                // Fallback to Official MyAnimeList (MAL) API v2
                try
                {
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(4));
                    var url = $"{_malBaseUrl}/anime/{animeMalId}?fields=opening_themes,ending_themes";
                    using var request = new HttpRequestMessage(HttpMethod.Get, url);
                    request.Headers.Add("X-MAL-CLIENT-ID", _malClientId);

                    var response = await _httpClient.SendAsync(request, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(cts.Token);
                        var malThemes = JsonConvert.DeserializeObject<MalAnimeThemesResponse>(json);
                        if (malThemes != null)
                        {
                            return new AnimeThemesDto
                            {
                                Openings = malThemes.OpeningThemes?.Select(t => t.Text).ToList() ?? new List<string>(),
                                Endings = malThemes.EndingThemes?.Select(t => t.Text).ToList() ?? new List<string>()
                            };
                        }
                    }
                }
                catch
                {
                    // Ignore fallback error
                }

                return null;
            }, TimeSpan.FromMinutes(30));
        }

        public async Task<List<AnimeSoundtrackSongDto>> GetAnimeSoundtracksAsync(int animeMalId)
        {
            string cacheKey = $"AnimeSoundtracks:{animeMalId}";
            return await _cacheService.GetOrSetAsync(cacheKey, async () =>
            {
                var anime = await _context.Animes
                    .AsNoTracking()
                    .Include(a => a.Images)
                    .Include(a => a.ThemeEntries)
                    .FirstOrDefaultAsync(a => a.MalId == animeMalId);

                var animeTitle = anime?.Title ?? "";
                var animeImage = anime?.Images?.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                                 ?? anime?.Images?.FirstOrDefault()?.ImageUrl;

                var result = new List<AnimeSoundtrackSongDto>();

                if (anime?.ThemeEntries != null && anime.ThemeEntries.Count > 0)
                {
                    var ordered = anime.ThemeEntries
                        .Where(te => te.Category == "opening" || te.Category == "ending")
                        .OrderBy(te => te.Category)
                        .ThenBy(te => te.Sequence);

                    foreach (var te in ordered)
                    {
                        if (string.IsNullOrWhiteSpace(te.RawText)) continue;
                        var (name, artist) = ParseThemeText(te.RawText);
                        result.Add(new AnimeSoundtrackSongDto
                        {
                            AnimeMalId = animeMalId,
                            AnimeTitle = animeTitle,
                            AnimeImage = animeImage,
                            Name = name,
                            Artist = artist,
                            Type = te.Category == "opening" ? "Opening" : "Ending",
                            Sequence = te.Sequence,
                            RawText = te.RawText
                        });
                    }
                    return result;
                }

                // If no theme entries in DB, use GetAnimeThemesAsync (which includes Official MAL API fallback)
                var themes = await GetAnimeThemesAsync(animeMalId);
                if (themes != null)
                {
                    int seq = 1;
                    foreach (var op in themes.Openings)
                    {
                        var (name, artist) = ParseThemeText(op);
                        result.Add(new AnimeSoundtrackSongDto
                        {
                            AnimeMalId = animeMalId,
                            AnimeTitle = animeTitle,
                            AnimeImage = animeImage,
                            Name = name,
                            Artist = artist,
                            Type = "Opening",
                            Sequence = seq++,
                            RawText = op
                        });
                    }

                    seq = 1;
                    foreach (var ed in themes.Endings)
                    {
                        var (name, artist) = ParseThemeText(ed);
                        result.Add(new AnimeSoundtrackSongDto
                        {
                            AnimeMalId = animeMalId,
                            AnimeTitle = animeTitle,
                            AnimeImage = animeImage,
                            Name = name,
                            Artist = artist,
                            Type = "Ending",
                            Sequence = seq++,
                            RawText = ed
                        });
                    }
                }

                return result;
            }, TimeSpan.FromMinutes(30)) ?? new List<AnimeSoundtrackSongDto>();
        }

        private async Task<PagedResult<AnimeDto>?> GetPagedResponse(IQueryable<Kiroku.Domain.Entities.Anime> query, int page, int per_page, string cacheKeyPrefix)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 25;

            string cacheKey = $"{cacheKeyPrefix}:page={page}:perpage={per_page}";

            return await _cacheService.GetOrSetAsync(cacheKey, async () =>
            {
                var totalItems = await query.CountAsync();
                var totalPages = (int)Math.Ceiling(totalItems / (double)per_page);

                var items = await query
                    .Skip((page - 1) * per_page)
                    .Take(per_page)
                    .Select(a => new AnimeDto
                    {
                        Id = a.Id,
                        MalId = a.MalId,
                        Url = a.Url,
                        Approved = a.Approved,
                        Title = a.Title,
                        TitleEnglish = a.TitleEnglish,
                        TitleJapanese = a.TitleJapanese,
                        Score = a.Score,
                        Status = a.Status,
                        Popularity = a.Popularity,
                        Favorites = a.Favorites,
                        Synopsis = a.Synopsis,
                        Type = a.Type,
                        Year = a.Year,
                        Rank = a.Rank,
                        Images = a.Images.Select(i => new AnimeImageDto
                        {
                            Format = i.Format,
                            ImageUrl = i.ImageUrl
                        }).ToList(),
                    })
                    .ToListAsync();

                return new PagedResult<AnimeDto>
                {
                    Pagination = new PaginationMetadata
                    {
                        LastVisiblePage = totalPages,
                        HasNextPage = page < totalPages,
                        CurrentPage = page,
                        Items = new PaginationItems
                        {
                            Count = items.Count,
                            Total = totalItems,
                            PerPage = per_page
                        }
                    },
                    Data = items
                };
            }, TimeSpan.FromMinutes(5));
        }
    }

    internal class MalAnimeRecommendationResponse
    {
        [JsonProperty("recommendations")]
        public List<MalRecommendationItem>? Recommendations { get; set; }
    }

    internal class MalRecommendationItem
    {
        [JsonProperty("node")]
        public MalNode? Node { get; set; }

        [JsonProperty("num_recommendations")]
        public int NumRecommendations { get; set; }
    }

    internal class MalNode
    {
        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("title")]
        public string Title { get; set; } = string.Empty;

        [JsonProperty("main_picture")]
        public MalMainPicture? MainPicture { get; set; }
    }

    internal class MalMainPicture
    {
        [JsonProperty("medium")]
        public string? Medium { get; set; }

        [JsonProperty("large")]
        public string? Large { get; set; }
    }

    internal class MalAnimeThemesResponse
    {
        [JsonProperty("opening_themes")]
        public List<MalThemeItem>? OpeningThemes { get; set; }

        [JsonProperty("ending_themes")]
        public List<MalThemeItem>? EndingThemes { get; set; }
    }

    internal class MalThemeItem
    {
        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("anime_id")]
        public int AnimeId { get; set; }

        [JsonProperty("text")]
        public string Text { get; set; } = string.Empty;
    }
}
