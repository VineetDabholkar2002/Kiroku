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

    public SpotifyAuthController(IConfiguration config, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _httpClient = httpClientFactory.CreateClient();
    }

    [HttpGet("login")]
    public IActionResult Login()
    {
        var clientId = _config["Spotify:ClientId"];
        var redirectUri = _config["Spotify:RedirectUri"]; // e.g., "http://localhost:3000/callback"
        
        var scope = "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state";
        var state = Guid.NewGuid().ToString();
        
        var authUrl = $"https://accounts.spotify.com/authorize?" +
            $"response_type=code&client_id={clientId}&scope={Uri.EscapeDataString(scope)}&" +
            $"redirect_uri={Uri.EscapeDataString(redirectUri)}&state={state}";

        return Ok(new { authUrl, state });
    }

    [HttpPost("callback")]
    public async Task<IActionResult> Callback([FromBody] SpotifyCallbackRequest request)
    {
        var clientId = _config["Spotify:ClientId"];
        var clientSecret = _config["Spotify:ClientSecret"];
        var redirectUri = _config["Spotify:RedirectUri"];

        var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));

        var body = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "authorization_code"),
            new KeyValuePair<string, string>("code", request.Code),
            new KeyValuePair<string, string>("redirect_uri", redirectUri)
        });

        _httpClient.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeader);

        var response = await _httpClient.PostAsync("https://accounts.spotify.com/api/token", body);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            return BadRequest(new { message = "Failed to get access token" });

        var tokenData = JsonSerializer.Deserialize<JsonElement>(json);
        
        return Ok(new
        {
            access_token = tokenData.GetProperty("access_token").GetString(),
            refresh_token = tokenData.GetProperty("refresh_token").GetString(),
            expires_in = tokenData.GetProperty("expires_in").GetInt32()
        });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var clientId = _config["Spotify:ClientId"];
        var clientSecret = _config["Spotify:ClientSecret"];
        var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));

        var body = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "refresh_token"),
            new KeyValuePair<string, string>("refresh_token", request.RefreshToken)
        });

        _httpClient.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeader);

        var response = await _httpClient.PostAsync("https://accounts.spotify.com/api/token", body);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            return BadRequest(new { message = "Failed to refresh token" });

        var tokenData = JsonSerializer.Deserialize<JsonElement>(json);
        
        return Ok(new
        {
            access_token = tokenData.GetProperty("access_token").GetString(),
            expires_in = tokenData.GetProperty("expires_in").GetInt32()
        });
    }
}

public class SpotifyCallbackRequest
{
    public string Code { get; set; }
    public string State { get; set; }
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; }
}
