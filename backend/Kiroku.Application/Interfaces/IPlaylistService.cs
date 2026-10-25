using System.Collections.Generic;
using System.Threading.Tasks;
using Kiroku.Application.DTOs;

namespace Kiroku.Application.Interfaces
{
    public interface IPlaylistService
    {
        Task<List<UserSuggestionDto>> SuggestUsersAsync(string query, int limit = 6);
        Task<List<PlaylistSongDto>?> GetPlaylistSongsAsync(string username);
    }
}
