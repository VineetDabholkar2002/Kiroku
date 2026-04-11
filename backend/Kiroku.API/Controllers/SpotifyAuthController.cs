using Kiroku.Application.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Text;
using System.Text.Json;

[ApiController]
[Route("api/v1/[controller]")]
public class SpotifyAuthController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly ICacheService _cache;

    private const string RefreshKeyPrefix = "spotify:refresh:";
    private const string StateKeyPrefix = "spotify:state:";

    public SpotifyAuthController(
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        ICacheService cache)
    {
        _config = config;
        _httpClient = httpClientFactory.CreateClient();
        _cache = cache;
    }

    [HttpGet("login")]
    public async Task<IActionResult> Login()
    {
        var clientId = _config["Spotify:ClientId"];
        var redirectUri = _config["Spotify:RedirectUri"];


        var state = Guid.NewGuid().ToString("N");
        await _cache.SetAsync($"{StateKeyPrefix}{state}", "valid", TimeSpan.FromMinutes(10));

        var scope = "streaming user-read-email user-read-private " +
                    "user-read-playback-state user-modify-playback-state " +
                    "playlist-modify-public playlist-modify-private";

        var authUrl =
            $"https://accounts.spotify.com/authorize" +
            $"?response_type=code" +
            $"&client_id={clientId}" +
            $"&scope={Uri.EscapeDataString(scope)}" +
            $"&redirect_uri={Uri.EscapeDataString(redirectUri!)}" +
            $"&state={state}";

        return Ok(new { authUrl, state });
    }


    [HttpPost("callback")]
    public async Task<IActionResult> Callback([FromBody] SpotifyCallbackRequest request)
    {
        // Verify state to prevent CSRF
        var storedState = await _cache.GetAsync<string>($"{StateKeyPrefix}{request.State}");
        if (storedState == null)
            return BadRequest(new { message = "Invalid or expired state parameter." });


        await _cache.RemoveAsync($"{StateKeyPrefix}{request.State}");

        var clientId = _config["Spotify:ClientId"];
        var clientSecret = _config["Spotify:ClientSecret"];
        var redirectUri = _config["Spotify:RedirectUri"];
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
            return BadRequest(new { message = "Failed to exchange code for token." });

        var tokenData = JsonSerializer.Deserialize<JsonElement>(json);
        var accessToken = tokenData.GetProperty("access_token").GetString()!;
        var refreshToken = tokenData.GetProperty("refresh_token").GetString()!;
        var expiresIn = tokenData.GetProperty("expires_in").GetInt32(); // seconds


        var sessionId = Guid.NewGuid().ToString("N");

        await _cache.SetAsync($"{RefreshKeyPrefix}{sessionId}", refreshToken,
                              TimeSpan.FromDays(30));

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
            return Unauthorized(new { message = "Session expired. Please reconnect Spotify." });

        var clientId = _config["Spotify:ClientId"];
        var clientSecret = _config["Spotify:ClientSecret"];
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
            return BadRequest(new { message = "Failed to refresh token." });

        var tokenData = JsonSerializer.Deserialize<JsonElement>(json);
        var accessToken = tokenData.GetProperty("access_token").GetString()!;
        var expiresIn = tokenData.GetProperty("expires_in").GetInt32();

        // Spotify sometimes rotates the refresh token — update it in Redis if so
        if (tokenData.TryGetProperty("refresh_token", out var newRefresh))
        {
            await _cache.SetAsync($"{RefreshKeyPrefix}{request.SessionId}",
                                  newRefresh.GetString()!, TimeSpan.FromDays(30));
        }

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
            await _cache.RemoveAsync($"{RefreshKeyPrefix}{request.SessionId}");

        return Ok(new { message = "Logged out." });
    }
}


public class SpotifyCallbackRequest
{
    public string Code { get; set; } = "";
    public string State { get; set; } = "";
}

public class RefreshRequest
{
    public string SessionId { get; set; } = "";
}
