using Kiroku.Application.Services;
using Kiroku.Data.Contexts;
using Kiroku.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Kiroku.Infrastructure.Data.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly IDbContextFactory<AppDbContext> _contextFactory;

        public UserRepository(IDbContextFactory<AppDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<User?> GetUserById(int userId)
        {
            await using var context = await _contextFactory.CreateDbContextAsync();
            return await context.Users
                .Include(u => u.AnimeList)
                .ThenInclude(ua => ua.Anime)
                .ThenInclude(a => a.Images)
                .Include(u => u.AnimeList)
                .ThenInclude(ua => ua.Anime)
                .ThenInclude(a => a.AnimeGenres)
                .ThenInclude(ag => ag.Genre)
                .FirstOrDefaultAsync(u => u.Id == userId);
        }

        public async Task<User?> GetUserByUsername(string username)
        {
            await using var context = await _contextFactory.CreateDbContextAsync();
            return await context.Users.FirstOrDefaultAsync(u => u.Username == username);
        }

        public async Task<User?> AuthenticateUser(string username, string password)
        {
            await using var context = await _contextFactory.CreateDbContextAsync();
            return await context.Users.FirstOrDefaultAsync(u =>
                u.Username == username && u.Password == password);
        }

        public async Task<List<UserAnimeList>> GetUserAnimeList(int userId)
        {
            await using var context = await _contextFactory.CreateDbContextAsync();
            return await context.UserAnimeLists
                .Where(ua => ua.UserId == userId)
                .Include(ua => ua.Anime)
                .ThenInclude(a => a.Images)
                .Include(ua => ua.Anime)
                .ThenInclude(a => a.AnimeGenres)
                .ThenInclude(ag => ag.Genre)
                .OrderBy(ua => ua.Anime.Title)
                .ToListAsync();
        }

        public async Task<UserAnimeList?> UpsertUserAnimeListItem(string username, int animeMalId, string status, int score)
        {
            await using var context = await _contextFactory.CreateDbContextAsync();

            var user = await context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return null;

            var anime = await context.Animes
                .Include(a => a.Images)
                .Include(a => a.AnimeGenres)
                .ThenInclude(ag => ag.Genre)
                .FirstOrDefaultAsync(a => a.MalId == animeMalId);

            if (anime == null) return null;

            var entry = await context.UserAnimeLists
                .Include(ua => ua.Anime)
                .ThenInclude(a => a.Images)
                .Include(ua => ua.Anime)
                .ThenInclude(a => a.AnimeGenres)
                .ThenInclude(ag => ag.Genre)
                .FirstOrDefaultAsync(ua => ua.UserId == user.Id && ua.AnimeId == anime.Id);

            if (entry == null)
            {
                entry = new UserAnimeList
                {
                    UserId = user.Id,
                    AnimeId = anime.Id,
                    Status = status,
                    Score = score,
                    Anime = anime,
                    User = user,
                };
                context.UserAnimeLists.Add(entry);
            }
            else
            {
                entry.Status = status;
                entry.Score = score;
            }

            await context.SaveChangesAsync();
            return entry;
        }

        public async Task<List<User>> GetUsersWithAnimeLists()
        {
            await using var context = await _contextFactory.CreateDbContextAsync();
            return await context.Users
                .Include(u => u.AnimeList)
                .ThenInclude(ua => ua.Anime)
                .ThenInclude(a => a.Images)
                .Include(u => u.AnimeList)
                .ThenInclude(ua => ua.Anime)
                .ThenInclude(a => a.AnimeGenres)
                .ThenInclude(ag => ag.Genre)
                .Where(u => u.AnimeList.Any())
                .ToListAsync();
        }
    }
}
