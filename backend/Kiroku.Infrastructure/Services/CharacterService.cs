using System;
using System.Linq;
using System.Threading.Tasks;
using Kiroku.Application.Interfaces;
using Kiroku.Application.Services;
using Kiroku.Data.Contexts;
using Microsoft.EntityFrameworkCore;

namespace Kiroku.Infrastructure.Services
{
    public class CharacterService : ICharacterService
    {
        private readonly AppDbContext _context;
        private readonly ICacheService _cacheService;

        public CharacterService(AppDbContext context, ICacheService cacheService)
        {
            _context = context;
            _cacheService = cacheService;
        }

        public async Task<object?> GetCharacterByIdAsync(int id)
        {
            string cacheKey = $"CharacterDetail:{id}";

            return await _cacheService.GetOrSetAsync<object?>(cacheKey, async () =>
            {
                var character = await _context.Characters
                    .AsNoTracking()
                    .Include(c => c.Images)
                    .Include(c => c.AnimeCharacters)
                        .ThenInclude(ac => ac.Anime)
                            .ThenInclude(a => a.Images)
                    .Include(c => c.CharacterVoices)
                        .ThenInclude(cv => cv.Person)
                            .ThenInclude(p => p.Images)
                    .FirstOrDefaultAsync(c => c.MalId == id || c.Id == id);

                if (character == null)
                    return null;

                var jpgImage = character.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                            ?? character.Images.FirstOrDefault()?.ImageUrl;
                var webpImage = character.Images.FirstOrDefault(i => i.Format == "webp")?.ImageUrl;

                return new
                {
                    id = character.Id,
                    mal_id = character.MalId,
                    name = character.Name,
                    url = character.Url,
                    about = character.About ?? "",
                    favorites = character.Favorites,
                    images = new
                    {
                        jpg = new
                        {
                            image_url = jpgImage ?? "",
                            small_image_url = jpgImage ?? "",
                            large_image_url = jpgImage ?? ""
                        },
                        webp = new
                        {
                            image_url = webpImage ?? jpgImage ?? "",
                            small_image_url = webpImage ?? jpgImage ?? "",
                            large_image_url = webpImage ?? jpgImage ?? ""
                        }
                    },
                    anime = character.AnimeCharacters
                        .Where(ac => ac.Anime != null)
                        .OrderByDescending(ac => ac.Anime.Score ?? 0)
                        .Select(ac => new
                        {
                            role = ac.Role,
                            favorites = ac.Favorites,
                            anime = new
                            {
                                id = ac.Anime.Id,
                                mal_id = ac.Anime.MalId,
                                title = ac.Anime.Title,
                                title_english = ac.Anime.TitleEnglish,
                                title_japanese = ac.Anime.TitleJapanese,
                                type = ac.Anime.Type,
                                score = ac.Anime.Score,
                                status = ac.Anime.Status,
                                year = ac.Anime.Year,
                                images = new
                                {
                                    jpg = new
                                    {
                                        image_url = ac.Anime.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                                                ?? ac.Anime.Images.FirstOrDefault()?.ImageUrl ?? ""
                                    }
                                }
                            }
                        }).ToList(),
                    voice_actors = character.CharacterVoices
                        .OrderByDescending(cv => cv.Language == "Japanese")
                        .ThenBy(cv => cv.Language)
                        .Select(cv => new
                        {
                            language = cv.Language,
                            person = new
                            {
                                id = cv.Person.Id,
                                mal_id = cv.Person.MalId,
                                url = cv.Person.Url,
                                name = cv.Person.Name,
                                images = new
                                {
                                    jpg = new
                                    {
                                        image_url = cv.Person.Images.FirstOrDefault(i => i.Format == "jpg")?.ImageUrl
                                                ?? cv.Person.Images.FirstOrDefault()?.ImageUrl ?? ""
                                    }
                                }
                            }
                        }).ToList()
                };
            }, TimeSpan.FromHours(24));
        }

        public async Task<object> GetAllCharactersAsync(int page, int pageSize)
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
                    favorites = c.Favorites,
                    image = c.Images.OrderBy(i => i.Format).Select(i => i.ImageUrl).FirstOrDefault()
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
                data = characters
            };
        }
    }
}
