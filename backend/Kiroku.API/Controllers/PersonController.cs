using System.Threading.Tasks;
using Kiroku.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Kiroku.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Route("api/[controller]")]
    [Route("api/v1/people")]
    [Route("api/people")]
    public class PersonController : ControllerBase
    {
        private readonly IPersonService _personService;

        public PersonController(IPersonService personService)
        {
            _personService = personService;
        }

        // GET api/person/{id} - detailed person with images and character voices
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPersonById(int id)
        {
            var result = await _personService.GetPersonByIdAsync(id);
            if (result == null)
                return NotFound(new { message = "Person not found" });

            return Ok(result);
        }

        // GET api/person - list all people (optionally support paging)
        [HttpGet]
        public async Task<IActionResult> GetAllPeople([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var response = await _personService.GetAllPeopleAsync(page, pageSize);
            return Ok(response);
        }
    }
}
