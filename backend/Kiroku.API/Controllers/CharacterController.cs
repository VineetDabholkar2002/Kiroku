using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Kiroku.Data.Contexts;
using Kiroku.Domain.Entities;
using System.Linq;
using System.Threading.Tasks;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CharacterController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CharacterController(AppDbContext context)
        {
            _context = context;
        }

        // GET api/character/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCharacterById(int id)
        {
            var character = await _context.Characters
                .AsNoTracking()
                .Include(c => c.Images)
                .Include(c => c.CharacterVoices)
                    .ThenInclude(cv => cv.Person)
                        .ThenInclude(p => p.Images)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (character == null)
                return NotFound(new { message = "Character not found" });

            var result = new
            {
                mal_id = character.MalId,
                url = character.Url,
                name = character.Name,
                images = new
                {
                    jpg = character.Images.Where(i => i.Format == "jpg").Select(i => i.ImageUrl).ToList(),
                    webp = character.Images.Where(i => i.Format == "webp").Select(i => i.ImageUrl).ToList()
                },
                voice_actors = character.CharacterVoices.Select(cv => new
                {
                    mal_id = cv.Person.MalId,
                    url = cv.Person.Url,
                    name = cv.Person.Name,
                    language = cv.Language,
                    images = new
                    {
                        jpg = cv.Person.Images.Where(i => i.Format == "jpg").Select(i => i.ImageUrl).ToList(),
                        webp = cv.Person.Images.Where(i => i.Format == "webp").Select(i => i.ImageUrl).ToList()
                    }
                }).ToList()
            };

            return Ok(result);
        }

        // GET api/character?page=1&pageSize=25
        [HttpGet]
        public async Task<IActionResult> GetAllCharacters(int page = 1, int pageSize = 25)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 25;

            var query = _context.Characters.AsNoTracking();

            var totalItems = await query.CountAsync();

            var characters = await query
                .OrderBy(c => c.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new
                {
                    id = c.Id,
                    mal_id = c.MalId,
                    name = c.Name,
                    url = c.Url,
                    image = c.Images.OrderBy(i => i.Format).Select(i => i.ImageUrl).FirstOrDefault()
                })
                .ToListAsync();

            var response = new
            {
                pagination = new
                {
                    total_items = totalItems,
                    current_page = page,
                    page_size = pageSize,
                    total_pages = (int)System.Math.Ceiling(totalItems / (double)pageSize)
                },
                data = characters
            };

            return Ok(response);
        }
    }
}
