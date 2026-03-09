using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Kiroku.Domain.Entities
{
    [Table("Characters")]
    public class Character
    {
        [Key]
        public int Id { get; set; }          // Serial PK (for local joins)
        public int MalId { get; set; }       // MAL character ID (unique)
        public string Name { get; set; } = "";
        public string Url { get; set; } = "";
        public int Favorites { get; set; }

        public ICollection<CharacterImage> Images { get; set; } = new List<CharacterImage>();
        public ICollection<AnimeCharacter> AnimeCharacters { get; set; } = new List<AnimeCharacter>();
        public ICollection<CharacterVoice> CharacterVoices { get; set; } = new List<CharacterVoice>();
    }

    [Table("CharacterImages")]
    public class CharacterImage
    {
        public int Id { get; set; }
        public int CharacterId { get; set; }
        public string Format { get; set; }
        public string ImageUrl { get; set; }

        public Character Character { get; set; }
    }

    [Table("AnimeCharacters")] // join: anime <-> character
    public class AnimeCharacter
    {
        public int Id { get; set; }
        public int AnimeId { get; set; }
        public Anime Anime { get; set; }

        public int CharacterId { get; set; }
        public Character Character { get; set; }

        public string Role { get; set; } = "";
        public int Favorites { get; set; }
    }

}
