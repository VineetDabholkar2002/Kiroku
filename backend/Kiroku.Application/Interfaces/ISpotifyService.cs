using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace Kiroku.Application.Interfaces
{
    public interface ISpotifyService
    {
        Task<JObject> SearchTrackAsync(string trackName, string? artist = null);
        Task<JObject> SearchTracksAsync(string query, int limit = 20);
    }
}
