using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Kiroku.Application.DTOs
{
    public class PersonDto
    {
        [JsonPropertyName("mal_id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("images")]
        public ImageDto Images { get; set; } = new();

        [JsonPropertyName("favorites")]
        public int Favorites { get; set; }

        [JsonPropertyName("about")]
        public string? About { get; set; }

        [JsonPropertyName("voice_acting_roles")]
        public List<VoiceActorDto> VoiceActingRoles { get; set; } = new();
    }
}
