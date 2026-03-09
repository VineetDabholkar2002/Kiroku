using System;
using System.Threading.Tasks;

namespace Kiroku.Application.Services
{
    public interface ICacheService
    {
        Task<T?> GetOrSetAsync<T>(string key, Func<Task<T?>> fetch, TimeSpan? expiry = null);
        Task<T?> GetAsync<T>(string key);
        Task SetAsync<T>(string key, T value, TimeSpan? expiry = null);
        Task RemoveAsync(string key);
    }
}
