using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json.Linq;

namespace Kiroku.Infrastructure.Services
{
    public class SpotifyService
    {
        private readonly HttpClient _http;
        private readonly string _clientId;
        private readonly string _clientSecret;
        private string _token = string.Empty;
        private DateTime _tokenExpiryUtc = DateTime.MinValue;

        public SpotifyService(HttpClient http, IConfiguration config)
        {
            _http = http;
            _clientId = config["Spotify:ClientId"] ?? throw new InvalidOperationException("Spotify:ClientId is missing");
            _clientSecret = config["Spotify:ClientSecret"] ?? throw new InvalidOperationException("Spotify:ClientSecret is missing");
        }

        private async Task AuthenticateAsync()
        {
            if (!string.IsNullOrWhiteSpace(_token) && _tokenExpiryUtc > DateTime.UtcNow.AddMinutes(1))
                return;

            var req = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
            req.Content = new StringContent("grant_type=client_credentials", Encoding.UTF8, "application/x-www-form-urlencoded");
            req.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"))
            );
            var res = await _http.SendAsync(req);
            var str = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
                throw new InvalidOperationException($"Spotify token failure: {str}");

            var json = JObject.Parse(str);
            _token = json["access_token"]?.Value<string>() ?? throw new InvalidOperationException("No access_token in Spotify response");
            _tokenExpiryUtc = DateTime.UtcNow.AddSeconds(json["expires_in"]!.Value<int>());
        }

        public async Task<JObject> SearchTrackAsync(string trackName, string? artist = null)
        {
            await AuthenticateAsync();

            var q = !string.IsNullOrWhiteSpace(artist)
                ? $"track:{trackName} artist:{artist}"
                : $"track:{trackName}";

            var uri = $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(q)}&type=track&limit=1";
            Console.WriteLine($"Spotify search URI: {uri}");
            using var req = new HttpRequestMessage(HttpMethod.Get, uri);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

            var res = await _http.SendAsync(req);
            var body = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
                throw new InvalidOperationException($"Spotify search error: {body}");
            Console.WriteLine($"Spotify search response: {body}");
            return JObject.Parse(body);
        }
    }
}
