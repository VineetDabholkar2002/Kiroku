using Kiroku.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class CacheController : ControllerBase
    {
        private readonly CacheWarmService _cacheWarmService;

        public CacheController(CacheWarmService cacheWarmService)
        {
            _cacheWarmService = cacheWarmService;
        }

        [HttpPost("warm")]
        public async Task<IActionResult> WarmMostUsedCaches(CancellationToken cancellationToken)
        {
            var results = await _cacheWarmService.WarmMostUsedAnimeEndpointsAsync(cancellationToken);
            return Ok(new
            {
                warmed = results.Count,
                results
            });
        }
    }
}
