namespace Kiroku.Application.DTOs
{
    public class UserDTO
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? ProfilePicture { get; set; }
    }

    public class UserAnimeListDTO
    {
        public int AnimeId { get; set; }
        public int AnimeMalId { get; set; }
        public string AnimeTitle { get; set; } = string.Empty;
        public string? AnimeImageUrl { get; set; }
        public string? AnimeType { get; set; }
        public double? AnimeScore { get; set; }
        public string Status { get; set; } = "Plan to Watch";
        public int Score { get; set; } = 0;
        public List<UserAnimeTagDto> Tags { get; set; } = new();
    }

    public class UserAnimeTagDto
    {
        public int MalId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }

    public class UserRecommendationsDto
    {
        public string Username { get; set; } = string.Empty;
        public int TotalAnime { get; set; }
        public int WatchedAnime { get; set; }
        public List<SimilarUserDto> SimilarUsers { get; set; } = new();
        public List<RecommendedAnimeDto> RecommendedAnime { get; set; } = new();
    }

    public class SimilarUserDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfilePicture { get; set; }
        public double SimilarityScore { get; set; }
        public int SharedAnimeCount { get; set; }
        public int SharedCompletedCount { get; set; }
        public List<string> TopSharedTitles { get; set; } = new();
        public List<UserAnimeListDTO> LibraryPreview { get; set; } = new();
    }

    public class RecommendedAnimeDto
    {
        public int AnimeId { get; set; }
        public int AnimeMalId { get; set; }
        public string AnimeTitle { get; set; } = string.Empty;
        public string? AnimeImageUrl { get; set; }
        public string? AnimeType { get; set; }
        public double? AnimeScore { get; set; }
        public int? Rank { get; set; }
        public int? Popularity { get; set; }
        public double RecommendationScore { get; set; }
        public List<string> ReasonUsernames { get; set; } = new();
        public List<UserAnimeTagDto> Tags { get; set; } = new();
    }
}
