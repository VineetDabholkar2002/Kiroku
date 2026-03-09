using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Kiroku.Application.DTOs
{
    public class CharacterDto
    {
        [JsonPropertyName("mal_id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("images")]
        public ImageDto Images { get; set; } = new();

        [JsonPropertyName("nicknames")]
        public List<string> Nicknames { get; set; } = new();

        [JsonPropertyName("favorites")]
        public int Favorites { get; set; }

        [JsonPropertyName("anime")]
        public List<AnimeDto> Anime { get; set; } = new();

        [JsonPropertyName("manga")]
        public List<MangaDto> Manga { get; set; } = new();

        [JsonPropertyName("voices")]
        public List<VoiceActorDto> Voices { get; set; } = new();
    }
}
