using Kiroku.Application.DTOs;
using Kiroku.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Kiroku.Application.Services
{
public interface IUserRepository
{
    Task<User?> GetUserById(int userId);
    Task<User?> GetUserByUsername(string username);
    Task<User?> AuthenticateUser(string username, string password);
    Task<List<UserAnimeList>> GetUserAnimeList(int userId);
}

    public class UserService
    {
        private readonly IUserRepository _userRepository;
        public UserService(IUserRepository userRepository) => _userRepository = userRepository;

        public async Task<UserDTO?> GetUserProfile(int userId)
        {
            var user = await _userRepository.GetUserById(userId);
            if (user == null) return null;

            return new UserDTO
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                ProfilePicture = user.ProfilePicture
            };
        }

        public async Task<User?> GetUserByUsername(string username)
            => await _userRepository.GetUserByUsername(username);

        public async Task<User?> AuthenticateUser(string username, string password)
            => await _userRepository.AuthenticateUser(username, password);

        public async Task<List<UserAnimeListDTO>> GetUserAnimeList(int userId)
        {
            var animeList = await _userRepository.GetUserAnimeList(userId);
            return animeList.Select(a => new UserAnimeListDTO
            {
                AnimeId = a.AnimeId,
                AnimeTitle = a.Anime.Title,
                Status = a.Status,
                Score = a.Score
            }).ToList();
        }
    }
}
