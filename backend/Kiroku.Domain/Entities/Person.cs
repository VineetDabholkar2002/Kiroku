using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Kiroku.Domain.Entities
{
    [Table("People")]

    public class Person
    {
        public int Id { get; set; }
        public int MalId { get; set; }
        public string Name { get; set; } = "";
        public string Url { get; set; } = "";
        public ICollection<PersonImage> Images { get; set; } = new List<PersonImage>();
        public ICollection<CharacterVoice> CharacterVoices { get; set; } = new List<CharacterVoice>();
    }

    [Table("PersonImages")]
    public class PersonImage
    {
        public int Id { get; set; }
        public string Format { get; set; } = ""; 
        public string ImageUrl { get; set; } = "";
        public int PersonId { get; set; }
        public Person Person { get; set; }
    }

    [Table("CharacterVoices")]
    public class CharacterVoice
    {
        public int Id { get; set; }
        public int CharacterId { get; set; }
        public Character Character { get; set; }

        public int PersonId { get; set; }
        public Person Person { get; set; }

        public string Language { get; set; } = "";
    }
}
