using System.Threading.Tasks;
using Kiroku.Application.DTOs;

namespace Kiroku.Application.Interfaces
{
    public interface IAnimeService
    {
        Task<PagedResult<AnimeDto>?> GetPopularAnimeAsync(int page = 1, int perPage = 25);
        Task<PagedResult<AnimeDto>?> GetTopRatedAnimeAsync(int page = 1, int perPage = 25);
        Task<PagedResult<AnimeDto>?> GetAiringAnimeAsync(int page = 1, int perPage = 25);
        Task<PagedResult<AnimeDto>?> GetUpcomingAnimeAsync(int page = 1, int perPage = 25);
        Task<PagedResult<AnimeDto>?> GetTopFavouritedAnimeAsync(int page = 1, int perPage = 25);
        Task<PagedResult<AnimeDto>?> SearchAnimeAsync(string query, int page = 1, int perPage = 25);
        Task<PagedResult<AnimeDto>?> GetAnimeByGenreAsync(int genreId, int page = 1, int perPage = 25);
        Task<PagedResult<AnimeDto>?> GetAnimeByStudioAsync(int studioId, int page = 1, int perPage = 25);
        Task<object> GetTagsAsync(string? type = null, int limit = 100);
        Task<AnimeDto?> GetAnimeByIdAsync(int id);
        Task<AnimeDto?> GetRandomAnimeAsync();
        Task<object> GetCharactersAsync(int animeMalId);
        Task<object?> GetPersonByMalIdAsync(int personMalId);
        Task<RecommendationsResponse?> GetRecommendationsAsync(int animeMalId);
        Task<AnimeThemesDto?> GetAnimeThemesAsync(int animeMalId);
        Task<List<AnimeSoundtrackSongDto>> GetAnimeSoundtracksAsync(int animeMalId);
    }
}
