using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Kiroku.Domain.Entities
{
    [Table("Mangas")]
    public class Manga
    {
        [Key]
        [JsonPropertyName("mal_id")]
        public int Id { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("image_url")]
        public string ImageUrl { get; set; }


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
        public List<Person> Authors { get; set; } = new();
    }
}
