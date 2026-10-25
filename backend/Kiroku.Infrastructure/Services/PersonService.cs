using System;
using System.Linq;
using System.Threading.Tasks;
using Kiroku.Application.Interfaces;
using Kiroku.Application.Services;
using Kiroku.Data.Contexts;
using Microsoft.EntityFrameworkCore;

namespace Kiroku.Infrastructure.Services
{
    public class PersonService : IPersonService
    {
        private readonly AppDbContext _context;
        private readonly ICacheService _cacheService;

        public PersonService(AppDbContext context, ICacheService cacheService)
        {
            _context = context;
            _cacheService = cacheService;
        }

        public async Task<object?> GetPersonByIdAsync(int id)
        {
            string cacheKey = $"PersonDetail:{id}";

            return await _cacheService.GetOrSetAsync<object?>(cacheKey, async () =>
            {
                var person = await _context.People
                    .AsNoTracking()
                    .Include(p => p.Images)
                    .Include(p => p.CharacterVoices)
                        .ThenInclude(cv => cv.Character)
                            .ThenInclude(c => c.Images)
                    .Include(p => p.CharacterVoices)
                        .ThenInclude(cv => cv.Character)
                            .ThenInclude(c => c.AnimeCharacters)
                                .ThenInclude(ac => ac.Anime)
                                    .ThenInclude(a => a.Images)
                    .FirstOrDefaultAsync(p => p.MalId == id);

                if (person == null)
                {
                    person = await _context.People
                        .AsNoTracking()
                        .Include(p => p.Images)
                        .Include(p => p.CharacterVoices)
                            .ThenInclude(cv => cv.Character)
                                .ThenInclude(c => c.Images)
                        .Include(p => p.CharacterVoices)
                            .ThenInclude(cv => cv.Character)
                                .ThenInclude(c => c.AnimeCharacters)
                                    .ThenInclude(ac => ac.Anime)
                                        .ThenInclude(a => a.Images)
                        .FirstOrDefaultAsync(p => p.Id == id);
                }

                if (person == null)
                    return null;

                var jpgImg = person.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                          ?? person.Images.FirstOrDefault()?.ImageUrl ?? "";

                // Voice roles: Anime appearances with character & language
                var rawRoles = person.CharacterVoices
                    .SelectMany(cv => cv.Character.AnimeCharacters.Select(ac => new
                    {
                        Anime = ac.Anime,
                        Character = cv.Character,
                        Role = ac.Role,
                        Language = cv.Language
                    }))
                    .Where(x => x.Anime != null)
                    .OrderByDescending(x => x.Anime.Score ?? 0)
                    .ToList();

                // Deduplicate by (Anime.Id, Character.Id) to prevent duplicate role cards
                var voiceRoles = rawRoles
                    .GroupBy(x => (x.Anime.Id, x.Character.Id))
                    .Select(g => g.First())
                    .Select(x => new
                    {
                        anime = new
                        {
                            id = x.Anime.Id,
                            mal_id = x.Anime.MalId,
                            title = x.Anime.Title,
                            title_english = x.Anime.TitleEnglish,
                            type = x.Anime.Type,
                            score = x.Anime.Score,
                            year = x.Anime.Year,
                            images = new
                            {
                                jpg = new
                                {
                                    image_url = x.Anime.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                                            ?? x.Anime.Images.FirstOrDefault()?.ImageUrl ?? ""
                                }
                            }
                        },
                        character = new
                        {
                            id = x.Character.Id,
                            mal_id = x.Character.MalId,
                            name = x.Character.Name,
                            role = x.Role,
                            images = new
                            {
                                jpg = new
                                {
                                    image_url = x.Character.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                                            ?? x.Character.Images.FirstOrDefault()?.ImageUrl ?? ""
                                }
                            }
                        },
                        language = x.Language
                    })
                    .ToList();

                var primaryLanguage = person.CharacterVoices
                    .GroupBy(cv => cv.Language)
                    .OrderByDescending(g => g.Count())
                    .Select(g => g.Key)
                    .FirstOrDefault() ?? "Japanese";

                return new
                {
                    id = person.Id,
                    mal_id = person.MalId,
                    name = person.Name,
                    url = person.Url,
                    primary_language = primaryLanguage,
                    images = new
                    {
                        jpg = new
                        {
                            image_url = jpgImg
                        }
                    },
                    voice_roles = voiceRoles,
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
                    }).ToList()
                };
            }, TimeSpan.FromMinutes(30));
        }

        public async Task<object> GetAllPeopleAsync(int page = 1, int pageSize = 50)
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
                    image = p.Images.OrderBy(i => i.Format).Select(i => i.ImageUrl).FirstOrDefault(),
                    roles_count = p.CharacterVoices.Count()
                })
                .ToListAsync();

            return new
            {
                pagination = new
                {
                    total_items = totalItems,
                    current_page = page,
                    page_size = pageSize,
                    total_pages = (int)Math.Ceiling(totalItems / (double)pageSize)
                },
                data = people
            };
        }
    }
}
