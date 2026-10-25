using System.Collections.Generic;

namespace Kiroku.Application.DTOs
{
    public class CreateSpotifyPlaylistRequest
    {
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public List<PlaylistSongDto> Songs { get; set; } = new();
    }

    public class CreateCustomPlaylistRequest
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }

    public class SpotifyCallbackRequest
    {
        public string Code { get; set; } = "";
        public string State { get; set; } = "";
        public string? RedirectUri { get; set; }
    }

    public class RefreshRequest
    {
        public string SessionId { get; set; } = "";
    }

    public class AddTracksToPlaylistRequest
    {
        public List<string>? Uris { get; set; }
        public List<PlaylistSongDto>? Songs { get; set; }
    }

    public class SpotifyUserPlaylistDto
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public string? ImageUrl { get; set; }
        public int TotalTracks { get; set; }
        public string ExternalUrl { get; set; } = "";
    }

    public class SpotifyPlaylistTrackDto
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Artist { get; set; } = "";
        public string Uri { get; set; } = "";
        public string? ImageUrl { get; set; }
        public int DurationMs { get; set; }
    }
}
