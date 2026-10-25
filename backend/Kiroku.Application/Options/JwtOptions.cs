namespace Kiroku.Application.Options
{
    public sealed class JwtOptions
    {
        public const string SectionName = "Jwt";

        public string Secret { get; set; } = "Kiroku_Anime_Super_Secure_JWT_Secret_Key_2026_9999";
        public string Issuer { get; set; } = "KirokuAPI";
        public string Audience { get; set; } = "KirokuApp";
        public int ExpirationHours { get; set; } = 72;
    }
}
