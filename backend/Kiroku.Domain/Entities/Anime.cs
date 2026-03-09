using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Kiroku.Domain.Entities
{
    [Table("Animes")]
    public class Anime
    {
        [Key]
        public int Id { get; set; }
        public int MalId { get; set; }
        public string? Url { get; set; }
        public bool Approved { get; set; }

        // Titles & Synonyms
        public ICollection<AnimeTitle> Titles { get; set; } = new List<AnimeTitle>();
        public ICollection<AnimeTitleSynonym> TitleSynonyms { get; set; } = new List<AnimeTitleSynonym>();

        // Images
        public ICollection<AnimeImage> Images { get; set; } = new List<AnimeImage>();

        // Trailer (1:1)
        public int? TrailerId { get; set; }
        public Trailer? Trailer { get; set; }

        // Main fields
        public string? Title { get; set; }
        public string? TitleEnglish { get; set; }
        public string? TitleJapanese { get; set; }
        public string? Type { get; set; }
        public string? Source { get; set; }
        public int? Episodes { get; set; }
        public string? Status { get; set; }
        public bool Airing { get; set; }
        public string? Duration { get; set; }
        public string? Rating { get; set; }
        public double? Score { get; set; }
        public int? ScoredBy { get; set; }
        public int? Rank { get; set; }
        public int? Popularity { get; set; }
        public int? Members { get; set; }
        public int? Favorites { get; set; }
        public string? Synopsis { get; set; }
        public string? Background { get; set; }
        public string? Season { get; set; }
        public int? Year { get; set; }

        // Broadcast (1:1)
        public int? BroadcastId { get; set; }
        public Broadcast? Broadcast { get; set; }

        // Aired (1:1)
        public int? AiredId { get; set; }
        public Aired? Aired { get; set; }

        // External/streaming links
        public ICollection<ExternalLink> ExternalLinks { get; set; } = new List<ExternalLink>();
        public ICollection<StreamingLink> StreamingLinks { get; set; } = new List<StreamingLink>();

        // Studios, Producers, Licensors (Many-to-many)
        public ICollection<AnimeStudio> AnimeStudios { get; set; } = new List<AnimeStudio>();
        public ICollection<AnimeProducer> AnimeProducers { get; set; } = new List<AnimeProducer>();
        public ICollection<AnimeLicensor> AnimeLicensors { get; set; } = new List<AnimeLicensor>();

        // Genres etc. (Many-to-many)
        public ICollection<AnimeGenre> AnimeGenres { get; set; } = new List<AnimeGenre>();

        // Theme Entries (openings/endings) 
        public ICollection<ThemeEntry> ThemeEntries { get; set; } = new List<ThemeEntry>();

        // Relations
        public ICollection<Relation> Relations { get; set; } = new List<Relation>();
    }

    // ==== Titles & Synonyms ====
    public class AnimeTitle
    {
        [Key]
        public int Id { get; set; }
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public string? Type { get; set; }
        public string? Title { get; set; }
    }

    public class AnimeTitleSynonym
    {
        [Key]
        public int Id { get; set; }
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public string? Synonym { get; set; }
    }

    // ===== Images =====
    public class AnimeImage
    {
        [Key]
        public int Id { get; set; }
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public string? Format { get; set; } // "jpg" / "webp"
        public string? ImageUrl { get; set; }
        public string? SmallImageUrl { get; set; }
        public string? LargeImageUrl { get; set; }
    }

    // ==== Trailer ====
    public class Trailer
    {
        [Key]
        public int Id { get; set; }
        public string? YoutubeId { get; set; }
        public string? Url { get; set; }
        public string? EmbedUrl { get; set; }
        public int? TrailerImagesId { get; set; }
        public TrailerImages? Images { get; set; }
    }
    public class TrailerImages
    {
        [Key]
        public int Id { get; set; }
        public string? ImageUrl { get; set; }
        public string? SmallImageUrl { get; set; }
        public string? MediumImageUrl { get; set; }
        public string? LargeImageUrl { get; set; }
        public string? MaximumImageUrl { get; set; }
    }

    // ==== Broadcast, Aired, etc ====
    public class Broadcast
    {
        [Key]
        public int Id { get; set; }
        public string? Day { get; set; }
        public string? Time { get; set; }
        public string? Timezone { get; set; }
        public string? String { get; set; }
    }

    public class Aired
    {
        [Key]
        public int Id { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? String { get; set; }
        public int? PropId { get; set; }
        public AiredProp? Prop { get; set; }
    }

    public class AiredProp
    {
        [Key]
        public int Id { get; set; }
        public int? FromId { get; set; }
        public AiredPropDate? From { get; set; }
        public int? ToId { get; set; }
        public AiredPropDate? To { get; set; }
    }

    public class AiredPropDate
    {
        [Key]
        public int Id { get; set; }
        public int? Day { get; set; }
        public int? Month { get; set; }
        public int? Year { get; set; }
    }

    // ==== External & Streaming Links ====
    public class ExternalLink
    {
        [Key]
        public int Id { get; set; }
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public string? Name { get; set; }
        public string? Url { get; set; }
    }

    public class StreamingLink
    {
        [Key]
        public int Id { get; set; }
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public string? Name { get; set; }
        public string? Url { get; set; }
    }

    // ==== Studios, Producers, Licensors (Many-to-many) ====
    public class Studio
    {
        [Key]
        public int Id { get; set; }
        public int MalId { get; set; }
        public string? Name { get; set; }
        public ICollection<AnimeStudio> AnimeStudios { get; set; } = new List<AnimeStudio>();
    }


    public class AnimeStudio
    {
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public int StudioId { get; set; }
        public Studio Studio { get; set; } = null!;
    }


    public class Producer
    {
        [Key]
        public int Id { get; set; }
        public int MalId { get; set; }
        public string? Name { get; set; }
        public ICollection<AnimeProducer> AnimeProducers { get; set; } = new List<AnimeProducer>();
    }


    public class AnimeProducer
    {
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public int ProducerId { get; set; }
        public Producer Producer { get; set; } = null!;
    }

    public class Licensor
    {
        [Key]
        public int Id { get; set; }
        public int MalId { get; set; }
        public string? Name { get; set; }
        public ICollection<AnimeLicensor> AnimeLicensors { get; set; } = new List<AnimeLicensor>();
    }
    public class AnimeLicensor
    {
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public int LicensorId { get; set; }
        public Licensor Licensor { get; set; } = null!;
    }

    // ==== Genres, ExplicitGenres, Themes, Demographics (Many-to-many via a join table) ====
    public class Genre
    {
        [Key]
        public int Id { get; set; }
        public int MalId { get; set; }
        public string? Name { get; set; }
        public string? Type { get; set; } // genre, theme, demographic, explicit_genre
        public ICollection<AnimeGenre> AnimeGenres{ get; set; } = new List<AnimeGenre>();
    }
    public class AnimeGenre
    {
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public int GenreId { get; set; }
        public Genre Genre { get; set; } = null!;
    }

    // ==== Theme Entries (Openings & Endings) ====
    public class ThemeEntry
    {
        [Key]
        public int Id { get; set; }
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public string? Category { get; set; } // "opening"/"ending"
        public int Sequence { get; set; }
        public string? RawText { get; set; }
    }

    // ==== Relations ====
    public class Relation
    {
        [Key]
        public int Id { get; set; }
        public int AnimeId { get; set; }
        public Anime Anime { get; set; } = null!;
        public string? RelationType { get; set; }
        public ICollection<RelationEntry> Entries { get; set; } = new List<RelationEntry>();
    }

    public class RelationEntry
    {
        [Key]
        public int Id { get; set; }
        public int RelationId { get; set; }
        public Relation Relation { get; set; } = null!;
        public int MalId { get; set; }
        public string? EntryType { get; set; }
        public string? Name { get; set; }
        public string? Url { get; set; }
    }
}
