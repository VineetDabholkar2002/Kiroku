using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Kiroku.Domain.Entities
{
    public class User
    {
        [Key]
        public int Id { get; set; }
        public int AnimeId { get; set; }

        [Required]
        public string Username { get; set; } = string.Empty;   
        [Required]
        public string Password { get; set; } = string.Empty;     

        [Required]
        public string Email { get; set; } = string.Empty;

        public string? ProfilePicture { get; set; }

        // User's Anime List
        public ICollection<UserAnimeList> AnimeList { get; set; } = new List<UserAnimeList>();
    }
}
