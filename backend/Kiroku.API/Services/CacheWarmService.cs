using Kiroku.Application.Services;
using Kiroku.Data.Contexts;
using Kiroku.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Kiroku.API.Services
{
    public record CacheWarmResult(string Name, string CacheKey, int ItemCount);

    public class CacheWarmService
    {
        private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
        private readonly ICacheService _cacheService;
        private readonly ILogger<CacheWarmService> _logger;

        public CacheWarmService(
            IDbContextFactory<AppDbContext> dbContextFactory,
            ICacheService cacheService,
            ILogger<CacheWarmService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _cacheService = cacheService;
            _logger = logger;
        }

        public async Task<IReadOnlyList<CacheWarmResult>> WarmMostUsedAnimeEndpointsAsync(CancellationToken cancellationToken = default)
        {
            var jobs = new[]
            {
                new CacheWarmJob("Popular", "Anime:Popular", query => query.Where(a => a.Approved && a.Popularity != null && a.Popularity > 0).OrderBy(a => a.Popularity)),
                new CacheWarmJob("Top Rated", "Anime:TopRated", query => query.Where(a => a.Approved && a.Score != null && a.Rank != null && a.Rank > 0).OrderByDescending(a => a.Score)),
                new CacheWarmJob("Airing", "Anime:Airing", query => query.Where(a => a.Approved && a.Status == "Currently Airing" && a.Popularity != null && a.Popularity > 0).OrderBy(a => a.Popularity)),
                new CacheWarmJob("Upcoming", "Anime:Upcoming", query => query.Where(a => a.Approved && a.Status == "Not yet aired" && a.Popularity != null && a.Popularity > 0).OrderBy(a => a.Popularity)),
                new CacheWarmJob("Favourites", "Anime:Favourites", query => query.Where(a => a.Approved).OrderByDescending(a => a.Favorites)),
            };

            var results = new List<CacheWarmResult>(jobs.Length);

            foreach (var job in jobs)
            {
                cancellationToken.ThrowIfCancellationRequested();
                results.Add(await WarmPagedAnimeResponseAsync(job, cancellationToken));
            }

            return results;
        }

        private async Task<CacheWarmResult> WarmPagedAnimeResponseAsync(CacheWarmJob job, CancellationToken cancellationToken)
        {
            await using var context = await _dbContextFactory.CreateDbContextAsync(cancellationToken);
            var baseQuery = job.Query(context.Animes.AsNoTracking());
            const int page = 1;
            const int perPage = 25;
            var cacheKey = $"{job.CacheKeyPrefix}:page={page}:perpage={perPage}";

            var payload = await _cacheService.GetOrSetAsync(
                cacheKey,
                async () =>
                {
                    var totalItems = await baseQuery.CountAsync(cancellationToken);
                    var totalPages = (int)Math.Ceiling(totalItems / (double)perPage);
                    var data = await baseQuery
                        .Skip((page - 1) * perPage)
                        .Take(perPage)
                        .Select(a => new
                        {
                            a.Id,
                            a.MalId,
                            a.Title,
                            a.TitleEnglish,
                            a.TitleJapanese,
                            a.Type,
                            a.Source,
                            a.Episodes,
                            a.Status,
                            a.Airing,
                            a.Duration,
                            a.Rating,
                            a.Score,
                            a.ScoredBy,
                            a.Rank,
                            a.Popularity,
                            a.Members,
                            a.Favorites,
                            a.Synopsis,
                            a.Season,
                            a.Year,
                            Images = a.Images.Select(i => new
                            {
                                i.Format,
                                i.ImageUrl
                            }).ToList()
                        })
                        .ToListAsync(cancellationToken);

                    return System.Text.Json.JsonSerializer.Serialize(new
                    {
                        pagination = new
                        {
                            last_visible_page = totalPages,
                            has_next_page = page < totalPages,
                            current_page = page,
                            items = new
                            {
                                count = data.Count,
                                total = totalItems,
                                per_page = perPage
                            }
                        },
                        data
                    });
                },
                TimeSpan.FromMinutes(5));

            var itemCount = 0;
            if (!string.IsNullOrWhiteSpace(payload))
            {
                using var doc = System.Text.Json.JsonDocument.Parse(payload);
                if (doc.RootElement.TryGetProperty("data", out var dataElement) && dataElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    itemCount = dataElement.GetArrayLength();
                }
            }

            _logger.LogInformation("Warmed cache {CacheKey} for {Name} with {ItemCount} items.", cacheKey, job.Name, itemCount);
            return new CacheWarmResult(job.Name, cacheKey, itemCount);
        }

        private sealed record CacheWarmJob(
            string Name,
            string CacheKeyPrefix,
            Func<IQueryable<Anime>, IQueryable<Anime>> Query);
    }
}
