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

    // Jikan themes responses (if still needed for legacy fallback or parsing)
    public class JikanThemesResponse
    {
        public ThemeData Data { get; set; } = new();
    }
    public class ThemeData
    {
        public List<string>? Openings { get; set; }
        public List<string>? Endings { get; set; }
    }
    public class JikanThemesData
    {
        public List<string> Openings { get; set; } = new();
        public List<string> Endings { get; set; } = new();
    }
}
