using Kiroku.Application.DTOs;
using Kiroku.Application.Services;
using Kiroku.Data.Contexts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Internal;
using Newtonsoft.Json;
using System.Net.Http;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class AnimeController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ICacheService _cacheService;
        private readonly HttpClient _httpClient;
        private readonly IDbContextFactory<AppDbContext> _dbContextFactory;

        public AnimeController(AppDbContext context, IHttpClientFactory httpClientFactory, ICacheService cacheService, IDbContextFactory<AppDbContext> dbContextFactory)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient();
            _cacheService = cacheService;
            _dbContextFactory = dbContextFactory;
        }

        // ---- Lightweight paginated endpoints (main fields only) ----

        [HttpGet("popular")]
        public async Task<IActionResult> GetPopularAnime(int page = 1, int per_page = 25) =>
            await GetPagedResponse(_context.Animes.Where(a => a.Approved && a.Popularity != null && a.Popularity > 0).OrderBy(a => a.Popularity), page, per_page, "Anime:Popular");

        [HttpGet("top-rated")]
        public async Task<IActionResult> GetTopRatedAnime(int page = 1, int per_page = 25) =>
            await GetPagedResponse(_context.Animes.Where(a => a.Approved && a.Score != null && a.Rank != null && a.Rank > 0).OrderByDescending(a => a.Score), page, per_page, "Anime:TopRated");

        [HttpGet("airing")]
        public async Task<IActionResult> GetAiringAnime(int page = 1, int per_page = 25) =>
            await GetPagedResponse(_context.Animes.Where(a => a.Approved && a.Status == "Currently Airing" && a.Popularity != null && a.Popularity > 0).OrderBy(a => a.Popularity), page, per_page, "Anime:Airing");

        [HttpGet("upcoming")]
        public async Task<IActionResult> GetUpcomingAnime(int page = 1, int per_page = 25) =>
            await GetPagedResponse(_context.Animes.Where(a => a.Approved && a.Status == "Not yet aired" && a.Popularity != null && a.Popularity > 0).OrderBy(a => a.Popularity), page, per_page, "Anime:Upcoming");

        [HttpGet("favourites")]
        public async Task<IActionResult> GetTopFavouritedAnime(int page = 1, int per_page = 25) =>
            await GetPagedResponse(_context.Animes.Where(a => a.Approved).OrderByDescending(a => a.Favorites), page, per_page, "Anime:Favourites");

        [HttpGet("search")]
        public async Task<IActionResult> SearchAnime(string query, int page = 1, int per_page = 25)
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new { message = "Query cannot be empty" });

            var searchQuery = _context.Animes
                .Where(a => a.Approved && a.Popularity != null && a.Popularity > 0)
                .Where(a => EF.Functions.ILike(a.Title, $"%{query}%")
                         || EF.Functions.ILike(a.TitleEnglish, $"%{query}%")
                         || EF.Functions.ILike(a.TitleJapanese, $"%{query}%"))
                .OrderBy(a => a.Popularity);

            return await GetPagedResponse(searchQuery, page, per_page, $"Anime:Search:{query}");
        }

        [HttpGet("genre/{genreId}")]
        public async Task<IActionResult> GetAnimeByGenre(int genreId, int page = 1, int per_page = 25)
        {
            var query = _context.Animes
                .Where(a => a.Approved && a.Popularity != null && a.Popularity > 0)
                .Where(a => a.AnimeGenres.Any(ag => ag.Genre.MalId == genreId))
                .OrderBy(a => a.Popularity);

            return await GetPagedResponse(query, page, per_page, $"Anime:Genre:{genreId}");
        }

        [HttpGet("studio/{studioId}")]
        public async Task<IActionResult> GetAnimeByStudio(int studioId, int page = 1, int per_page = 25)
        {
            var query = _context.Animes
                .Where(a => a.Approved && a.Popularity != null && a.Popularity > 0)
                .Where(a => a.AnimeStudios.Any(asd => asd.Studio.MalId == studioId))
                .OrderBy(a => a.Popularity);

            return await GetPagedResponse(query, page, per_page, $"Anime:Studio:{studioId}");
        }

        [HttpGet("tags")]
        public async Task<IActionResult> GetTags(string? type = null, int limit = 100)
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

            return Ok(await query.ToListAsync());
        }

        // ---- "Detail page" endpoint: LOAD MAIN FIELDS THEN JOIN COLLECTIONS SEPARATELY ----

        [HttpGet("{id}")]
        public async Task<IActionResult> GetAnimeById(int id)
        {
            string cacheKey = $"AnimeDetail:{id}";

            var cached = await _cacheService.GetAsync<AnimeDto>(cacheKey);
            if (cached != null)
                return Ok(cached);

            // 1. Get main fields from main context (always thread-safe if awaited before parallel ops)
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
                    // One-to-one children (if any)
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
                return NotFound(new { message = "Anime not found" });

            // 2. Fetch large/many-to-many collections in parallel with new DbContext per task
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
                    .Select(st => new StreamingLinkDto { Name = st.Name, Url = st.Url }).ToListAsync();
            });

            Task<List<RelationDto>> relationsTask = Task.Run(async () =>
            {
                using var ctx = _dbContextFactory.CreateDbContext();
                return await ctx.Relations.AsNoTracking()
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
            });

            await Task.WhenAll(genresTask, studiosTask, producersTask, licensorsTask, themesTask, extLinksTask, streamLinksTask, relationsTask);

            // Attach all result collections to main DTO
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
            return Ok(animeMain);
        }

        // ---- Random, themes, recommendations etc, as before ----

        [HttpGet("random")]
        public async Task<IActionResult> GetRandomAnime()
        {
            var total = await _context.Animes.CountAsync();
            if (total == 0) return NotFound(new { message = "No anime found" });

            var index = new Random().Next(0, total);
            var result = await _context.Animes
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

            return result == null ? NotFound(new { message = "No anime found" }) : Ok(result);
        }

        //[HttpGet("{id}/characters")]
        //public async Task<IActionResult> GetCharacters(int id)
        //{
        //    var url = $"https://api.jikan.moe/v4/anime/{id}/characters";
        //    var response = await _httpClient.GetAsync(url);
        //    if (!response.IsSuccessStatusCode)
        //        return StatusCode((int)response.StatusCode, "Failed to fetch characters from Jikan");
        //    var json = await response.Content.ReadAsStringAsync();
        //    var result = JsonConvert.DeserializeObject<CharacterApiResponse>(json);
        //    return Ok(result);
        //}
        [HttpGet("{id}/characters")]
        public async Task<IActionResult> GetCharacters(int id)
        {
            // Eagerly load all related anime, characters, voices, people, images
            var characters = await _context.AnimeCharacters
                .Where(ac => ac.Anime.MalId == id)
                .Select(ac => new
                {
                    role = ac.Role,
                    favorites = ac.Favorites,
                    character = new
                    {
                        mal_id = ac.Character.MalId,
                        url = ac.Character.Url,
                        name = ac.Character.Name,
                        images = new
                        {
                            jpg = new { image_url = ac.Character.Images.FirstOrDefault(img => img.Format == "jpg").ImageUrl },
                            webp = new { image_url = ac.Character.Images.FirstOrDefault(img => img.Format == "webp").ImageUrl }
                        }
                    },
                    voice_actors = ac.Character.CharacterVoices.Where(a=>a.Language == "Japanese").Select(cv => new
                    {
                        language = cv.Language,
                        person = new
                        {
                            mal_id = cv.Person.MalId,
                            url = cv.Person.Url,
                            name = cv.Person.Name,
                            images = new
                            {
                                jpg = new { image_url = cv.Person.Images.FirstOrDefault(img => img.Format == "jpg").ImageUrl }
                            }
                        }
                    }).ToList(),
                }).ToListAsync();

            return Ok(new { data = characters });
        }


        //[HttpGet("{id}/person")]
        //public async Task<IActionResult> GetPeople(int id)
        //{
        //    var url = $"https://api.jikan.moe/v4/people/{id}";
        //    var response = await _httpClient.GetAsync(url);
        //    if (!response.IsSuccessStatusCode)
        //        return StatusCode((int)response.StatusCode, "Failed to fetch people from Jikan");
        //    var json = await response.Content.ReadAsStringAsync();
        //    var result = JsonConvert.DeserializeObject<CharacterApiResponse>(json);
        //    return Ok(result);
        //}

        [HttpGet("{id}/person")]
        public async Task<IActionResult> GetPersonByMalId(int id)
        {
            var person = await _context.People
                .AsNoTracking()
                .Include(p => p.Images)
                .Include(p => p.CharacterVoices)
                    .ThenInclude(cv => cv.Character)
                        .ThenInclude(c => c.Images)
                .FirstOrDefaultAsync(p => p.MalId == id);

            if (person == null)
                return NotFound(new { message = "Person not found" });


            var result = new
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

            return Ok(result);
        }

        [HttpGet("{id}/recommendations")]
        public async Task<IActionResult> GetRecommendations(int id)
        {
            var url = $"https://api.jikan.moe/v4/anime/{id}/recommendations";
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, "Failed to fetch recommendations from Jikan");
            var json = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<RecommendationsResponse>(json);
            return Ok(result);
        }

        [HttpGet("{malId}/themes")]
        public async Task<IActionResult> GetAnimeThemes(int malId)
        {
            string cacheKey = $"AnimeThemes:{malId}";
            var themes = await _cacheService.GetOrSetAsync(cacheKey, async () =>
            {
                var themeEntries = await _context.ThemeEntries
                    .Where(te => te.Anime.MalId == malId)
                    .ToListAsync();

                if (themeEntries == null || themeEntries.Count == 0)
                    return null;

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
            }, TimeSpan.FromMinutes(30));

            if (themes == null)
                return NotFound(new { message = "Anime not found" });

            return Ok(themes);
        }

        // ---- Helper for paginated queries with caching ----

        private async Task<IActionResult> GetPagedResponse(IQueryable<Kiroku.Domain.Entities.Anime> query, int page, int per_page, string cacheKeyPrefix)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 25;

            string cacheKey = $"{cacheKeyPrefix}:page={page}:perpage={per_page}";

            var cachedResult = await _cacheService.GetOrSetAsync(cacheKey, async () =>
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

                var responseObj = new
                {
                    pagination = new
                    {
                        last_visible_page = totalPages,
                        has_next_page = page < totalPages,
                        current_page = page,
                        items = new
                        {
                            count = items.Count,
                            total = totalItems,
                            per_page
                        }
                    },
                    data = items
                };

                return JsonConvert.SerializeObject(responseObj);
            }, TimeSpan.FromMinutes(5));

            if (string.IsNullOrEmpty(cachedResult))
                return NotFound(new { message = "No data found" });

            return Content(cachedResult, "application/json");
        }
    }
}
