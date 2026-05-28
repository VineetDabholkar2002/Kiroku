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
    public class PersonController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PersonController(AppDbContext context)
        {
            _context = context;
        }

        // GET api/person/{id} - detailed person with images and character voices
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPersonById(int id)
        {
            var person = await _context.People
                .AsNoTracking()
                .Include(p => p.Images)
                .Include(p => p.CharacterVoices)
                    .ThenInclude(cv => cv.Character)
                        .ThenInclude(c => c.Images)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (person == null)
                return NotFound(new { message = "Person not found" });

            // Mapping to a JSON structure similar to Jikan's person endpoint
            var result = new
            {
                mal_id = person.MalId,
                url = person.Url,
                name = person.Name,
                images = person.Images
                    .GroupBy(img => img.Format)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(i => i.ImageUrl).ToList()
                    ),
                characters_voiced = person.CharacterVoices.Select(cv => new
                {
                    character_id = cv.Character.Id,
                    mal_id = cv.Character.MalId,
                    name = cv.Character.Name,
                    role = cv.Language,
                    images = cv.Character.Images
                        .GroupBy(img => img.Format)
                        .ToDictionary(
                            g => g.Key,
                            g => g.Select(i => i.ImageUrl).ToList()
                        ),
                    // Add other character info if needed
                })
            };

            return Ok(result);
        }

        // GET api/person - list all people (optionally support paging)
        [HttpGet]
        public async Task<IActionResult> GetAllPeople([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 50;

            var query = _context.People.AsNoTracking();

            var totalItems = await query.CountAsync();

            var people = await query
                .OrderBy(p => p.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    id = p.Id,
                    mal_id = p.MalId,
                    name = p.Name,
                    url = p.Url,
                    image = p.Images.OrderBy(i => i.Format).Select(i => i.ImageUrl).FirstOrDefault()
                }).ToListAsync();

            var response = new
            {
                pagination = new
                {
                    total_items = totalItems,
                    page,
                    page_size = pageSize,
                    total_pages = (int)System.Math.Ceiling(totalItems / (double)pageSize)
                },
                data = people
            };

            return Ok(response);
        }
    }
}
