using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Kiroku.Domain.Entities
{
    public class UserAnimeList
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        [ForeignKey("Anime")]
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;

        public string Status { get; set; } = "Plan to Watch";
        public int Score { get; set; } = 0;
    }
}
