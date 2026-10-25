using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Kiroku.Application.DTOs;
using Kiroku.Application.Interfaces;
using Kiroku.Application.Services;
using Kiroku.Data.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Kiroku.Infrastructure.Services
{
    public class PlaylistService : IPlaylistService
    {
        private static readonly Regex SongArtistRegex = new("\"([^\"]+)\" by ([^()]+)", RegexOptions.Compiled);
        private readonly AppDbContext _ctx;
        private readonly ICacheService _cache;
        private readonly ILogger<PlaylistService> _logger;

        public PlaylistService(AppDbContext ctx, ICacheService cache, ILogger<PlaylistService> logger)
        {
            _ctx = ctx;
            _cache = cache;
            _logger = logger;
        }

        public async Task<List<UserSuggestionDto>> SuggestUsersAsync(string query, int limit = 6)
        {
            var trimmed = query?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(trimmed))
                return new List<UserSuggestionDto>();

            if (limit < 1) limit = 6;
            if (limit > 10) limit = 10;

            return await _ctx.Users
                .AsNoTracking()
                .Where(u => u.AnimeList.Any() && EF.Functions.ILike(u.Username, $"{trimmed}%"))
                .OrderBy(u => u.Username)
                .Select(u => new UserSuggestionDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    ProfilePicture = u.ProfilePicture
                })
                .Take(limit)
                .ToListAsync();
        }

        public async Task<List<PlaylistSongDto>?> GetPlaylistSongsAsync(string username)
        {
            if (string.IsNullOrWhiteSpace(username))
                return null;

            var cacheKey = $"Playlist:{username.Trim().ToLower()}";

            return await _cache.GetOrSetAsync(cacheKey, async () =>
            {
                _logger.LogInformation("Cache miss for playlist of user '{Username}'. Querying database", username);

                var user = await _ctx.Users
                    .AsNoTracking()
                    .Include(u => u.AnimeList)
                        .ThenInclude(ual => ual.Anime)
                            .ThenInclude(a => a.ThemeEntries)
                    .Include(u => u.AnimeList)
                        .ThenInclude(ual => ual.Anime)
                            .ThenInclude(a => a.Images)
                    .FirstOrDefaultAsync(u => EF.Functions.ILike(u.Username, username.Trim()));

                if (user == null)
                    return null;

                var result = new List<PlaylistSongDto>();

                foreach (var ual in user.AnimeList)
                {
                    var anime = ual.Anime;
                    if (anime == null || anime.ThemeEntries == null) continue;

                    var themes = anime.ThemeEntries
                        .Where(te => te.Category == "opening" || te.Category == "ending")
                        .OrderBy(te => te.Category)
                        .ThenBy(te => te.Sequence);

                    foreach (var theme in themes)
                    {
                        if (string.IsNullOrWhiteSpace(theme.RawText)) continue;

                        string songName;
                        string artistName;
                        var match = SongArtistRegex.Match(theme.RawText);
                        if (match.Success)
                        {
                            songName = match.Groups[1].Value.Trim();
                            artistName = match.Groups[2].Value.Trim();
                        }
                        else
                        {
                            var parts = theme.RawText.Split(new[] { " by " }, StringSplitOptions.None);
                            if (parts.Length > 1)
                            {
                                songName = parts[0].Trim(' ', '"');
                                artistName = parts[1].Trim(' ', '(', ')');
                            }
                            else
                            {
                                songName = theme.RawText.Trim(' ', '"');
                                artistName = "";
                            }
                        }

                        result.Add(new PlaylistSongDto
                        {
                            AnimeTitle = anime.Title,
                            Name = songName,
                            Artist = artistName,
                            Image = anime.Images?.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                                       ?? anime.Images?.FirstOrDefault()?.ImageUrl,
                            Status = ual.Status ?? ""
                        });
                    }
                }

                return result;
            }, TimeSpan.FromHours(1));
        }
    }
}
