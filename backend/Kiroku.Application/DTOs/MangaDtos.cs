using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Kiroku.Application.DTOs
{
    public class MangaDto
    {
        [JsonPropertyName("mal_id")]
        public int Id { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("images")]
        public ImageDto Images { get; set; } = new();

        [JsonPropertyName("synopsis")]
        public string? Synopsis { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("chapters")]
        public int? Chapters { get; set; }

        [JsonPropertyName("volumes")]
        public int? Volumes { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("authors")]
        public List<PersonDto> Authors { get; set; } = new();
    }
}
