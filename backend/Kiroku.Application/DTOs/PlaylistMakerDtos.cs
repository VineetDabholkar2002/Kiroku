namespace Kiroku.Application.DTOs
{
    public class SpotifyTrackDto
    {
        public string Name { get; set; } = "";
        public string Artist { get; set; } = "";
        public string Uri { get; set; } = ""; 
        public string AlbumImageUrl { get; set; } = ""; 
    }

    public class PlaylistSongDto
    {
        public string AnimeTitle { get; set; } = "";
        public string Name { get; set; } = "";
        public string Artist { get; set; } = "";
        public string? Image { get; set; }
        public string Status { get; set; } = "";
    }

    public class UserSuggestionDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = "";
        public string? ProfilePicture { get; set; }
    }
}
