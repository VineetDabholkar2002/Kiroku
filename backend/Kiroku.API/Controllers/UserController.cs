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
}
