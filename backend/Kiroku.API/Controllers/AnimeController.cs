using System.Threading.Tasks;
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
    public class AnimeController : ControllerBase
    {
        private readonly IAnimeService _animeService;
        private readonly ILogger<AnimeController> _logger;

        public AnimeController(IAnimeService animeService, ILogger<AnimeController> logger)
        {
            _animeService = animeService;
            _logger = logger;
        }

        [HttpGet("popular")]
        public async Task<ActionResult<PagedResult<AnimeDto>>> GetPopularAnime(int page = 1, int per_page = 25)
        {
            var result = await _animeService.GetPopularAnimeAsync(page, per_page);
            return result != null ? Ok(result) : NotFound(new { message = "No data found" });
        }

        [HttpGet("top-rated")]
        public async Task<ActionResult<PagedResult<AnimeDto>>> GetTopRatedAnime(int page = 1, int per_page = 25)
        {
            var result = await _animeService.GetTopRatedAnimeAsync(page, per_page);
            return result != null ? Ok(result) : NotFound(new { message = "No data found" });
        }

        [HttpGet("airing")]
        public async Task<ActionResult<PagedResult<AnimeDto>>> GetAiringAnime(int page = 1, int per_page = 25)
        {
            var result = await _animeService.GetAiringAnimeAsync(page, per_page);
            return result != null ? Ok(result) : NotFound(new { message = "No data found" });
        }

        [HttpGet("upcoming")]
        public async Task<ActionResult<PagedResult<AnimeDto>>> GetUpcomingAnime(int page = 1, int per_page = 25)
        {
            var result = await _animeService.GetUpcomingAnimeAsync(page, per_page);
            return result != null ? Ok(result) : NotFound(new { message = "No data found" });
        }

        [HttpGet("favourites")]
        public async Task<ActionResult<PagedResult<AnimeDto>>> GetTopFavouritedAnime(int page = 1, int per_page = 25)
        {
            var result = await _animeService.GetTopFavouritedAnimeAsync(page, per_page);
            return result != null ? Ok(result) : NotFound(new { message = "No data found" });
        }

        [HttpGet("search")]
        [EnableRateLimiting(RateLimiterExtensions.PolicySearch)]
        public async Task<ActionResult<PagedResult<AnimeDto>>> SearchAnime(string query, int page = 1, int per_page = 25)
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new { message = "Query cannot be empty" });

            _logger.LogInformation("Anime search requested: query='{Query}', page={Page}", query, page);
            var result = await _animeService.SearchAnimeAsync(query, page, per_page);
            return result != null ? Ok(result) : NotFound(new { message = "No data found" });
        }

        [HttpGet("genre/{genreId}")]
        public async Task<ActionResult<PagedResult<AnimeDto>>> GetAnimeByGenre(int genreId, int page = 1, int per_page = 25)
        {
            var result = await _animeService.GetAnimeByGenreAsync(genreId, page, per_page);
            return result != null ? Ok(result) : NotFound(new { message = "No data found" });
        }

        [HttpGet("studio/{studioId}")]
        public async Task<ActionResult<PagedResult<AnimeDto>>> GetAnimeByStudio(int studioId, int page = 1, int per_page = 25)
        {
            var result = await _animeService.GetAnimeByStudioAsync(studioId, page, per_page);
            return result != null ? Ok(result) : NotFound(new { message = "No data found" });
        }

        [HttpGet("tags")]
        public async Task<IActionResult> GetTags(string? type = null, int limit = 100)
        {
            var tags = await _animeService.GetTagsAsync(type, limit);
            return Ok(tags);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetAnimeById(int id)
        {
            _logger.LogInformation("Fetching anime details for MAL ID: {Id}", id);
            var anime = await _animeService.GetAnimeByIdAsync(id);
            if (anime == null)
                return NotFound(new { message = "Anime not found" });

            return Ok(anime);
        }

        [HttpGet("random")]
        public async Task<IActionResult> GetRandomAnime()
        {
            var anime = await _animeService.GetRandomAnimeAsync();
            if (anime == null)
                return NotFound(new { message = "No anime found" });

            return Ok(anime);
        }

        [HttpGet("{id}/characters")]
        public async Task<IActionResult> GetCharacters(int id)
        {
            var characters = await _animeService.GetCharactersAsync(id);
            return Ok(characters);
        }

        [HttpGet("{id}/person")]
        public async Task<IActionResult> GetPersonByMalId(int id)
        {
            var person = await _animeService.GetPersonByMalIdAsync(id);
            if (person == null)
                return NotFound(new { message = "Person not found" });

            return Ok(person);
        }

        [HttpGet("{id}/recommendations")]
        public async Task<IActionResult> GetRecommendations(int id)
        {
            var recommendations = await _animeService.GetRecommendationsAsync(id);
            return Ok(recommendations ?? new RecommendationsResponse { Data = new List<RecommendationDto>() });
        }

        [HttpGet("{malId}/themes")]
        public async Task<IActionResult> GetAnimeThemes(int malId)
        {
            var themes = await _animeService.GetAnimeThemesAsync(malId);
            if (themes == null)
                return NotFound(new { message = "Anime not found" });

            return Ok(themes);
        }

        [HttpGet("{malId}/soundtracks")]
        public async Task<IActionResult> GetAnimeSoundtracks(int malId)
        {
            var soundtracks = await _animeService.GetAnimeSoundtracksAsync(malId);
            return Ok(soundtracks);
        }
    }
}
