using Kiroku.Application.DTOs;
using Kiroku.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System.Net.Http.Headers;
using System.Text;

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

        [HttpPost("playlist")]
        public async Task<IActionResult> CreatePlaylist([FromBody] CreateSpotifyPlaylistRequest request)
        {
            if (request.Songs == null || request.Songs.Count == 0)
                return BadRequest(new { message = "At least one song is required." });

            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { message = "Spotify access token required. Please connect your Spotify account." });

            var userToken = authHeader["Bearer ".Length..].Trim();

            try
            {
                using var meReq = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me");
                meReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

                var meResponse = await _httpClient.SendAsync(meReq);
                var meBody = await meResponse.Content.ReadAsStringAsync();
                if (!meResponse.IsSuccessStatusCode)
                    return StatusCode((int)meResponse.StatusCode, new { message = "Failed to fetch Spotify user profile.", detail = meBody });

                var meJson = JObject.Parse(meBody);
                var spotifyUserId = meJson["id"]?.ToString();
                if (string.IsNullOrWhiteSpace(spotifyUserId))
                    return BadRequest(new { message = "Spotify user id not found." });

                var playlistPayload = new
                {
                    name = string.IsNullOrWhiteSpace(request.Name) ? "Kiroku Playlist" : request.Name,
                    description = string.IsNullOrWhiteSpace(request.Description)
                        ? "Created from Kiroku anime soundtrack results."
                        : request.Description,
                    @public = false
                };

                using var createReq = new HttpRequestMessage(HttpMethod.Post, $"https://api.spotify.com/v1/users/{spotifyUserId}/playlists");
                createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);
                createReq.Content = new StringContent(
                    System.Text.Json.JsonSerializer.Serialize(playlistPayload),
                    Encoding.UTF8,
                    "application/json");

                var createResponse = await _httpClient.SendAsync(createReq);
                var createBody = await createResponse.Content.ReadAsStringAsync();
                if (!createResponse.IsSuccessStatusCode)
                    return StatusCode((int)createResponse.StatusCode, new { message = "Failed to create Spotify playlist.", detail = createBody });

                var createdPlaylist = JObject.Parse(createBody);
                var playlistId = createdPlaylist["id"]?.ToString();
                var playlistUrl = createdPlaylist["external_urls"]?["spotify"]?.ToString();

                var uris = new List<string>();
                foreach (var song in request.Songs)
                {
                    if (string.IsNullOrWhiteSpace(song.Name))
                        continue;

                    var q = !string.IsNullOrWhiteSpace(song.Artist)
                        ? $"track:{song.Name} artist:{song.Artist}"
                        : $"track:{song.Name}";

                    var uri = $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(q)}&type=track&limit=1";

                    using var searchReq = new HttpRequestMessage(HttpMethod.Get, uri);
                    searchReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

                    var searchResponse = await _httpClient.SendAsync(searchReq);
                    if (!searchResponse.IsSuccessStatusCode)
                        continue;

                    var searchBody = await searchResponse.Content.ReadAsStringAsync();
                    var searchJson = JObject.Parse(searchBody);
                    var firstTrack = searchJson["tracks"]?["items"]?.FirstOrDefault();
                    var trackUri = firstTrack?["uri"]?.ToString();
                    if (!string.IsNullOrWhiteSpace(trackUri))
                        uris.Add(trackUri);
                }

                if (uris.Count == 0)
                {
                    return Ok(new
                    {
                        playlistId,
                        playlistUrl,
                        addedCount = 0,
                        message = "Playlist created, but no Spotify tracks could be matched."
                    });
                }

                foreach (var batch in uris.Chunk(100))
                {
                    using var addReq = new HttpRequestMessage(HttpMethod.Post, $"https://api.spotify.com/v1/playlists/{playlistId}/tracks");
                    addReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);
                    addReq.Content = new StringContent(
                        System.Text.Json.JsonSerializer.Serialize(new { uris = batch }),
                        Encoding.UTF8,
                        "application/json");

                    var addResponse = await _httpClient.SendAsync(addReq);
                    var addBody = await addResponse.Content.ReadAsStringAsync();
                    if (!addResponse.IsSuccessStatusCode)
                        return StatusCode((int)addResponse.StatusCode, new { message = "Failed to add tracks to Spotify playlist.", detail = addBody });
                }

                return Ok(new
                {
                    playlistId,
                    playlistUrl,
                    addedCount = uris.Count,
                    message = "Spotify playlist created successfully."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Spotify playlist creation failed.", error = ex.Message });
            }
        }

        [HttpPost("playlist-stream")]
        public async Task StreamCreatePlaylist([FromBody] CreateSpotifyPlaylistRequest request)
        {
            Response.StatusCode = 200;
            Response.ContentType = "text/event-stream";

            async Task WriteEventAsync(string eventName, object payload)
            {
                var json = System.Text.Json.JsonSerializer.Serialize(payload);
                await Response.WriteAsync($"event: {eventName}\n");
                await Response.WriteAsync($"data: {json}\n\n");
                await Response.Body.FlushAsync();
            }

            if (request.Songs == null || request.Songs.Count == 0)
            {
                await WriteEventAsync("error", new { message = "At least one song is required." });
                return;
            }

            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                await WriteEventAsync("error", new { message = "Spotify access token required. Please connect your Spotify account.", status = 401 });
                return;
            }

            var userToken = authHeader["Bearer ".Length..].Trim();

            try
            {
                var searchableSongs = request.Songs.Where(s => !string.IsNullOrWhiteSpace(s.Name)).ToList();
                var totalSteps = Math.Max(1, searchableSongs.Count + (int)Math.Ceiling(searchableSongs.Count / 100d) + 1);
                var completedSteps = 0;

                await WriteEventAsync("progress", new
                {
                    percent = 0,
                    message = "Creating Spotify playlist..."
                });

                using var meReq = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me");
                meReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

                var meResponse = await _httpClient.SendAsync(meReq);
                var meBody = await meResponse.Content.ReadAsStringAsync();
                if (!meResponse.IsSuccessStatusCode)
                {
                    await WriteEventAsync("error", new { message = "Failed to fetch Spotify user profile.", detail = meBody, status = (int)meResponse.StatusCode });
                    return;
                }

                var meJson = JObject.Parse(meBody);
                var spotifyUserId = meJson["id"]?.ToString();
                if (string.IsNullOrWhiteSpace(spotifyUserId))
                {
                    await WriteEventAsync("error", new { message = "Spotify user id not found." });
                    return;
                }

                var playlistPayload = new
                {
                    name = string.IsNullOrWhiteSpace(request.Name) ? "Kiroku Playlist" : request.Name,
                    description = string.IsNullOrWhiteSpace(request.Description)
                        ? "Created from Kiroku anime soundtrack results."
                        : request.Description,
                    @public = false
                };

                using var createReq = new HttpRequestMessage(HttpMethod.Post, $"https://api.spotify.com/v1/users/{spotifyUserId}/playlists");
                createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);
                createReq.Content = new StringContent(
                    System.Text.Json.JsonSerializer.Serialize(playlistPayload),
                    Encoding.UTF8,
                    "application/json");

                var createResponse = await _httpClient.SendAsync(createReq);
                var createBody = await createResponse.Content.ReadAsStringAsync();
                if (!createResponse.IsSuccessStatusCode)
                {
                    await WriteEventAsync("error", new { message = "Failed to create Spotify playlist.", detail = createBody, status = (int)createResponse.StatusCode });
                    return;
                }

                completedSteps++;
                var createdPlaylist = JObject.Parse(createBody);
                var playlistId = createdPlaylist["id"]?.ToString();
                var playlistUrl = createdPlaylist["external_urls"]?["spotify"]?.ToString();

                await WriteEventAsync("progress", new
                {
                    percent = (int)Math.Min(100, Math.Round(completedSteps * 100d / totalSteps)),
                    message = "Playlist created. Matching tracks..."
                });

                var uris = new List<string>();
                for (var i = 0; i < searchableSongs.Count; i++)
                {
                    var song = searchableSongs[i];
                    var q = !string.IsNullOrWhiteSpace(song.Artist)
                        ? $"track:{song.Name} artist:{song.Artist}"
                        : $"track:{song.Name}";

                    var uri = $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(q)}&type=track&limit=1";

                    using var searchReq = new HttpRequestMessage(HttpMethod.Get, uri);
                    searchReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

                    var searchResponse = await _httpClient.SendAsync(searchReq);
                    if (searchResponse.IsSuccessStatusCode)
                    {
                        var searchBody = await searchResponse.Content.ReadAsStringAsync();
                        var searchJson = JObject.Parse(searchBody);
                        var firstTrack = searchJson["tracks"]?["items"]?.FirstOrDefault();
                        var trackUri = firstTrack?["uri"]?.ToString();
                        if (!string.IsNullOrWhiteSpace(trackUri))
                            uris.Add(trackUri);
                    }

                    completedSteps++;
                    await WriteEventAsync("progress", new
                    {
                        percent = (int)Math.Min(100, Math.Round(completedSteps * 100d / totalSteps)),
                        message = $"Matching tracks... {i + 1}/{searchableSongs.Count}",
                        matchedCount = uris.Count
                    });
                }

                if (uris.Count == 0)
                {
                    await WriteEventAsync("complete", new
                    {
                        playlistId,
                        playlistUrl,
                        addedCount = 0,
                        message = "Playlist created, but no Spotify tracks could be matched."
                    });
                    return;
                }

                var uriBatches = uris.Chunk(100).ToList();
                for (var batchIndex = 0; batchIndex < uriBatches.Count; batchIndex++)
                {
                    var batch = uriBatches[batchIndex];
                    using var addReq = new HttpRequestMessage(HttpMethod.Post, $"https://api.spotify.com/v1/playlists/{playlistId}/tracks");
                    addReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);
                    addReq.Content = new StringContent(
                        System.Text.Json.JsonSerializer.Serialize(new { uris = batch }),
                        Encoding.UTF8,
                        "application/json");

                    var addResponse = await _httpClient.SendAsync(addReq);
                    var addBody = await addResponse.Content.ReadAsStringAsync();
                    if (!addResponse.IsSuccessStatusCode)
                    {
                        await WriteEventAsync("error", new { message = "Failed to add tracks to Spotify playlist.", detail = addBody, status = (int)addResponse.StatusCode });
                        return;
                    }

                    completedSteps++;
                    await WriteEventAsync("progress", new
                    {
                        percent = (int)Math.Min(100, Math.Round(completedSteps * 100d / totalSteps)),
                        message = $"Adding tracks to playlist... {batchIndex + 1}/{uriBatches.Count}"
                    });
                }

                await WriteEventAsync("complete", new
                {
                    playlistId,
                    playlistUrl,
                    addedCount = uris.Count,
                    message = "Spotify playlist created successfully."
                });
            }
            catch (Exception ex)
            {
                await WriteEventAsync("error", new { message = "Spotify playlist creation failed.", error = ex.Message });
            }
        }

        /// <summary>
        /// Search for a track using the USER'S own Spotify access token.
        /// The token is passed as a Bearer token in the Authorization header.
        /// Results are cached by query so repeated searches hit Redis, not Spotify.
        /// </summary>
        [HttpGet("song")]
        public async Task<IActionResult> SearchSong(
            [FromQuery] string name,
            [FromQuery] string? artist = null)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { message = "Song name is required." });

            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { message = "Spotify access token required. Please connect your Spotify account." });

            var userToken = authHeader["Bearer ".Length..].Trim();
            var cacheKey = $"spotify:search:{name.ToLower()}:{artist?.ToLower() ?? ""}";

            var cached = await _cache.GetAsync<object>(cacheKey);
            if (cached != null)
                return Ok(cached);

            try
            {
                var q = !string.IsNullOrWhiteSpace(artist)
                    ? $"track:{name} artist:{artist}"
                    : $"track:{name}";

                var uri = $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(q)}&type=track&limit=1";

                using var req = new HttpRequestMessage(HttpMethod.Get, uri);
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

                var response = await _httpClient.SendAsync(req);
                var body = await response.Content.ReadAsStringAsync();

                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                    return Unauthorized(new { message = "Spotify token expired. Please reconnect." });

                if (!response.IsSuccessStatusCode)
                    return StatusCode((int)response.StatusCode, new { message = "Spotify search failed.", detail = body });

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

    public class CreateSpotifyPlaylistRequest
    {
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public List<PlaylistSongDto> Songs { get; set; } = new();
    }
}
