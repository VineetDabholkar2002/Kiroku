using Kiroku.Application.Interfaces;
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
            return await context.Users.FirstOrDefaultAsync(u => EF.Functions.ILike(u.Username, username.Trim()));
        }

        public async Task<User?> AuthenticateUser(string username, string password)
        {
            await using var context = await _contextFactory.CreateDbContextAsync();
            var user = await context.Users.FirstOrDefaultAsync(u => EF.Functions.ILike(u.Username, username.Trim()));
            if (user == null || string.IsNullOrEmpty(user.Password)) return null;

            bool isValid = false;
            if (user.Password.StartsWith("$2a$") || user.Password.StartsWith("$2b$") || user.Password.StartsWith("$2y$"))
            {
                try
                {
                    isValid = BCrypt.Net.BCrypt.Verify(password, user.Password);
                }
                catch
                {
                    isValid = false;
                }
            }
            else
            {
                // Match legacy plain text and automatically upgrade to secure BCrypt hash
                isValid = (user.Password == password);
                if (isValid)
                {
                    user.Password = BCrypt.Net.BCrypt.HashPassword(password);
                    await context.SaveChangesAsync();
                }
            }

            return isValid ? user : null;
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

            var user = await context.Users.FirstOrDefaultAsync(u => EF.Functions.ILike(u.Username, username.Trim()));
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

        public async Task<bool> DeleteUserAnimeListItem(string username, int animeMalId)
        {
            await using var context = await _contextFactory.CreateDbContextAsync();

            var user = await context.Users.FirstOrDefaultAsync(u => EF.Functions.ILike(u.Username, username.Trim()));
            if (user == null) return false;

            var anime = await context.Animes.FirstOrDefaultAsync(a => a.MalId == animeMalId);
            if (anime == null) return false;

            var entry = await context.UserAnimeLists
                .FirstOrDefaultAsync(ua => ua.UserId == user.Id && ua.AnimeId == anime.Id);

            if (entry == null) return false;

            context.UserAnimeLists.Remove(entry);
            await context.SaveChangesAsync();
            return true;
        }

        public async Task<List<User>> GetUsersWithAnimeLists()
        {
            await using var context = await _contextFactory.CreateDbContextAsync();
            // Set extended timeout for large recommendation computation queries
            context.Database.SetCommandTimeout(120);
            
            return await context.Users
                .Where(u => u.AnimeList.Any())
                .Include(u => u.AnimeList)
                .ThenInclude(ua => ua.Anime)
                .ThenInclude(a => a.Images)
                .Include(u => u.AnimeList)
                .ThenInclude(ua => ua.Anime)
                .ThenInclude(a => a.AnimeGenres)
                .ThenInclude(ag => ag.Genre)
                .AsSplitQuery() // Prevents Cartesian explosion from multiple includes
                .ToListAsync();
        }

    }
}
