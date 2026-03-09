using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Kiroku.Application.DTOs
{
    public class RecommendationDto
    {
        public Entry Entry { get; set; }
        public int Votes { get; set; }
    }

    public class RecommendationsResponse
    {
        public List<RecommendationDto> Data { get; set; }
    }

    public class Entry
    {
        public int MalId { get; set; }
        public string Title { get; set; }
        public ImageSet Images { get; set; }
    }

    public class ImageSet
    {
        public JpgImage Jpg { get; set; }
    }

    public class JpgImage
    {
        [JsonProperty("large_image_url")]
        public string LargeImageUrl { get; set; }

        [JsonProperty("small_image_url")]
        public string SmallImageUrl { get; set; }

        [JsonProperty("image_url")]
        public string ImageUrl { get; set; }
    }


}
