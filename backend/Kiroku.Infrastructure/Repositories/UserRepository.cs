using Kiroku.Data.Contexts;
using Kiroku.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Kiroku.Infrastructure.Data.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetUserById(int userId);
        Task<User?> GetUserByUsername(string username);
        Task<User?> AuthenticateUser(string username, string password);
        Task<List<UserAnimeList>> GetUserAnimeList(int userId);
    }

    public class UserRepository
    {
        private readonly AppDbContext _context;

        public UserRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetUserById(int userId)
        {
            return await _context.Users.Include(u => u.AnimeList)
                                       .ThenInclude(ua => ua.Anime)
                                       .FirstOrDefaultAsync(u => u.Id == userId);
        }

        public async Task<List<UserAnimeList>> GetUserAnimeList(int userId)
        {
            return await _context.UserAnimeLists
                                 .Where(ua => ua.UserId == userId)
                                 .Include(ua => ua.Anime)
                                 .ToListAsync();
        }
        public async Task<User?> AuthenticateUser(string username, string password)
        {
           return await _context.Users.FirstOrDefaultAsync(u =>
               u.Username == username && u.Password == password);
        }
        public async Task<User?> GetUserByUsername(string username)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        }

    }
}
