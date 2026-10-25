using System;
using System.Linq;
using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;

namespace Kiroku.API.Extensions
{
    public static class RateLimiterExtensions
    {
        public const string PolicyAuth = "AuthPolicy";
        public const string PolicySearch = "SearchPolicy";

        /// <summary>
        /// Registers production-grade partitioned rate limiting for Kiroku API.
        /// - Global Limiter: 120 req/min per IP across all endpoints (sliding window).
        /// - Auth Policy: 10 req/min per IP for sensitive login endpoints (fixed window).
        /// - Search Policy: 60 req/min per IP for high-frequency queries.
        /// </summary>
        public static IServiceCollection AddKirokuRateLimiting(this IServiceCollection services)
        {
            services.AddRateLimiter(options =>
            {
                // Standard HTTP 429 response formatting with Retry-After header
                options.RejectionStatusCode = (int)HttpStatusCode.TooManyRequests;
                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.ContentType = "application/json";

                    int retryAfterSeconds = 60;
                    if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    {
                        retryAfterSeconds = Math.Max(1, (int)retryAfter.TotalSeconds);
                        context.HttpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString();
                    }

                    var responsePayload = new
                    {
                        statusCode = (int)HttpStatusCode.TooManyRequests,
                        error = "Too Many Requests",
                        message = "Rate limit exceeded. Please wait a moment before sending more requests.",
                        retryAfterSeconds = retryAfterSeconds
                    };

                    await context.HttpContext.Response.WriteAsJsonAsync(responsePayload, cancellationToken: token);
                };

                // 1. Global Default Rate Limiter (Applied automatically to all endpoints)
                // 120 requests per minute per IP with sliding window of 6 segments (smooth distribution)
                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
                {
                    var clientIp = ResolveClientIp(httpContext);
                    return RateLimitPartition.GetSlidingWindowLimiter(
                        partitionKey: clientIp,
                        factory: _ => new SlidingWindowRateLimiterOptions
                        {
                            PermitLimit = 120,
                            Window = TimeSpan.FromMinutes(1),
                            SegmentsPerWindow = 6,
                            QueueLimit = 0
                        }
                    );
                });

                // 2. Strict Auth Rate Limiter (Brute-force protection: 10 login attempts per minute per IP)
                options.AddPolicy(PolicyAuth, httpContext =>
                {
                    var clientIp = ResolveClientIp(httpContext);
                    return RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: clientIp,
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 10,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0
                        }
                    );
                });

                // 3. Search Policy (60 search queries per minute per IP)
                options.AddPolicy(PolicySearch, httpContext =>
                {
                    var clientIp = ResolveClientIp(httpContext);
                    return RateLimitPartition.GetSlidingWindowLimiter(
                        partitionKey: clientIp,
                        factory: _ => new SlidingWindowRateLimiterOptions
                        {
                            PermitLimit = 60,
                            Window = TimeSpan.FromMinutes(1),
                            SegmentsPerWindow = 4,
                            QueueLimit = 0
                        }
                    );
                });
            });

            return services;
        }

        /// <summary>
        /// Extracts the real client IP address, supporting Cloudflare, NGINX, and Docker reverse proxies.
        /// </summary>
        private static string ResolveClientIp(HttpContext httpContext)
        {
            // 1. Cloudflare header
            var cfIp = httpContext.Request.Headers["CF-Connecting-IP"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(cfIp))
                return cfIp.Trim();

            // 2. Standard X-Forwarded-For header (first hop is client IP)
            var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(forwardedFor))
            {
                var ip = forwardedFor.Split(',')[0].Trim();
                if (!string.IsNullOrWhiteSpace(ip))
                    return ip;
            }

            // 3. Fallback to direct TCP connection IP
            return httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous-client";
        }
    }
}
