using Kiroku.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Kiroku.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetUserById(int userId);
        Task<User?> GetUserByUsername(string username);
        Task<User?> AuthenticateUser(string username, string password);
        Task<List<UserAnimeList>> GetUserAnimeList(int userId);
        Task<UserAnimeList?> UpsertUserAnimeListItem(string username, int animeMalId, string status, int score);
        Task<bool> DeleteUserAnimeListItem(string username, int animeMalId);
        Task<List<User>> GetUsersWithAnimeLists();
    }
}
