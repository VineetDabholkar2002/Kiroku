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
        public string AnimeTitle { get; set; } = string.Empty;
        public string Status { get; set; } = "Plan to Watch";
        public int Score { get; set; } = 0;
    }
}
