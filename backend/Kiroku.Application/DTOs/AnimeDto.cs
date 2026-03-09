public class AnimeDto
{
    public int Id { get; set; }
    public int MalId { get; set; }
    public string Url { get; set; }
    public bool Approved { get; set; }

    // Main fields
    public string Title { get; set; }
    public string TitleEnglish { get; set; }
    public string TitleJapanese { get; set; }
    public string Type { get; set; }
    public string Source { get; set; }
    public int? Episodes { get; set; }
    public string Status { get; set; }
    public bool Airing { get; set; }
    public string Duration { get; set; }
    public string Rating { get; set; }
    public double? Score { get; set; }
    public int? ScoredBy { get; set; }
    public int? Rank { get; set; }
    public int? Popularity { get; set; }
    public int? Members { get; set; }
    public int? Favorites { get; set; }
    public string Synopsis { get; set; }
    public string Background { get; set; }
    public string Season { get; set; }
    public int? Year { get; set; }

    // Titles/Synonyms
    public List<AnimeTitleDto> Titles { get; set; } = new();
    public List<string> TitleSynonyms { get; set; } = new();

    // Images
    public List<AnimeImageDto> Images { get; set; } = new();

    // Trailer
    public TrailerDto Trailer { get; set; }

    // Broadcast and Aired
    public BroadcastDto Broadcast { get; set; }
    public AiredDto Aired { get; set; }

    // External/streaming links
    public List<ExternalLinkDto> ExternalLinks { get; set; } = new();
    public List<StreamingLinkDto> StreamingLinks { get; set; } = new();

    // Studios, Producers, Licensors
    public List<StudioDto> Studios { get; set; } = new();
    public List<ProducerDto> Producers { get; set; } = new();
    public List<LicensorDto> Licensors { get; set; } = new();

    // Genres, ExplicitGenres, Themes, Demographics
    public List<GenreDto> Genres { get; set; } = new();
    public List<GenreDto> ExplicitGenres { get; set; } = new();
    public List<GenreDto> Themes { get; set; } = new();
    public List<GenreDto> Demographics { get; set; } = new();

    // Theme Entries (openings/endings)
    public List<ThemeEntryDto> ThemeEntries { get; set; } = new();

    // Relations
    public List<RelationDto> Relations { get; set; } = new();
}

public class AnimeTitleDto
{
    public string Type { get; set; }
    public string Title { get; set; }
}

public class AnimeImageDto
{
    public string Format { get; set; }
    public string ImageUrl { get; set; }
    public string SmallImageUrl { get; set; }
    public string LargeImageUrl { get; set; }
}

public class TrailerDto
{
    public string YoutubeId { get; set; }
    public string Url { get; set; }
    public string EmbedUrl { get; set; }
    public TrailerImagesDto Images { get; set; }
}

public class TrailerImagesDto
{
    public string ImageUrl { get; set; }
    public string SmallImageUrl { get; set; }
    public string MediumImageUrl { get; set; }
    public string LargeImageUrl { get; set; }
    public string MaximumImageUrl { get; set; }
}

public class BroadcastDto
{
    public string Day { get; set; }
    public string Time { get; set; }
    public string Timezone { get; set; }
    public string String { get; set; }
}

public class AiredDto
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string String { get; set; }
    public AiredPropDto Prop { get; set; }
}
public class AiredPropDto
{
    public AiredPropDateDto From { get; set; }
    public AiredPropDateDto To { get; set; }
}
public class AiredPropDateDto
{
    public int? Day { get; set; }
    public int? Month { get; set; }
    public int? Year { get; set; }
}

public class ExternalLinkDto
{
    public string Name { get; set; }
    public string Url { get; set; }
}
public class StreamingLinkDto
{
    public string Name { get; set; }
    public string Url { get; set; }
}
public class StudioDto
{
    public int MalId { get; set; }
    public string Name { get; set; }
}
public class ProducerDto
{
    public int MalId { get; set; }
    public string Name { get; set; }
}
public class LicensorDto
{
    public int MalId { get; set; }
    public string Name { get; set; }
}
public class GenreDto
{
    public int MalId { get; set; }
    public string Name { get; set; }
    public string Type { get; set; }
}
public class ThemeEntryDto
{
    public string Category { get; set; } // Opening/Ending
    public int Sequence { get; set; }
    public string RawText { get; set; }
}
public class AnimeThemesDto
{
    public List<string> Openings { get; set; } = new();
    public List<string> Endings { get; set; } = new();
}

public class RelationDto
{
    public string RelationType { get; set; }
    public List<RelationEntryDto> Entries { get; set; } = new();
}
public class RelationEntryDto
{
    public int MalId { get; set; }
    public string EntryType { get; set; }
    public string Name { get; set; }
    public string Url { get; set; }
}
