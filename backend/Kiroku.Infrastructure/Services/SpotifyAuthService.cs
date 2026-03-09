using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Kiroku.Infrastructure.Services
{
    public class SpotifyAuthService
    {
        private readonly IConfiguration _config;
        private string _accessToken;
        private DateTime _tokenExpiration;

        public SpotifyAuthService(IConfiguration config)
        {
            _config = config;
        }

        public async Task<string> GetAccessTokenAsync()
        {
            if (!string.IsNullOrEmpty(_accessToken) && _tokenExpiration > DateTime.UtcNow)
            {
                return _accessToken;
            }

            var clientId = _config["Spotify:ClientId"];
            var clientSecret = _config["Spotify:ClientSecret"];
            var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

            var body = new FormUrlEncodedContent(new[]
            {
            new KeyValuePair<string, string>("grant_type", "client_credentials")
        });

            var response = await client.PostAsync("https://accounts.spotify.com/api/token", body);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            _accessToken = json.GetProperty("access_token").GetString();
            int expiresIn = json.GetProperty("expires_in").GetInt32();
            _tokenExpiration = DateTime.UtcNow.AddSeconds(expiresIn - 60); // buffer

            return _accessToken;
        }
    }

}
