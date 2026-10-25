using System.Threading.Tasks;
using Kiroku.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class PlaylistController : ControllerBase
    {
        private readonly IPlaylistService _playlistService;
        private readonly ILogger<PlaylistController> _logger;

        public PlaylistController(IPlaylistService playlistService, ILogger<PlaylistController> logger)
        {
            _playlistService = playlistService;
            _logger = logger;
        }

        [HttpGet("suggest-users")]
        public async Task<IActionResult> SuggestUsers(string query, int limit = 6)
        {
            var users = await _playlistService.SuggestUsersAsync(query, limit);
            return Ok(users);
        }

        [HttpGet("{username}")]
        public async Task<IActionResult> GetPlaylist(string username)
        {
            _logger.LogInformation("Generating soundtrack playlist for user '{Username}'", username);
            var playlist = await _playlistService.GetPlaylistSongsAsync(username);
            if (playlist == null)
            {
                _logger.LogWarning("Soundtrack playlist requested for non-existent user '{Username}'", username);
                return NotFound(new { message = $"User '{username}' not found" });
            }

            return Ok(playlist);
        }
    }
}
