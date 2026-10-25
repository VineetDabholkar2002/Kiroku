using Kiroku.Application.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;

namespace Kiroku.Infrastructure.Services
{
    public class RedisCacheService : ICacheService
    {
        private readonly IDistributedCache _cache;
        private readonly ILogger<RedisCacheService> _logger;
        private static readonly ConcurrentDictionary<string, (string Json, DateTime ExpiresAt)> MemoryFallback = new();

        public RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger)
        {
            _cache = cache;
            _logger = logger;
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            try
            {
                var cached = await _cache.GetStringAsync(key);
                if (!string.IsNullOrEmpty(cached))
                {
                    return JsonConvert.DeserializeObject<T>(cached);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis read failed for key '{Key}'. Checking in-memory fallback", key);
            }

            // Check in-memory fallback
            if (MemoryFallback.TryGetValue(key, out var fallbackItem))
            {
                if (fallbackItem.ExpiresAt > DateTime.UtcNow)
                {
                    try
                    {
                        return JsonConvert.DeserializeObject<T>(fallbackItem.Json);
                    }
                    catch
                    {
                        return default;
                    }
                }
                else
                {
                    MemoryFallback.TryRemove(key, out _);
                }
            }

            return default;
        }

        public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T?>> fetch, TimeSpan? expiry = null)
        {
            var cached = await GetAsync<T>(key);
            if (cached != null)
                return cached;

            T? result;
            try
            {
                result = await fetch();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing cache factory function for key '{Key}'", key);
                throw;
            }

            if (result != null)
            {
                await SetAsync(key, result, expiry);
            }

            return result;
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
        {
            var ttl = expiry ?? TimeSpan.FromMinutes(30);
            var json = JsonConvert.SerializeObject(value);

            // Always store in memory fallback so state/tokens survive Redis hiccups
            MemoryFallback[key] = (json, DateTime.UtcNow.Add(ttl));

            try
            {
                await _cache.SetStringAsync(key, json, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = ttl
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis write failed for key '{Key}' (relying on in-memory fallback)", key);
            }
        }

        public async Task RemoveAsync(string key)
        {
            MemoryFallback.TryRemove(key, out _);

            try
            {
                await _cache.RemoveAsync(key);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis remove failed for key '{Key}'", key);
            }
        }
    }
}
