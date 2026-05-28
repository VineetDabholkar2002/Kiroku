using Kiroku.Application.DTOs;
using Kiroku.Data.Contexts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

[ApiController]
[Route("api/v1/[controller]")]
public class PlaylistController : ControllerBase
{
    private readonly AppDbContext _ctx;

    public PlaylistController(AppDbContext ctx)
    {
        _ctx = ctx;
    }

    [HttpGet("suggest-users")]
    public async Task<IActionResult> SuggestUsers(string query, int limit = 6)
    {
        var trimmed = query?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed))
            return Ok(Array.Empty<object>());

        if (limit < 1) limit = 6;
        if (limit > 10) limit = 10;

        var users = await _ctx.Users
            .AsNoTracking()
            .Where(u => u.AnimeList.Any() && EF.Functions.ILike(u.Username, $"{trimmed}%"))
            .OrderBy(u => u.Username)
            .Select(u => new
            {
                id = u.Id,
                username = u.Username,
                profilePicture = u.ProfilePicture
            })
            .Take(limit)
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{username}")]
    public async Task<IActionResult> GetPlaylist(string username)
    {
        // 1) Load user + their anime list + Anime & ThemeEntries & Images
        var user = await _ctx.Users
            .Include(u => u.AnimeList)
                .ThenInclude(ual => ual.Anime)
                    .ThenInclude(a => a.ThemeEntries)
            .Include(u => u.AnimeList)
                .ThenInclude(ual => ual.Anime)
                    .ThenInclude(a => a.Images)
            .FirstOrDefaultAsync(u => u.Username == username);
        var b = _ctx.UserAnimeLists.OrderBy(a=>a.Id).Last();
        var c = _ctx.Users.Where(u => u.Id == 98178);
        if (user == null)
            return NotFound(new { message = $"User '{username}' not found" });

        var result = new List<PlaylistSongDto>();
        var regex = new Regex("\"([^\"]+)\" by ([^()]+)");

        // 2) For each anime in their list, get themes from DB
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
                var match = regex.Match(theme.RawText);
                if (!match.Success) continue;

                result.Add(new PlaylistSongDto
                {
                    AnimeTitle = anime.Title,
                    Name = match.Groups[1].Value,
                    Artist = match.Groups[2].Value.Trim(),
                    Image = anime.Images?.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                               ?? anime.Images?.FirstOrDefault()?.ImageUrl,
                    Status = ual.Status ?? ""
                });
            }
        }

        return Ok(result);
    }
}
