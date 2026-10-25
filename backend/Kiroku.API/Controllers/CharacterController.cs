using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Kiroku.Application.Interfaces;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Route("api/[controller]")]
    public class CharacterController : ControllerBase
    {
        private readonly ICharacterService _characterService;

        public CharacterController(ICharacterService characterService)
        {
            _characterService = characterService;
        }

        // GET api/character/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCharacterById(int id)
        {
            var result = await _characterService.GetCharacterByIdAsync(id);
            if (result == null)
                return NotFound(new { message = "Character not found" });

            return Ok(result);
        }

        // GET api/character?page=1&pageSize=25
        [HttpGet]
        public async Task<IActionResult> GetAllCharacters(int page = 1, int pageSize = 25)
        {
            var response = await _characterService.GetAllCharactersAsync(page, pageSize);
            return Ok(response);
        }
    }
}
