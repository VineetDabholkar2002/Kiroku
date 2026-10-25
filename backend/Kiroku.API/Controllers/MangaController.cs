using System.Threading.Tasks;
using Kiroku.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MangaController : ControllerBase
    {
        private readonly IMangaService _mangaService;

        public MangaController(IMangaService mangaService)
        {
            _mangaService = mangaService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetMangaById(int id)
        {
            var manga = await _mangaService.GetMangaByIdAsync(id);
            if (manga == null) return NotFound();

            return Ok(manga);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllMangas()
        {
            var mangas = await _mangaService.GetAllMangasAsync();
            return Ok(mangas);
        }
    }
}
