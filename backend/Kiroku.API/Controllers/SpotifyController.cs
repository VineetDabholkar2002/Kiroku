using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Kiroku.Infrastructure.Services; // Namespace where your SpotifyService lives

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class SpotifyController : ControllerBase
    {
        private readonly SpotifyService _spotifyService;

        public SpotifyController(SpotifyService spotifyService)
        {
            _spotifyService = spotifyService;
        }

        /// <summary>
        /// Search for a track on Spotify by name and optional artist.
        /// </summary>
        /// <param name="name">Track name</param>
        /// <param name="artist">Artist name (optional)</param>
[HttpGet("song")]
public async Task<IActionResult> SearchSong([FromQuery] string name, [FromQuery] string? artist = null)
{
    if (string.IsNullOrWhiteSpace(name))
        return BadRequest(new { message = "Song name is required" });

    try
    {
        // Call the service that fetches from Spotify
        var searchResponse = await _spotifyService.SearchTrackAsync(name, artist);

        // Extract track items
        var items = searchResponse["tracks"]?["items"];
        if (items == null || !items.HasValues)
        {
            return Ok(new { tracks = Array.Empty<object>() });
        }

        // Flatten to a DTO-like format for the frontend
        var tracks = items.Select(item => new
        {
            id = item["id"]?.ToString(),
            name = item["name"]?.ToString(),
            uri = item["uri"]?.ToString(),
            artists = item["artists"]?.Select(a => a["name"]?.ToString()).ToArray(),
            albumName = item["album"]?["name"]?.ToString(),
            albumImages = item["album"]?["images"]?.Select(img => new {
                url = img["url"]?.ToString(),
                width = img["width"]?.ToObject<int>(),
                height = img["height"]?.ToObject<int>()
            }).ToList(),
            spotifyUrl = item["external_urls"]?["spotify"]?.ToString(),
            durationMs = item["duration_ms"]?.ToObject<int>() ?? 0,
            isPlayable = item["is_playable"]?.ToObject<bool>() ?? false
        });

        return Ok(new { tracks });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { message = "Spotify search failed", error = ex.Message });
    }
}

        /// <summary>
        /// Get a playlist by Spotify ID (optional extra feature)
        /// </summary>
        // [HttpGet("playlist/{playlistId}")]
        // public async Task<IActionResult> GetPlaylist(string playlistId)
        // {
        //     if (string.IsNullOrWhiteSpace(playlistId))
        //         return BadRequest(new { message = "Playlist ID is required" });

        //     try
        //     {
        //         var playlist = await _spotifyService.GetPlaylistAsync(playlistId);
        //         return Ok(playlist);
        //     }
        //     catch (System.Exception ex)
        //     {
        //         return StatusCode(500, new { message = "Could not fetch playlist", error = ex.Message });
        //     }
        // }
    }
}
