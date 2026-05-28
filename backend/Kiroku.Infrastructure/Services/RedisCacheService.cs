using Kiroku.Application.Services;
using Microsoft.Extensions.Caching.Distributed;
using Newtonsoft.Json;
using System;
using System.Threading.Tasks;

namespace Kiroku.Infrastructure.Services
{
    public class RedisCacheService : ICacheService
    {
        private readonly IDistributedCache _cache;

        public RedisCacheService(IDistributedCache cache)
        {
            _cache = cache;
        }
        public async Task<T?> GetAsync<T>(string key)
        {
            var cached = await _cache.GetStringAsync(key);
            if (string.IsNullOrEmpty(cached))
                return default;

            try
            {
                return JsonConvert.DeserializeObject<T>(cached);
            }
            catch (JsonException ex)
            {
                Console.WriteLine("Cache deserialization error for key '" + key + "': " + ex.Message);
                return default;
            }
        }

        public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T?>> fetch, TimeSpan? expiry = null)
        {
            bool cacheAvailable = true;
            try
            {
                var cached = await _cache.GetStringAsync(key);
                if (!string.IsNullOrEmpty(cached))
                    return JsonConvert.DeserializeObject<T>(cached);
            }
            catch (Exception ex)
            {
                // Cache read failed — log and fall back to fetching the data directly.
                cacheAvailable = false;
                Console.WriteLine("ERROR in cache-layer (read): " + ex.ToString());
            }

            T? result;
            try
            {
                result = await fetch();
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR in fetch(): " + ex.ToString());
                throw;
            }

            if (result != null && cacheAvailable)
            {
                try
                {
                    await SetAsync(key, result, expiry);
                }
                catch (Exception ex)
                {
                    // Cache set failed — log but don't fail the request.
                    Console.WriteLine("ERROR in cache-layer (write): " + ex.ToString());
                }
            }

            return result;
        }


        public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
        {
            await _cache.SetStringAsync(key, JsonConvert.SerializeObject(value), new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry ?? TimeSpan.FromMinutes(30)
            });
        }

        public async Task RemoveAsync(string key)
        {
            await _cache.RemoveAsync(key);
        }
    }
}
