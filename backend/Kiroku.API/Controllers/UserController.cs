using Kiroku.API.Extensions;
using Kiroku.Application.DTOs;
using Microsoft.AspNetCore.RateLimiting;
using Kiroku.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ILogger<UserController> _logger;
        public UserController(IUserService userService, ILogger<UserController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        // User login endpoint (rate-limited against brute-force)
        [HttpPost("login")]
        [EnableRateLimiting(RateLimiterExtensions.PolicyAuth)]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto login)
        {
            if (string.IsNullOrWhiteSpace(login.Username) || string.IsNullOrWhiteSpace(login.Password))
                return BadRequest(new { message = "Username and password are required." });

            var result = await _userService.AuthenticateUser(login.Username, login.Password);
            if (result == null)
            {
                _logger.LogWarning("Failed login attempt for username '{Username}'", login.Username);
                return Unauthorized(new { message = "Invalid username or password" });
            }

            _logger.LogInformation("User '{Username}' logged in successfully", login.Username);
            return Ok(result);
        }

        // Get user profile by userId (existing)
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUserProfile(int userId)
        {
            var user = await _userService.GetUserProfile(userId);
            if (user == null) return NotFound(new { message = "User not found" });

            return Ok(user);
        }

        // Get a user's anime list by userId (existing)
        [HttpGet("{userId}/anime-list")]
        public async Task<IActionResult> GetUserAnimeList(int userId)
        {
            var animeList = await _userService.GetUserAnimeList(userId);
            return Ok(animeList);
        }

        [HttpGet("by-username/{username}")]
        public async Task<IActionResult> GetUserProfileByUsername(string username)
        {
            var user = await _userService.GetUserByUsername(username);
            if (user == null) return NotFound(new { message = "User not found" });

            var profile = new UserDTO
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                ProfilePicture = user.ProfilePicture
            };

            return Ok(profile);
        }

        [HttpGet("by-username/{username}/anime-list")]
        public async Task<IActionResult> GetUserAnimeListByUsername(string username)
        {
            var animeList = await _userService.GetUserAnimeListByUsername(username);
            if (animeList == null) return NotFound(new { message = "User not found" });
            return Ok(animeList);
        }

        [HttpPut("by-username/{username}/anime-list")]
        public async Task<IActionResult> UpsertUserAnimeListItem(string username, [FromBody] UpdateUserAnimeListRequest request)
        {
            if (request.AnimeMalId <= 0 || string.IsNullOrWhiteSpace(request.Status))
                return BadRequest(new { message = "animeMalId and status are required." });

            try
            {
                var updated = await _userService.UpsertUserAnimeListItem(username, request.AnimeMalId, request.Status, request.Score);
                if (updated == null)
                    return NotFound(new { message = "User or anime not found." });

                _logger.LogInformation("User '{Username}' updated anime MAL ID {AnimeMalId} to status '{Status}', score {Score}",
                    username, request.AnimeMalId, request.Status, request.Score);

                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("by-username/{username}/anime-list/{animeMalId}")]
        public async Task<IActionResult> DeleteUserAnimeListItem(string username, int animeMalId)
        {
            if (animeMalId <= 0)
                return BadRequest(new { message = "Valid animeMalId is required." });

            var success = await _userService.DeleteUserAnimeListItem(username, animeMalId);
            if (!success)
                return NotFound(new { message = "Anime entry not found in list." });

            _logger.LogInformation("User '{Username}' removed anime MAL ID {AnimeMalId} from list", username, animeMalId);
            return Ok(new { message = "Removed from list successfully." });
        }

        // Get user recommendations based on collaborative filtering
        [HttpGet("by-username/{username}/recommendations")]
        public async Task<IActionResult> GetUserRecommendations(string username)
        {
            _logger.LogInformation("Generating recommendations for user '{Username}'", username);
            var recommendations = await _userService.GetUserRecommendations(username);
            if (recommendations == null) return NotFound(new { message = "User not found" });

            return Ok(recommendations);
        }

        // Get a user's playlist by username
        [HttpGet("{username}/playlist")]
        public async Task<IActionResult> GetUserPlaylist(string username)
        {
            var user = await _userService.GetUserByUsername(username);
            if (user == null) return NotFound(new { message = "User not found" });

            var playlist = await _userService.GetUserAnimeList(user.Id);
            return Ok(playlist);
        }
    }
}
