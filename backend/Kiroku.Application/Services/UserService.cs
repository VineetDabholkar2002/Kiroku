using Kiroku.Application.DTOs;
using Kiroku.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Kiroku.Application.Services
{
    public interface IUserRepository
    {
        Task<User?> GetUserById(int userId);
        Task<User?> GetUserByUsername(string username);
        Task<User?> AuthenticateUser(string username, string password);
        Task<List<UserAnimeList>> GetUserAnimeList(int userId);
        Task<UserAnimeList?> UpsertUserAnimeListItem(string username, int animeMalId, string status, int score);
        Task<List<User>> GetUsersWithAnimeLists();
    }

    public class UserService
    {
        private readonly IUserRepository _userRepository;
        public UserService(IUserRepository userRepository) => _userRepository = userRepository;

        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "Completed",
            "Watching",
            "Plan to Watch",
            "Dropped",
        };

        public async Task<UserDTO?> GetUserProfile(int userId)
        {
            var user = await _userRepository.GetUserById(userId);
            if (user == null) return null;

            return new UserDTO
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                ProfilePicture = user.ProfilePicture
            };
        }

        public async Task<User?> GetUserByUsername(string username)
            => await _userRepository.GetUserByUsername(username);

        public async Task<User?> AuthenticateUser(string username, string password)
            => await _userRepository.AuthenticateUser(username, password);

        public async Task<List<UserAnimeListDTO>> GetUserAnimeList(int userId)
        {
            var animeList = await _userRepository.GetUserAnimeList(userId);
            return animeList.Select(a => new UserAnimeListDTO
            {
                AnimeId = a.AnimeId,
                AnimeMalId = a.Anime?.MalId ?? 0,
                AnimeTitle = a.Anime?.Title ?? string.Empty,
                AnimeImageUrl = a.Anime?.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                    ?? a.Anime?.Images.FirstOrDefault()?.ImageUrl,
                AnimeType = a.Anime?.Type,
                AnimeScore = a.Anime?.Score,
                Episodes = a.Anime?.Episodes,
                Duration = a.Anime?.Duration,
                Status = a.Status,
                Score = a.Score,
                Tags = a.Anime?.AnimeGenres?
                    .Select(ag => ag.Genre)
                    .Where(g => g != null)
                    .Select(g => new UserAnimeTagDto
                    {
                        MalId = g.MalId,
                        Name = g.Name ?? string.Empty,
                        Type = g.Type ?? string.Empty
                    })
                    .ToList() ?? new List<UserAnimeTagDto>(),
                Studios = a.Anime?.AnimeStudios?
                    .Select(s => s.Studio?.Name)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Cast<string>()
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList() ?? new List<string>()
            }).ToList();
        }

        public async Task<List<UserAnimeListDTO>?> GetUserAnimeListByUsername(string username)
        {
            var user = await _userRepository.GetUserByUsername(username);
            if (user == null) return null;
            return await GetUserAnimeList(user.Id);
        }

        public async Task<UserAnimeListDTO?> UpsertUserAnimeListItem(string username, int animeMalId, string status, int score)
        {
            var trimmedStatus = status?.Trim() ?? "";
            if (!AllowedStatuses.Contains(trimmedStatus))
                throw new ArgumentException("Invalid anime list status.", nameof(status));
            if (score < 0 || score > 10)
                throw new ArgumentException("Score must be between 0 and 10.", nameof(score));

            var updated = await _userRepository.UpsertUserAnimeListItem(username, animeMalId, trimmedStatus, score);
            if (updated == null) return null;

            return new UserAnimeListDTO
            {
                AnimeId = updated.AnimeId,
                AnimeMalId = updated.Anime?.MalId ?? animeMalId,
                AnimeTitle = updated.Anime?.Title ?? string.Empty,
                AnimeImageUrl = updated.Anime?.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                    ?? updated.Anime?.Images.FirstOrDefault()?.ImageUrl,
                AnimeType = updated.Anime?.Type,
                AnimeScore = updated.Anime?.Score,
                Episodes = updated.Anime?.Episodes,
                Duration = updated.Anime?.Duration,
                Status = updated.Status,
                Score = updated.Score,
                Tags = updated.Anime?.AnimeGenres?
                    .Select(ag => ag.Genre)
                    .Where(g => g != null)
                    .Select(g => new UserAnimeTagDto
                    {
                        MalId = g.MalId,
                        Name = g.Name ?? string.Empty,
                        Type = g.Type ?? string.Empty
                    })
                    .ToList() ?? new List<UserAnimeTagDto>(),
                Studios = updated.Anime?.AnimeStudios?
                    .Select(s => s.Studio?.Name)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Cast<string>()
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList() ?? new List<string>()
            };
        }

        public async Task<UserRecommendationsDto?> GetUserRecommendations(string username)
        {
            var targetUser = await _userRepository.GetUserByUsername(username);
            if (targetUser == null) return null;

            var targetAnimeList = await GetUserAnimeList(targetUser.Id);
            var allUsers = await _userRepository.GetUsersWithAnimeLists();
            var targetAnimeByMalId = targetAnimeList
                .Where(item => item.AnimeMalId > 0)
                .GroupBy(item => item.AnimeMalId)
                .ToDictionary(group => group.Key, group => group.First());

            var targetWeights = targetAnimeByMalId.ToDictionary(
                pair => pair.Key,
                pair => GetPreferenceWeight(pair.Value.Status, pair.Value.Score));

            var similarUsers = new List<SimilarUserDto>();
            var recommendationAccumulator = new Dictionary<int, RecommendationCandidate>();

            foreach (var candidate in allUsers.Where(user => user.Username != username))
            {
                var candidateEntries = candidate.AnimeList
                    .Where(entry => entry.Anime != null && entry.Anime.MalId > 0)
                    .ToList();

                if (candidateEntries.Count == 0)
                {
                    continue;
                }

                var candidateMap = candidateEntries
                    .GroupBy(entry => entry.Anime.MalId)
                    .ToDictionary(group => group.Key, group => group.First());

                var candidateWeights = candidateMap.ToDictionary(
                    pair => pair.Key,
                    pair => GetPreferenceWeight(pair.Value.Status, pair.Value.Score));

                var sharedAnimeIds = targetWeights.Keys.Intersect(candidateWeights.Keys).ToList();
                if (sharedAnimeIds.Count == 0)
                {
                    continue;
                }

                var cosine = ComputeCosineSimilarity(targetWeights, candidateWeights);
                var overlapRatio = sharedAnimeIds.Count / (double)Math.Max(targetWeights.Count, candidateWeights.Count);
                var sharedCompletedCount = sharedAnimeIds.Count(animeId =>
                    IsPositiveStatus(targetAnimeByMalId[animeId].Status) &&
                    IsPositiveStatus(candidateMap[animeId].Status));

                var similarity = (cosine * 0.75) + (overlapRatio * 0.25);
                if (sharedCompletedCount > 0)
                {
                    similarity += Math.Min(0.08, sharedCompletedCount * 0.01);
                }

                similarity = Math.Clamp(similarity, 0, 1);
                if (similarity < 0.18)
                {
                    continue;
                }

                similarUsers.Add(new SimilarUserDto
                {
                    UserId = candidate.Id,
                    Username = candidate.Username,
                    ProfilePicture = candidate.ProfilePicture,
                    SimilarityScore = Math.Round(similarity, 3),
                    SharedAnimeCount = sharedAnimeIds.Count,
                    SharedCompletedCount = sharedCompletedCount,
                    TopSharedTitles = sharedAnimeIds
                        .Select(animeId => targetAnimeByMalId[animeId].AnimeTitle)
                        .Where(title => !string.IsNullOrWhiteSpace(title))
                        .Take(4)
                        .ToList(),
                    LibraryPreview = candidateEntries
                        .Where(entry => IsPositiveStatus(entry.Status))
                        .OrderByDescending(entry => entry.Score)
                        .ThenByDescending(entry => entry.Anime?.Score ?? 0)
                        .Take(6)
                        .Select(MapUserAnimeList)
                        .ToList()
                });

                foreach (var entry in candidateEntries)
                {
                    var anime = entry.Anime;
                    if (anime == null || targetAnimeByMalId.ContainsKey(anime.MalId) || !anime.Approved)
                    {
                        continue;
                    }

                    var candidateWeight = GetPreferenceWeight(entry.Status, entry.Score);
                    if (candidateWeight <= 0)
                    {
                        continue;
                    }

                    if (!recommendationAccumulator.TryGetValue(anime.MalId, out var candidateRecommendation))
                    {
                        candidateRecommendation = new RecommendationCandidate
                        {
                            AnimeId = anime.Id,
                            AnimeMalId = anime.MalId,
                            AnimeTitle = anime.Title ?? string.Empty,
                            AnimeImageUrl = anime.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                                ?? anime.Images.FirstOrDefault()?.ImageUrl,
                            AnimeType = anime.Type,
                            AnimeScore = anime.Score,
                            Rank = anime.Rank,
                            Popularity = anime.Popularity,
                            Tags = anime.AnimeGenres?
                                .Select(ag => ag.Genre)
                                .Where(g => g != null)
                                .Select(g => new UserAnimeTagDto
                                {
                                    MalId = g!.MalId,
                                    Name = g.Name ?? string.Empty,
                                    Type = g.Type ?? string.Empty
                                })
                                .ToList() ?? new List<UserAnimeTagDto>()
                        };

                        recommendationAccumulator.Add(anime.MalId, candidateRecommendation);
                    }

                    candidateRecommendation.Score += (similarity * 0.65) + (candidateWeight * 0.2) + NormalizeAnimeQuality(anime);
                    candidateRecommendation.ReasonUsernames.Add(candidate.Username);
                }
            }

            if (recommendationAccumulator.Count == 0)
            {
                foreach (var fallback in BuildTagFallbackRecommendations(allUsers, targetAnimeByMalId, targetAnimeList))
                {
                    recommendationAccumulator[fallback.AnimeMalId] = fallback;
                }
            }

            return new UserRecommendationsDto
            {
                Username = username,
                TotalAnime = targetAnimeList.Count,
                WatchedAnime = targetAnimeList.Count(item => IsPositiveStatus(item.Status)),
                SimilarUsers = similarUsers
                    .OrderByDescending(user => user.SimilarityScore)
                    .ThenByDescending(user => user.SharedAnimeCount)
                    .Take(6)
                    .ToList(),
                RecommendedAnime = recommendationAccumulator.Values
                    .OrderByDescending(item => item.Score)
                    .ThenByDescending(item => item.AnimeScore ?? 0)
                    .Take(12)
                    .Select(item => new RecommendedAnimeDto
                    {
                        AnimeId = item.AnimeId,
                        AnimeMalId = item.AnimeMalId,
                        AnimeTitle = item.AnimeTitle,
                        AnimeImageUrl = item.AnimeImageUrl,
                        AnimeType = item.AnimeType,
                        AnimeScore = item.AnimeScore,
                        Rank = item.Rank,
                        Popularity = item.Popularity,
                        RecommendationScore = Math.Round(item.Score, 3),
                        ReasonUsernames = item.ReasonUsernames
                            .Distinct(StringComparer.OrdinalIgnoreCase)
                            .Take(3)
                            .ToList(),
                        Tags = item.Tags
                    })
                    .ToList()
            };
        }

        private static IEnumerable<RecommendationCandidate> BuildTagFallbackRecommendations(
            IEnumerable<User> allUsers,
            IReadOnlyDictionary<int, UserAnimeListDTO> targetAnimeByMalId,
            IReadOnlyCollection<UserAnimeListDTO> targetAnimeList)
        {
            var tagWeights = targetAnimeList
                .Where(item => IsPositiveStatus(item.Status))
                .SelectMany(item => (item.Tags ?? new List<UserAnimeTagDto>())
                    .Select(tag => new
                    {
                        Key = $"{normalizeTagType(tag.Type)}:{tag.MalId}",
                        Weight = Math.Max(0.2, GetPreferenceWeight(item.Status, item.Score))
                    }))
                .GroupBy(item => item.Key)
                .ToDictionary(group => group.Key, group => group.Sum(x => x.Weight));

            if (tagWeights.Count == 0)
            {
                yield break;
            }

            var candidates = allUsers
                .SelectMany(user => user.AnimeList)
                .Where(entry => entry.Anime != null && entry.Anime.MalId > 0 && entry.Anime.Approved)
                .GroupBy(entry => entry.Anime!.MalId)
                .Select(group => group.First())
                .Where(entry => !targetAnimeByMalId.ContainsKey(entry.Anime!.MalId));

            foreach (var entry in candidates)
            {
                var anime = entry.Anime!;
                var tags = anime.AnimeGenres?
                    .Select(ag => ag.Genre)
                    .Where(g => g != null)
                    .Select(g => new UserAnimeTagDto
                    {
                        MalId = g!.MalId,
                        Name = g.Name ?? string.Empty,
                        Type = g.Type ?? string.Empty
                    })
                    .ToList() ?? new List<UserAnimeTagDto>();

                var tagScore = tags.Sum(tag =>
                {
                    var key = $"{normalizeTagType(tag.Type)}:{tag.MalId}";
                    return tagWeights.TryGetValue(key, out var value) ? value : 0;
                });

                if (tagScore <= 0)
                {
                    continue;
                }

                yield return new RecommendationCandidate
                {
                    AnimeId = anime.Id,
                    AnimeMalId = anime.MalId,
                    AnimeTitle = anime.Title ?? string.Empty,
                    AnimeImageUrl = anime.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                        ?? anime.Images.FirstOrDefault()?.ImageUrl,
                    AnimeType = anime.Type,
                    AnimeScore = anime.Score,
                    Rank = anime.Rank,
                    Popularity = anime.Popularity,
                    Score = NormalizeAnimeQuality(anime) + (tagScore * 0.08),
                    ReasonUsernames = new List<string> { "Tag match" },
                    Tags = tags
                };
            }
        }

        private static string normalizeTagType(string? type)
        {
            return string.Equals(type, "explicit_genre", StringComparison.OrdinalIgnoreCase) ? "genre" : (type ?? "genre");
        }

        private static UserAnimeListDTO MapUserAnimeList(UserAnimeList entry)
        {
            return new UserAnimeListDTO
            {
                AnimeId = entry.AnimeId,
                AnimeMalId = entry.Anime?.MalId ?? 0,
                AnimeTitle = entry.Anime?.Title ?? string.Empty,
                AnimeImageUrl = entry.Anime?.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                    ?? entry.Anime?.Images.FirstOrDefault()?.ImageUrl,
                AnimeType = entry.Anime?.Type,
                AnimeScore = entry.Anime?.Score,
                Episodes = entry.Anime?.Episodes,
                Duration = entry.Anime?.Duration,
                Status = entry.Status,
                Score = entry.Score,
                Tags = entry.Anime?.AnimeGenres?
                    .Select(ag => ag.Genre)
                    .Where(g => g != null)
                    .Select(g => new UserAnimeTagDto
                    {
                        MalId = g!.MalId,
                        Name = g.Name ?? string.Empty,
                        Type = g.Type ?? string.Empty
                    })
                    .ToList() ?? new List<UserAnimeTagDto>(),
                Studios = entry.Anime?.AnimeStudios?
                    .Select(s => s.Studio?.Name)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Cast<string>()
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList() ?? new List<string>()
            };
        }

        private static double GetPreferenceWeight(string? status, int score)
        {
            var statusWeight = status?.Trim() switch
            {
                "Completed" => 1.0,
                "Watching" => 0.8,
                "Plan to Watch" => 0.45,
                "Dropped" => -0.35,
                _ => 0.2
            };

            var scoreWeight = score > 0 ? ((score - 5) / 5.0) * 0.35 : 0;
            return statusWeight + scoreWeight;
        }

        private static bool IsPositiveStatus(string? status)
        {
            return string.Equals(status, "Completed", StringComparison.OrdinalIgnoreCase)
                || string.Equals(status, "Watching", StringComparison.OrdinalIgnoreCase);
        }

        private static double ComputeCosineSimilarity(
            IReadOnlyDictionary<int, double> left,
            IReadOnlyDictionary<int, double> right)
        {
            var sharedKeys = left.Keys.Intersect(right.Keys).ToList();
            if (sharedKeys.Count == 0)
            {
                return 0;
            }

            var dot = sharedKeys.Sum(key => left[key] * right[key]);
            var leftNorm = Math.Sqrt(left.Values.Sum(value => value * value));
            var rightNorm = Math.Sqrt(right.Values.Sum(value => value * value));

            if (leftNorm == 0 || rightNorm == 0)
            {
                return 0;
            }

            return Math.Max(0, dot / (leftNorm * rightNorm));
        }

        private static double NormalizeAnimeQuality(Anime anime)
        {
            var scoreBoost = anime.Score.HasValue
                ? Math.Clamp((anime.Score.Value - 7.0) / 5.0, 0, 0.25)
                : 0;
            var rankBoost = anime.Rank.HasValue && anime.Rank > 0
                ? Math.Clamp((500.0 - Math.Min(anime.Rank.Value, 500)) / 2500.0, 0, 0.2)
                : 0;

            return scoreBoost + rankBoost;
        }

        private sealed class RecommendationCandidate
        {
            public int AnimeId { get; set; }
            public int AnimeMalId { get; set; }
            public string AnimeTitle { get; set; } = string.Empty;
            public string? AnimeImageUrl { get; set; }
            public string? AnimeType { get; set; }
            public double? AnimeScore { get; set; }
            public int? Rank { get; set; }
            public int? Popularity { get; set; }
            public double Score { get; set; }
            public List<string> ReasonUsernames { get; set; } = new();
            public List<UserAnimeTagDto> Tags { get; set; } = new();
        }
    }
}
