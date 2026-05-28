using Kiroku.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Kiroku.Data.Contexts
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Anime> Animes { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<UserAnimeList> UserAnimeLists { get; set; }
        public DbSet<Manga> Mangas { get; set; }
        public DbSet<Character> Characters { get; set; }
        public DbSet<Person> People { get; set; }

        public DbSet<CharacterImage> CharacterImages { get; set; }
        public DbSet<PersonImage> PersonImages { get; set; }
        public DbSet<AnimeCharacter> AnimeCharacters { get; set; }
        public DbSet<CharacterVoice> CharacterVoices { get; set; }
        public DbSet<AnimeTitle> AnimeTitles { get; set; }
        public DbSet<AnimeTitleSynonym> AnimeTitleSynonyms { get; set; }
        public DbSet<AnimeImage> AnimeImages { get; set; }
        public DbSet<Trailer> Trailers { get; set; }
        public DbSet<TrailerImages> TrailerImages { get; set; }
        public DbSet<Broadcast> Broadcasts { get; set; }
        public DbSet<Aired> Aireds { get; set; }
        public DbSet<AiredProp> AiredProps { get; set; }
        public DbSet<AiredPropDate> AiredPropDates { get; set; }

        public DbSet<ExternalLink> ExternalLinks { get; set; }
        public DbSet<StreamingLink> StreamingLinks { get; set; }
        public DbSet<Studio> Studios { get; set; }
        public DbSet<AnimeStudio> AnimeStudios { get; set; }
        public DbSet<Producer> Producers { get; set; }
        public DbSet<AnimeProducer> AnimeProducers { get; set; }
        public DbSet<Licensor> Licensors { get; set; }
        public DbSet<AnimeLicensor> AnimeLicensors { get; set; }
        public DbSet<Genre> Genres { get; set; }
        public DbSet<AnimeGenre> AnimeGenres { get; set; }

        public DbSet<ThemeEntry> ThemeEntries { get; set; }
        public DbSet<Relation> Relations { get; set; }
        public DbSet<RelationEntry> RelationEntries { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Anime <-> Titles (one-to-many)
            modelBuilder.Entity<Anime>()
                .HasMany(a => a.Titles)
                .WithOne(t => t.Anime)
                .HasForeignKey(t => t.AnimeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Anime <-> TitleSynonyms (one-to-many)
            modelBuilder.Entity<Anime>()
                .HasMany(a => a.TitleSynonyms)
                .WithOne(ts => ts.Anime)
                .HasForeignKey(ts => ts.AnimeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Anime <-> Images (one-to-many)
            modelBuilder.Entity<Anime>()
                .HasMany(a => a.Images)
                .WithOne(img => img.Anime)
                .HasForeignKey(img => img.AnimeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Anime <-> Trailer (one-to-one)
            modelBuilder.Entity<Anime>()
                .HasOne(a => a.Trailer)
                .WithOne()
                .HasForeignKey<Anime>(a => a.TrailerId);

            // Trailer <-> TrailerImages
            modelBuilder.Entity<Trailer>()
                .HasOne(t => t.Images)
                .WithOne()
                .HasForeignKey<Trailer>(t => t.TrailerImagesId);

            // Anime <-> Broadcast (one-to-one)
            modelBuilder.Entity<Anime>()
                .HasOne(a => a.Broadcast)
                .WithOne()
                .HasForeignKey<Anime>(a => a.BroadcastId);

            // Anime <-> Aired (one-to-one)
            modelBuilder.Entity<Anime>()
                .HasOne(a => a.Aired)
                .WithOne()
                .HasForeignKey<Anime>(a => a.AiredId);

            // Aired <-> Prop
            modelBuilder.Entity<Aired>()
                .HasOne(a => a.Prop)
                .WithOne()
                .HasForeignKey<Aired>(a => a.PropId);

            // AiredProp <-> From/To
            modelBuilder.Entity<AiredProp>()
                .HasOne(ap => ap.From)
                .WithOne()
                .HasForeignKey<AiredProp>(ap => ap.FromId);

            modelBuilder.Entity<AiredProp>()
                .HasOne(ap => ap.To)
                .WithOne()
                .HasForeignKey<AiredProp>(ap => ap.ToId);

            // External, Streaming links
            modelBuilder.Entity<Anime>()
                .HasMany(a => a.ExternalLinks)
                .WithOne(l => l.Anime)
                .HasForeignKey(l => l.AnimeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Anime>()
                .HasMany(a => a.StreamingLinks)
                .WithOne(s => s.Anime)
                .HasForeignKey(s => s.AnimeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Studios/Producers/Licensors <-> Anime (many-to-many via join)
            modelBuilder.Entity<AnimeStudio>()
                .HasKey(x => new { x.AnimeId, x.StudioId });
            modelBuilder.Entity<AnimeProducer>()
                .HasKey(x => new { x.AnimeId, x.ProducerId });
            modelBuilder.Entity<AnimeLicensor>()
                .HasKey(x => new { x.AnimeId, x.LicensorId });

            modelBuilder.Entity<Anime>()
                .HasMany(a => a.AnimeStudios)
                .WithOne(s => s.Anime)
                .HasForeignKey(s => s.AnimeId);

            modelBuilder.Entity<Studio>()
                .HasMany(s => s.AnimeStudios)
                .WithOne(asd => asd.Studio)
                .HasForeignKey(asd => asd.StudioId);

            modelBuilder.Entity<Anime>()
                .HasMany(a => a.AnimeProducers)
                .WithOne(p => p.Anime)
                .HasForeignKey(p => p.AnimeId);

            modelBuilder.Entity<Producer>()
                .HasMany(p => p.AnimeProducers)
                .WithOne(ap => ap.Producer)
                .HasForeignKey(ap => ap.ProducerId);

            modelBuilder.Entity<Anime>()
                .HasMany(a => a.AnimeLicensors)
                .WithOne(l => l.Anime)
                .HasForeignKey(l => l.AnimeId);

            modelBuilder.Entity<Licensor>()
                .HasMany(l => l.AnimeLicensors)
                .WithOne(al => al.Licensor)
                .HasForeignKey(al => al.LicensorId);

            // Genres/ExplicitGenres/Themes/Demographics (many-to-many all go through AnimeGenre)
            modelBuilder.Entity<AnimeGenre>()
                .HasKey(x => new { x.AnimeId, x.GenreId });

            modelBuilder.Entity<Anime>()
                .HasMany(a => a.AnimeGenres)
                .WithOne(ag => ag.Anime)
                .HasForeignKey(ag => ag.AnimeId);

            modelBuilder.Entity<Genre>()
                .HasMany(g => g.AnimeGenres)
                .WithOne(ag => ag.Genre)
                .HasForeignKey(ag => ag.GenreId);

            // ThemeEntries (one-to-many)
            modelBuilder.Entity<Anime>()
                .HasMany(a => a.ThemeEntries)
                .WithOne(te => te.Anime)
                .HasForeignKey(te => te.AnimeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Relations (one-to-many) and RelationEntries (one-to-many)
            modelBuilder.Entity<Anime>()
                .HasMany(a => a.Relations)
                .WithOne(r => r.Anime)
                .HasForeignKey(r => r.AnimeId);

            modelBuilder.Entity<Relation>()
                .HasMany(r => r.Entries)
                .WithOne(e => e.Relation)
                .HasForeignKey(e => e.RelationId);

            // UserAnimeList (many-to-many)
            modelBuilder.Entity<UserAnimeList>()
                .HasKey(ual => new { ual.UserId, ual.AnimeId });

            modelBuilder.Entity<UserAnimeList>()
                .HasOne(ual => ual.User)
                .WithMany(u => u.AnimeList)
                .HasForeignKey(ual => ual.UserId);

            modelBuilder.Entity<UserAnimeList>()
                .HasOne(ual => ual.Anime)
                .WithMany()
                .HasForeignKey(ual => ual.AnimeId);

            modelBuilder.Entity<CharacterVoice>()
                .HasKey(cv => new { cv.CharacterId, cv.PersonId, cv.Language });

            modelBuilder.Entity<CharacterVoice>()
                .HasOne(cv => cv.Character)
                .WithMany(c => c.CharacterVoices)
                .HasForeignKey(cv => cv.CharacterId);

            modelBuilder.Entity<CharacterVoice>()
                .HasOne(cv => cv.Person)
                .WithMany(p => p.CharacterVoices)
                .HasForeignKey(cv => cv.PersonId);


            // Convert all table and property names to lowercase (PostgreSQL style)
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                // Tables
                entity.SetTableName(entity.GetTableName()?.ToLowerInvariant());

                // Columns
                foreach (var property in entity.GetProperties())
                    property.SetColumnName(property.GetColumnBaseName()?.ToLowerInvariant());

                // Primary Keys
                foreach (var key in entity.GetKeys())
                    key.SetName(key.GetName()?.ToLowerInvariant());

                // Foreign keys
                foreach (var fk in entity.GetForeignKeys())
                    fk.SetConstraintName(fk.GetConstraintName()?.ToLowerInvariant());

                // Indexes
                foreach (var index in entity.GetIndexes())
                    index.SetDatabaseName(index.GetDatabaseName()?.ToLowerInvariant());
            }

        }
    }
}
