using Kiroku.Application.DTOs;
using Kiroku.Application.Options;
using Kiroku.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class SpotifyAuthController : ControllerBase
    {
        private readonly SpotifyOptions _spotifyOptions;
        private readonly HttpClient _httpClient;
        private readonly ICacheService _cache;
        private readonly ILogger<SpotifyAuthController> _logger;

        private const string RefreshKeyPrefix = "spotify:refresh:";
        private const string StateKeyPrefix = "spotify:state:";

        public SpotifyAuthController(
            IOptions<SpotifyOptions> spotifyOptions,
            IHttpClientFactory httpClientFactory,
            ICacheService cache,
            ILogger<SpotifyAuthController> logger)
        {
            _spotifyOptions = spotifyOptions?.Value ?? throw new ArgumentNullException(nameof(spotifyOptions));
            _httpClient = httpClientFactory.CreateClient();
            _cache = cache;
            _logger = logger;
        }

        [HttpGet("login")]
        public async Task<IActionResult> Login([FromQuery] string? redirectUri = null)
        {
            var clientId = _spotifyOptions.ClientId;
            var configuredRedirectUri = _spotifyOptions.RedirectUri;
            var effectiveRedirectUri = !string.IsNullOrWhiteSpace(redirectUri) ? redirectUri : configuredRedirectUri;

            if (string.IsNullOrWhiteSpace(clientId))
                return StatusCode(500, new { message = "Spotify ClientId is not configured on the server." });

            if (string.IsNullOrWhiteSpace(effectiveRedirectUri))
                return StatusCode(500, new { message = "Spotify RedirectUri is not configured on the server." });

            var state = Guid.NewGuid().ToString("N");
            // Store the state with the effective redirectUri so Callback uses the exact matching URI
            await _cache.SetAsync($"{StateKeyPrefix}{state}", effectiveRedirectUri, TimeSpan.FromMinutes(10));

            var scope = "streaming user-read-email user-read-private " +
                        "user-read-playback-state user-modify-playback-state " +
                        "playlist-modify-public playlist-modify-private";

            var authUrl =
                $"https://accounts.spotify.com/authorize" +
                $"?response_type=code" +
                $"&client_id={clientId}" +
                $"&scope={Uri.EscapeDataString(scope)}" +
                $"&redirect_uri={Uri.EscapeDataString(effectiveRedirectUri)}" +
                $"&state={state}";

            _logger.LogInformation("Spotify OAuth login initiated. RedirectUri: {RedirectUri}", effectiveRedirectUri);
            return Ok(new { authUrl, state, redirectUri = effectiveRedirectUri });
        }

        [HttpPost("callback")]
        public async Task<IActionResult> Callback([FromBody] SpotifyCallbackRequest request)
        {
            // Verify state to prevent CSRF and retrieve the matching redirectUri
            var storedRedirectUri = await _cache.GetAsync<string>($"{StateKeyPrefix}{request.State}");
            if (storedRedirectUri == null)
            {
                _logger.LogWarning("Spotify OAuth callback failed: invalid or expired state parameter");
                return BadRequest(new { message = "Invalid or expired state parameter." });
            }

            await _cache.RemoveAsync($"{StateKeyPrefix}{request.State}");

            var clientId = _spotifyOptions.ClientId;
            var clientSecret = _spotifyOptions.ClientSecret;
            if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
                return StatusCode(500, new { message = "Spotify credentials are not configured on the server." });

            var redirectUri = !string.IsNullOrWhiteSpace(request.RedirectUri)
                ? request.RedirectUri
                : (!string.IsNullOrWhiteSpace(storedRedirectUri) && storedRedirectUri != "valid" ? storedRedirectUri : _spotifyOptions.RedirectUri);

            var authHeader = Convert.ToBase64String(
                                   Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));

            var body = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type",    "authorization_code"),
                new KeyValuePair<string, string>("code",          request.Code),
                new KeyValuePair<string, string>("redirect_uri",  redirectUri!),
            });

            using var req = new HttpRequestMessage(HttpMethod.Post,
                "https://accounts.spotify.com/api/token")
            { Content = body };
            req.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeader);

            var response = await _httpClient.SendAsync(req);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Spotify token exchange failed with status {StatusCode}: {Detail}", response.StatusCode, json);
                return BadRequest(new { message = "Failed to exchange code for token.", detail = json });
            }

            var tokenData = JsonSerializer.Deserialize<JsonElement>(json);
            var accessToken = tokenData.GetProperty("access_token").GetString()!;
            var refreshToken = tokenData.TryGetProperty("refresh_token", out var rf) ? rf.GetString()! : "";
            var expiresIn = tokenData.GetProperty("expires_in").GetInt32(); // seconds

            var sessionId = Guid.NewGuid().ToString("N");

            if (!string.IsNullOrEmpty(refreshToken))
            {
                await _cache.SetAsync($"{RefreshKeyPrefix}{sessionId}", refreshToken,
                                      TimeSpan.FromDays(30));
            }

            _logger.LogInformation("Spotify authorization code exchanged successfully. Created session {SessionId}", sessionId);

            // Return only the short-lived access token + the opaque session ID
            return Ok(new
            {
                access_token = accessToken,
                expires_in = expiresIn,
                session_id = sessionId,   // frontend stores this, NOT the refresh token
            });
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.SessionId))
                return BadRequest(new { message = "session_id is required." });

            var refreshToken = await _cache.GetAsync<string>(
                                   $"{RefreshKeyPrefix}{request.SessionId}");

            if (refreshToken == null)
            {
                _logger.LogWarning("Spotify token refresh rejected: session {SessionId} not found or expired", request.SessionId);
                return Unauthorized(new { message = "Session expired. Please reconnect Spotify." });
            }

            var clientId = _spotifyOptions.ClientId;
            var clientSecret = _spotifyOptions.ClientSecret;
            if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
                return StatusCode(500, new { message = "Spotify credentials are not configured on the server." });

            var authHeader = Convert.ToBase64String(
                                   Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));

            var body = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type",    "refresh_token"),
                new KeyValuePair<string, string>("refresh_token", refreshToken),
            });

            using var req = new HttpRequestMessage(HttpMethod.Post,
                "https://accounts.spotify.com/api/token")
            { Content = body };
            req.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeader);

            var response = await _httpClient.SendAsync(req);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Spotify token refresh failed with status {StatusCode} for session: {SessionId}", response.StatusCode, request.SessionId);
                return BadRequest(new { message = "Failed to refresh token." });
            }

            var tokenData = JsonSerializer.Deserialize<JsonElement>(json);
            var accessToken = tokenData.GetProperty("access_token").GetString()!;
            var expiresIn = tokenData.GetProperty("expires_in").GetInt32();

            // Spotify sometimes rotates the refresh token — update it in Redis if so
            if (tokenData.TryGetProperty("refresh_token", out var newRefresh))
            {
                await _cache.SetAsync($"{RefreshKeyPrefix}{request.SessionId}",
                                      newRefresh.GetString()!, TimeSpan.FromDays(30));
            }

            _logger.LogInformation("Spotify access token refreshed successfully for session: {SessionId}", request.SessionId);

            return Ok(new
            {
                access_token = accessToken,
                expires_in = expiresIn,
            });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
        {
            if (!string.IsNullOrWhiteSpace(request.SessionId))
            {
                await _cache.RemoveAsync($"{RefreshKeyPrefix}{request.SessionId}");
                _logger.LogInformation("Spotify session logged out: {SessionId}", request.SessionId);
            }

            return Ok(new { message = "Logged out." });
        }
    }
}
