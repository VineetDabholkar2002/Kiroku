using System.Text.Json.Serialization;

namespace Kiroku.Application.DTOs
{
    public class ImageDto
    {
        [JsonPropertyName("jpg")]
        public ImageSetDto Jpg { get; set; } = new();

        [JsonPropertyName("webp")]
        public ImageSetDto Webp { get; set; } = new();
    }

    public class ImageSetDto
    {
        [JsonPropertyName("image_url")]
        public string ImageUrl { get; set; } = string.Empty;

        [JsonPropertyName("small_image_url")]
        public string SmallImageUrl { get; set; } = string.Empty;
    }
}
