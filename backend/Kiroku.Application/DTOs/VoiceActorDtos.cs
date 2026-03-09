using System.Text.Json.Serialization;

namespace Kiroku.Application.DTOs
{
    public class VoiceActorDto
    {
        [JsonPropertyName("person")]
        public PersonDto Person { get; set; } = new();

        [JsonPropertyName("language")]
        public string Language { get; set; } = string.Empty;
    }
}
