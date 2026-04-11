using Kiroku.Application.DTOs;
using Kiroku.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly UserService _userService;

        public UserController(UserService userService)
        {
            _userService = userService;
        }

        // User login endpoint
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto login)
        {
            // Authenticate user by username and password
            var user = await _userService.AuthenticateUser(login.Username, login.Password);
            if (user == null)
                return Unauthorized(new { message = "Invalid username or password" });

            // Return basic user info; do not include password
            var profile = new UserProfileDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                ProfilePicture = user.ProfilePicture
            };
            return Ok(profile);
        }

        // Get user profile by userId (existing)
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUserProfile(int userId)
        {
            var user = await _userService.GetUserProfile(userId);
            if (user == null) return NotFound(new { message = "User not found" });

            // Project entity to DTO if needed
            var profile = new UserProfileDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                ProfilePicture = user.ProfilePicture
            };
            return Ok(profile);
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

            var profile = new UserProfileDto
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

                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("by-username/{username}/recommendations")]
        public async Task<IActionResult> GetUserRecommendations(string username)
        {
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

    // Simple DTOs
    public class LoginDto
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class UserProfileDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = "";
        public string Email { get; set; } = "";
        public string? ProfilePicture { get; set; }
    }

    public class UpdateUserAnimeListRequest
    {
        public int AnimeMalId { get; set; }
        public string Status { get; set; } = "";
        public int Score { get; set; }
    }
}
