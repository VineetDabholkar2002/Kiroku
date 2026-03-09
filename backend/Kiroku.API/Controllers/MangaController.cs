using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Kiroku.Data.Contexts;
using Kiroku.Domain.Entities;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MangaController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MangaController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetMangaById(int id)
        {
            var manga = await _context.Mangas.FindAsync(id);
            if (manga == null) return NotFound();

            return Ok(manga);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllMangas()
        {
            return Ok(await _context.Mangas.ToListAsync());
        }
    }
}
