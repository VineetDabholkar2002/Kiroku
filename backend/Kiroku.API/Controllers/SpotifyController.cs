using Kiroku.Application.DTOs;
using Kiroku.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System.Net.Http.Headers;
using System.Text;
using System.Text.RegularExpressions;
using Kiroku.Application.Interfaces;
using Kiroku.Infrastructure.Services;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class SpotifyController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly ICacheService _cache;
        private readonly ISpotifyService _spotifyService;
        private readonly ILogger<SpotifyController> _logger;

        public SpotifyController(
            IHttpClientFactory httpClientFactory,
            ICacheService cache,
            ISpotifyService spotifyService,
            ILogger<SpotifyController> logger)
        {
            _httpClient = httpClientFactory.CreateClient();
            _cache = cache;
            _spotifyService = spotifyService;
            _logger = logger;
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
            _logger.LogInformation("Creating Spotify playlist '{Name}' with {Count} songs", request.Name, request.Songs.Count);

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

                    var trackUri = await ResolveSpotifyTrackUriAsync(userToken, song.Name, song.Artist, song.AnimeTitle);
                    if (!string.IsNullOrWhiteSpace(trackUri) && !uris.Contains(trackUri))
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
                    var trackUri = await ResolveSpotifyTrackUriAsync(userToken, song.Name, song.Artist, song.AnimeTitle);
                    if (!string.IsNullOrWhiteSpace(trackUri) && !uris.Contains(trackUri))
                        uris.Add(trackUri);

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
        /// Search for a track using the APP'S own Client Credentials token.
        /// Results are cached by query so repeated searches hit Redis, not Spotify.
        /// </summary>
        [HttpGet("song")]
        public async Task<IActionResult> SearchSong(
            [FromQuery] string name,
            [FromQuery] string? artist = null)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { message = "Song name is required." });

            _logger.LogInformation("Spotify song search requested for: '{Name}', artist: '{Artist}'", name, artist);
            var cacheKey = $"spotify:search:{name.ToLower()}:{artist?.ToLower() ?? ""}";

            var cached = await _cache.GetAsync<JObject>(cacheKey);
            if (cached != null)
            {
                _logger.LogDebug("Spotify song search cache HIT for key: {CacheKey}", cacheKey);
                return Content(cached.ToString(Newtonsoft.Json.Formatting.None), "application/json");
            }

            try
            {
                var json = await _spotifyService.SearchTrackAsync(name, artist);
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
                _logger.LogError(ex, "Spotify search failed for song '{Name}', artist '{Artist}'", name, artist);
                return StatusCode(500, new { message = "Spotify search failed.", error = ex.Message });
            }
        }

        [HttpPost("create-playlist")]
        public async Task<IActionResult> CreateCustomPlaylist([FromBody] CreateCustomPlaylistRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Name))
                return BadRequest(new { message = "Playlist name is required." });

            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { message = "Spotify access token required. Please connect your Spotify account." });

            var userToken = authHeader["Bearer ".Length..].Trim();
            _logger.LogInformation("Creating custom Spotify playlist '{Name}'", request.Name);

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
                    name = request.Name.Trim(),
                    description = string.IsNullOrWhiteSpace(request.Description)
                        ? "Created with Kiroku."
                        : request.Description.Trim(),
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
                var playlistId = createdPlaylist["id"]?.ToString() ?? "";
                var playlistUrl = createdPlaylist["external_urls"]?["spotify"]?.ToString() ?? "";
                var playlistName = createdPlaylist["name"]?.ToString() ?? request.Name;

                var result = new SpotifyUserPlaylistDto
                {
                    Id = playlistId,
                    Name = playlistName,
                    Description = request.Description ?? "",
                    ExternalUrl = playlistUrl,
                    TotalTracks = 0,
                    ImageUrl = null
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating Spotify playlist '{Name}'", request.Name);
                return StatusCode(500, new { message = "Failed to create Spotify playlist.", error = ex.Message });
            }
        }

        [HttpGet("user-playlists")]
        public async Task<IActionResult> GetUserPlaylists()
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { message = "Spotify access token required. Please connect your Spotify account." });

            var userToken = authHeader["Bearer ".Length..].Trim();
            _logger.LogInformation("Fetching Spotify user playlists");

            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me/playlists?limit=50");
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

                var res = await _httpClient.SendAsync(req);
                var body = await res.Content.ReadAsStringAsync();
                if (!res.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to fetch user playlists: {Status} {Body}", res.StatusCode, body);
                    return StatusCode((int)res.StatusCode, new { message = "Failed to fetch Spotify playlists.", detail = body });
                }

                var json = JObject.Parse(body);
                var items = json["items"] as JArray;
                if (items == null)
                    return Ok(new List<SpotifyUserPlaylistDto>());

                var playlists = items.Select(p => new SpotifyUserPlaylistDto
                {
                    Id = p["id"]?.ToString() ?? "",
                    Name = p["name"]?.ToString() ?? "Untitled Playlist",
                    Description = p["description"]?.ToString() ?? "",
                    ImageUrl = p["images"]?.FirstOrDefault()?["url"]?.ToString(),
                    TotalTracks = p["tracks"]?["total"]?.ToObject<int>() ?? 0,
                    ExternalUrl = p["external_urls"]?["spotify"]?.ToString() ?? ""
                }).ToList();

                return Ok(playlists);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user Spotify playlists");
                return StatusCode(500, new { message = "Error fetching user playlists.", error = ex.Message });
            }
        }

        [HttpGet("playlist/{playlistId}/tracks")]
        public async Task<IActionResult> GetPlaylistTracks(string playlistId)
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { message = "Spotify access token required. Please connect your Spotify account." });

            var userToken = authHeader["Bearer ".Length..].Trim();
            _logger.LogInformation("Fetching tracks for Spotify playlist '{PlaylistId}'", playlistId);

            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, $"https://api.spotify.com/v1/playlists/{playlistId}/tracks?limit=100");
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

                var res = await _httpClient.SendAsync(req);
                var body = await res.Content.ReadAsStringAsync();
                if (!res.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to fetch playlist tracks: {Status} {Body}", res.StatusCode, body);
                    return StatusCode((int)res.StatusCode, new { message = "Failed to fetch playlist tracks.", detail = body });
                }

                var json = JObject.Parse(body);
                var items = json["items"] as JArray;
                var tracks = new List<SpotifyPlaylistTrackDto>();

                if (items != null)
                {
                    foreach (var item in items)
                    {
                        var track = item["track"];
                        if (track == null || track.Type == JTokenType.Null) continue;

                        var artists = track["artists"]?.Select(a => a["name"]?.ToString()).Where(n => !string.IsNullOrEmpty(n));
                        tracks.Add(new SpotifyPlaylistTrackDto
                        {
                            Id = track["id"]?.ToString() ?? "",
                            Name = track["name"]?.ToString() ?? "",
                            Artist = artists != null ? string.Join(", ", artists) : "",
                            Uri = track["uri"]?.ToString() ?? "",
                            ImageUrl = track["album"]?["images"]?.FirstOrDefault()?["url"]?.ToString(),
                            DurationMs = track["duration_ms"]?.ToObject<int>() ?? 0
                        });
                    }
                }

                return Ok(new { playlistId, tracks });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching tracks for playlist '{PlaylistId}'", playlistId);
                return StatusCode(500, new { message = "Error fetching playlist tracks.", error = ex.Message });
            }
        }

        [HttpPost("playlist/{playlistId}/tracks")]
        public async Task<IActionResult> AddTracksToPlaylist(string playlistId, [FromBody] AddTracksToPlaylistRequest request)
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer "))
                return Unauthorized(new { message = "Spotify access token required. Please connect your Spotify account." });

            var userToken = authHeader["Bearer ".Length..].Trim();
            var uris = new List<string>(request.Uris ?? Enumerable.Empty<string>());

            // If songs are provided and need matching
            if (request.Songs != null && request.Songs.Count > 0)
            {
                foreach (var song in request.Songs)
                {
                    if (string.IsNullOrWhiteSpace(song.Name)) continue;

                    var trackUri = await ResolveSpotifyTrackUriAsync(userToken, song.Name, song.Artist, song.AnimeTitle);
                    if (!string.IsNullOrWhiteSpace(trackUri) && !uris.Contains(trackUri))
                    {
                        uris.Add(trackUri);
                    }
                }
            }

            if (uris.Count == 0)
            {
                return Ok(new
                {
                    success = false,
                    playlistId,
                    addedCount = 0,
                    message = "None of the selected songs could be matched on Spotify. Try searching by song or artist name directly in the Spotify tab."
                });
            }

            try
            {
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
                    {
                        _logger.LogWarning("Failed adding tracks to Spotify playlist {PlaylistId}: {Detail}", playlistId, addBody);
                        return StatusCode((int)addResponse.StatusCode, new { message = "Failed to add tracks to Spotify playlist.", detail = addBody });
                    }
                }

                _logger.LogInformation("Successfully added {Count} tracks to playlist '{PlaylistId}'", uris.Count, playlistId);
                var totalRequested = (request.Uris?.Count ?? 0) + (request.Songs?.Count ?? 0);
                var unassigned = totalRequested > uris.Count ? totalRequested - uris.Count : 0;
                var msg = unassigned > 0
                    ? $"Added {uris.Count} track(s) to playlist ({unassigned} song(s) could not be matched on Spotify)."
                    : $"Successfully added {uris.Count} song(s) to playlist.";

                return Ok(new
                {
                    success = true,
                    playlistId,
                    addedCount = uris.Count,
                    addedUris = uris,
                    message = msg
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding tracks to playlist '{PlaylistId}'", playlistId);
                return StatusCode(500, new { message = "Failed to add tracks to playlist.", error = ex.Message });
            }
        }

        private async Task<string?> ResolveSpotifyTrackUriAsync(string userToken, string rawName, string? rawArtist, string? rawAnimeTitle)
        {
            if (string.IsNullOrWhiteSpace(rawName)) return null;

            // 1. Clean track name
            var cleanName = Regex.Replace(rawName, @"\s*\((?:TV\s*Size|TV\s*Ver\.?|TV\s*Edit|Short\s*Ver\.?|Full\s*Ver\.?|Instrumental|Anime\s*Ver\.?|eps?\s*\d+.*?|ep\s*\d+.*?)\)", "", RegexOptions.IgnoreCase);
            cleanName = Regex.Replace(cleanName, @"^(?:#?\d+[:\.]\s*|(?:OP|ED)\s*\d*[:\.\s]\s*)", "", RegexOptions.IgnoreCase);
            cleanName = cleanName.Replace("\"", "").Replace("'", "").Replace("*", "").Replace("〜", " ").Replace("~", " ").Replace("「", "").Replace("」", "").Replace("『", "").Replace("』", "");
            cleanName = Regex.Replace(cleanName, @"\s+", " ").Trim();

            if (string.IsNullOrWhiteSpace(cleanName))
                cleanName = rawName.Trim(' ', '"', '\'', '*', '〜', '~');

            // 2. Clean artist
            var cleanArtist = string.Empty;
            if (!string.IsNullOrWhiteSpace(rawArtist))
            {
                cleanArtist = Regex.Replace(rawArtist, @"\s*\((?:eps?\s*\d+.*?|ep\s*\d+.*?|CV[\.:].*?)\)", "", RegexOptions.IgnoreCase);
                cleanArtist = cleanArtist.Replace("\"", "").Replace("'", "").Replace("*", "").Replace("〜", " ").Replace("~", " ");
                cleanArtist = Regex.Replace(cleanArtist, @"\s+", " ").Trim();
            }

            var queries = new List<string>();

            if (!string.IsNullOrWhiteSpace(cleanArtist))
            {
                queries.Add($"track:{cleanName} artist:{cleanArtist}");
                queries.Add($"{cleanName} {cleanArtist}");
            }

            if (!string.IsNullOrWhiteSpace(rawAnimeTitle))
            {
                var cleanAnime = Regex.Replace(rawAnimeTitle, @"\s*\((?:TV|Movie|OVA|ONA|Season\s*\d+).*?\)", "", RegexOptions.IgnoreCase).Trim();
                if (!string.IsNullOrWhiteSpace(cleanAnime))
                {
                    queries.Add($"{cleanName} {cleanAnime}");
                }
            }

            queries.Add(cleanName);

            foreach (var q in queries.Distinct())
            {
                if (string.IsNullOrWhiteSpace(q)) continue;

                try
                {
                    var searchUri = $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(q)}&type=track&limit=1";
                    using var searchReq = new HttpRequestMessage(HttpMethod.Get, searchUri);
                    searchReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

                    var searchResponse = await _httpClient.SendAsync(searchReq);
                    if (searchResponse.IsSuccessStatusCode)
                    {
                        var searchBody = await searchResponse.Content.ReadAsStringAsync();
                        var searchJson = JObject.Parse(searchBody);
                        var firstTrack = searchJson["tracks"]?["items"]?.FirstOrDefault();
                        var uri = firstTrack?["uri"]?.ToString();
                        if (!string.IsNullOrWhiteSpace(uri))
                        {
                            _logger.LogInformation("Matched track '{RawName}' via Spotify query '{Query}' -> {Uri}", rawName, q, uri);
                            return uri;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Spotify search candidate failed for query: {Query}", q);
                }
            }

            _logger.LogWarning("Could not match track on Spotify for Name='{Name}', Artist='{Artist}', Anime='{Anime}'", rawName, rawArtist, rawAnimeTitle);
            return null;
        }

        [HttpGet("search-tracks")]
        public async Task<IActionResult> SearchTracks([FromQuery] string query, [FromQuery] int limit = 20)
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new { message = "Search query is required." });

            if (limit < 1) limit = 1;
            if (limit > 50) limit = 50;

            var cacheKey = $"spotify:search-tracks:{query.Trim().ToLower()}:{limit}";
            var cached = await _cache.GetAsync<JObject>(cacheKey);
            if (cached != null)
            {
                return Content(cached.ToString(Newtonsoft.Json.Formatting.None), "application/json");
            }

            try
            {
                var json = await _spotifyService.SearchTracksAsync(query, limit);
                var items = json["tracks"]?["items"] as JArray;

                if (items == null || !items.HasValues)
                    return Ok(new { tracks = Array.Empty<object>() });

                var tracks = items.Select(item => new
                {
                    id = item["id"]?.ToString(),
                    name = item["name"]?.ToString(),
                    uri = item["uri"]?.ToString(),
                    artist = item["artists"]?.FirstOrDefault()?["name"]?.ToString() ?? "",
                    artists = item["artists"]?.Select(a => a["name"]?.ToString()).ToArray(),
                    albumName = item["album"]?["name"]?.ToString(),
                    imageUrl = item["album"]?["images"]?.FirstOrDefault()?["url"]?.ToString(),
                    spotifyUrl = item["external_urls"]?["spotify"]?.ToString(),
                    durationMs = item["duration_ms"]?.ToObject<int>() ?? 0,
                    isPlayable = item["is_playable"]?.ToObject<bool>() ?? true
                }).ToList();

                var result = new { tracks };
                await _cache.SetAsync(cacheKey, result, TimeSpan.FromHours(24));
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed searching Spotify tracks for query '{Query}'", query);
                return StatusCode(500, new { message = "Failed to search tracks.", error = ex.Message });
            }
        }
    }
}
