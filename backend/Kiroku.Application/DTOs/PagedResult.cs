using System.Collections.Generic;
using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Kiroku.Application.DTOs
{
    public class PagedResult<T>
    {
        [JsonProperty("pagination")]
        [JsonPropertyName("pagination")]
        public PaginationMetadata Pagination { get; set; } = new();

        [JsonProperty("data")]
        [JsonPropertyName("data")]
        public List<T> Data { get; set; } = new();
    }

    public class PaginationMetadata
    {
        [JsonProperty("last_visible_page")]
        [JsonPropertyName("last_visible_page")]
        public int LastVisiblePage { get; set; }

        [JsonProperty("has_next_page")]
        [JsonPropertyName("has_next_page")]
        public bool HasNextPage { get; set; }

        [JsonProperty("current_page")]
        [JsonPropertyName("current_page")]
        public int CurrentPage { get; set; }

        [JsonProperty("items")]
        [JsonPropertyName("items")]
        public PaginationItems Items { get; set; } = new();
    }

    public class PaginationItems
    {
        [JsonProperty("count")]
        [JsonPropertyName("count")]
        public int Count { get; set; }

        [JsonProperty("total")]
        [JsonPropertyName("total")]
        public int Total { get; set; }

        [JsonProperty("per_page")]
        [JsonPropertyName("per_page")]
        public int PerPage { get; set; }
    }
}
