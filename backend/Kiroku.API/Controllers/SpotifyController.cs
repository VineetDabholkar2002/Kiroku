using Kiroku.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System.Net.Http.Headers;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class SpotifyController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly ICacheService _cache;

        public SpotifyController(IHttpClientFactory httpClientFactory, ICacheService cache)
        {
            _httpClient = httpClientFactory.CreateClient();
            _cache = cache;
        }

        /// <summary>
        /// Search for a track using the USER'S own Spotify access token.
        /// The token is passed as a Bearer token in the Authorization header —
        /// it never touches our server credentials.
        /// Results are cached by query so repeated searches hit Redis, not Spotify.
        /// </summary>
        [HttpGet("song")]
        public async Task<IActionResult> SearchSong(
            [FromQuery] string name,
            [FromQuery] string? artist = null)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { message = "Song name is required." });

            // Extract the user's Bearer token from the incoming request header
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { message = "Spotify access token required. Please connect your Spotify account." });

            var userToken = authHeader["Bearer ".Length..].Trim();

            // Cache key — scoped to the query, not the user, because search results
            // are the same for everyone. This dramatically reduces Spotify API calls.
            var cacheKey = $"spotify:search:{name.ToLower()}:{artist?.ToLower() ?? ""}";

            var cached = await _cache.GetAsync<object>(cacheKey);
            if (cached != null)
                return Ok(cached);

            try
            {
                var q = !string.IsNullOrWhiteSpace(artist)
                    ? $"track:{name} artist:{artist}"
                    : $"track:{name}";

                var uri = $"https://api.spotify.com/v1/search" +
                          $"?q={Uri.EscapeDataString(q)}&type=track&limit=1";

                using var req = new HttpRequestMessage(HttpMethod.Get, uri);
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

                var response = await _httpClient.SendAsync(req);
                var body = await response.Content.ReadAsStringAsync();

                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                    return Unauthorized(new { message = "Spotify token expired. Please reconnect." });

                if (!response.IsSuccessStatusCode)
                    return StatusCode((int)response.StatusCode,
                        new { message = "Spotify search failed.", detail = body });

                var json = JObject.Parse(body);
                var items = json["tracks"]?["items"];

                if (items == null || !items.HasValues)
                    return Ok(new { tracks = Array.Empty<object>() });

                var tracks = items.Select(item => new
                {
                    id = item["id"]?.ToString(),
                    name = item["name"]?.ToString(),
                    uri = item["uri"]?.ToString(),
                    artists = item["artists"]?.Select(a => a["name"]?.ToString()).ToArray(),
                    albumName = item["album"]?["name"]?.ToString(),
                    albumImages = item["album"]?["images"]?.Select(img => new
                    {
                        url = img["url"]?.ToString(),
                        width = img["width"]?.ToObject<int>(),
                        height = img["height"]?.ToObject<int>(),
                    }).ToList(),
                    spotifyUrl = item["external_urls"]?["spotify"]?.ToString(),
                    durationMs = item["duration_ms"]?.ToObject<int>() ?? 0,
                    isPlayable = item["is_playable"]?.ToObject<bool>() ?? false,
                });

                var result = new { tracks };

                await _cache.SetAsync(cacheKey, result, TimeSpan.FromHours(24));

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Spotify search failed.", error = ex.Message });
            }
        }
    }
}