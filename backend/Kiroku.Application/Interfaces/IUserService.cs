using Kiroku.Application.DTOs;
using Kiroku.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Kiroku.Application.Interfaces
{
    public interface IUserService
    {
        Task<UserDTO?> GetUserProfile(int userId);
        Task<User?> GetUserByUsername(string username);
        Task<LoginResponseDto?> AuthenticateUser(string username, string password);
        Task<List<UserAnimeListDTO>> GetUserAnimeList(int userId);
        Task<List<UserAnimeListDTO>?> GetUserAnimeListByUsername(string username);
        Task<UserAnimeListDTO?> UpsertUserAnimeListItem(string username, int animeMalId, string status, int score);
        Task<bool> DeleteUserAnimeListItem(string username, int animeMalId);
        Task<UserRecommendationsDto?> GetUserRecommendations(string username);
    }
}
