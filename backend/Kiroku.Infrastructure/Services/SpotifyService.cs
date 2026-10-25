using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json.Linq;
using Kiroku.Application.Interfaces;
using Kiroku.Application.Options;

namespace Kiroku.Infrastructure.Services
{
    public sealed class SpotifyService : ISpotifyService
    {
        private readonly HttpClient _http;
        private readonly ILogger<SpotifyService> _logger;
        private readonly string _clientId;
        private readonly string _clientSecret;
        private string _token = string.Empty;
        private DateTime _tokenExpiryUtc = DateTime.MinValue;

        private readonly SemaphoreSlim _authLock = new(1, 1);

        public SpotifyService(HttpClient http, IOptions<SpotifyOptions> options, ILogger<SpotifyService> logger)
        {
            _http = http;
            _logger = logger;
            var spotify = options?.Value ?? throw new ArgumentNullException(nameof(options));
            if (string.IsNullOrWhiteSpace(spotify.ClientId))
                throw new InvalidOperationException("Spotify:ClientId is missing");
            if (string.IsNullOrWhiteSpace(spotify.ClientSecret))
                throw new InvalidOperationException("Spotify:ClientSecret is missing");

            _clientId = spotify.ClientId;
            _clientSecret = spotify.ClientSecret;
        }

        private async Task AuthenticateAsync()
        {
            if (!string.IsNullOrWhiteSpace(_token) && _tokenExpiryUtc > DateTime.UtcNow.AddMinutes(1))
                return;

            await _authLock.WaitAsync();
            try
            {
                if (!string.IsNullOrWhiteSpace(_token) && _tokenExpiryUtc > DateTime.UtcNow.AddMinutes(1))
                    return;

                _logger.LogInformation("Refreshing Spotify client credentials token");
                var req = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
                req.Content = new StringContent("grant_type=client_credentials", Encoding.UTF8, "application/x-www-form-urlencoded");
                req.Headers.Authorization = new AuthenticationHeaderValue(
                    "Basic",
                    Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"))
                );
                var res = await _http.SendAsync(req);
                var str = await res.Content.ReadAsStringAsync();
                if (!res.IsSuccessStatusCode)
                {
                    _logger.LogError("Spotify token refresh failed: {Response}", str);
                    throw new InvalidOperationException($"Spotify token failure: {str}");
                }

                var json = JObject.Parse(str);
                _token = json["access_token"]?.Value<string>() ?? throw new InvalidOperationException("No access_token in Spotify response");
                var expiresIn = json["expires_in"]!.Value<int>();
                _tokenExpiryUtc = DateTime.UtcNow.AddSeconds(expiresIn);
                _logger.LogInformation($"Spotify client credentials token refreshed successfully. Valid for {expiresIn}s");
            }
            finally
            {
                _authLock.Release();
            }
        }

        public async Task<JObject> SearchTrackAsync(string trackName, string? artist = null)
        {
            await AuthenticateAsync();

            if (string.IsNullOrWhiteSpace(trackName))
                return JObject.Parse("{\"tracks\":{\"items\":[]}}");

            var cleanName = Regex.Replace(trackName, @"\s*\((?:TV\s*Size|TV\s*Ver\.?|TV\s*Edit|Short\s*Ver\.?|Full\s*Ver\.?|Instrumental|Anime\s*Ver\.?|eps?\s*\d+.*?|ep\s*\d+.*?)\)", "", RegexOptions.IgnoreCase);
            cleanName = Regex.Replace(cleanName, @"^(?:#?\d+[:\.]\s*|(?:OP|ED)\s*\d*[:\.\s]\s*)", "", RegexOptions.IgnoreCase);
            cleanName = cleanName.Replace("\"", "").Replace("'", "").Replace("*", "").Replace("〜", " ").Replace("~", " ").Replace("「", "").Replace("」", "").Replace("『", "").Replace("』", "");
            cleanName = Regex.Replace(cleanName, @"\s+", " ").Trim();

            if (string.IsNullOrWhiteSpace(cleanName))
                cleanName = trackName.Trim(' ', '"', '\'', '*', '〜', '~');

            var cleanArtist = string.Empty;
            if (!string.IsNullOrWhiteSpace(artist))
            {
                cleanArtist = Regex.Replace(artist, @"\s*\((?:eps?\s*\d+.*?|ep\s*\d+.*?|CV[\.:].*?)\)", "", RegexOptions.IgnoreCase);
                cleanArtist = cleanArtist.Replace("\"", "").Replace("'", "").Replace("*", "").Replace("〜", " ").Replace("~", " ");
                cleanArtist = Regex.Replace(cleanArtist, @"\s+", " ").Trim();
            }

            var queries = new List<string>();
            if (!string.IsNullOrWhiteSpace(cleanArtist))
            {
                queries.Add($"track:{cleanName} artist:{cleanArtist}");
                queries.Add($"{cleanName} {cleanArtist}");
            }
            queries.Add(cleanName);

            foreach (var q in queries.Distinct())
            {
                var uri = $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(q)}&type=track&limit=1";
                _logger.LogDebug("Executing Spotify search: {Uri}", uri);

                using var req = new HttpRequestMessage(HttpMethod.Get, uri);
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

                var res = await _http.SendAsync(req);
                var body = await res.Content.ReadAsStringAsync();
                if (res.IsSuccessStatusCode)
                {
                    var parsed = JObject.Parse(body);
                    var items = parsed["tracks"]?["items"] as JArray;
                    if (items != null && items.Count > 0)
                    {
                        return parsed;
                    }
                }
            }

            return JObject.Parse("{\"tracks\":{\"items\":[]}}");
        }

        public async Task<JObject> SearchTracksAsync(string query, int limit = 20)
        {
            await AuthenticateAsync();

            if (limit < 1) limit = 1;
            if (limit > 50) limit = 50;

            var uri = $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(query)}&type=track&limit={limit}";
            _logger.LogDebug("Executing general Spotify search: {Uri}", uri);

            using var req = new HttpRequestMessage(HttpMethod.Get, uri);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

            var res = await _http.SendAsync(req);
            var body = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Spotify multi-track search returned non-success code {StatusCode} for query '{Query}': {Body}", res.StatusCode, query, body);
                throw new InvalidOperationException($"Spotify search error: {body}");
            }

            return JObject.Parse(body);
        }
    }
}
