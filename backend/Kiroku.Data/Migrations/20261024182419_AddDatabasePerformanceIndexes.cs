using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kiroku.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDatabasePerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_themeentries_animeid",
                table: "themeentries");

            migrationBuilder.DropIndex(
                name: "ix_animecharacters_animeid",
                table: "animecharacters");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email");

            migrationBuilder.CreateIndex(
                name: "ix_users_username",
                table: "users",
                column: "username");

            migrationBuilder.CreateIndex(
                name: "ix_useranimelists_userid_status",
                table: "useranimelists",
                columns: new[] { "userid", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_themeentries_animeid_category",
                table: "themeentries",
                columns: new[] { "animeid", "category" });

            migrationBuilder.CreateIndex(
                name: "ix_people_malid",
                table: "people",
                column: "malid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_people_name",
                table: "people",
                column: "name")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "ix_genres_malid_type",
                table: "genres",
                columns: new[] { "malid", "type" });

            migrationBuilder.CreateIndex(
                name: "ix_genres_type",
                table: "genres",
                column: "type");

            migrationBuilder.CreateIndex(
                name: "ix_characters_malid",
                table: "characters",
                column: "malid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_characters_name",
                table: "characters",
                column: "name")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "ix_animes_approved_popularity",
                table: "animes",
                columns: new[] { "approved", "popularity" });

            migrationBuilder.CreateIndex(
                name: "ix_animes_favorites",
                table: "animes",
                column: "favorites");

            migrationBuilder.CreateIndex(
                name: "ix_animes_malid",
                table: "animes",
                column: "malid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_animes_popularity",
                table: "animes",
                column: "popularity");

            migrationBuilder.CreateIndex(
                name: "ix_animes_score",
                table: "animes",
                column: "score");

            migrationBuilder.CreateIndex(
                name: "ix_animes_status",
                table: "animes",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_animes_title",
                table: "animes",
                column: "title")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "ix_animes_titleenglish",
                table: "animes",
                column: "titleenglish")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "ix_animecharacters_animeid_characterid",
                table: "animecharacters",
                columns: new[] { "animeid", "characterid" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_users_email",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_users_username",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_useranimelists_userid_status",
                table: "useranimelists");

            migrationBuilder.DropIndex(
                name: "ix_themeentries_animeid_category",
                table: "themeentries");

            migrationBuilder.DropIndex(
                name: "ix_people_malid",
                table: "people");

            migrationBuilder.DropIndex(
                name: "ix_people_name",
                table: "people");

            migrationBuilder.DropIndex(
                name: "ix_genres_malid_type",
                table: "genres");

            migrationBuilder.DropIndex(
                name: "ix_genres_type",
                table: "genres");

            migrationBuilder.DropIndex(
                name: "ix_characters_malid",
                table: "characters");

            migrationBuilder.DropIndex(
                name: "ix_characters_name",
                table: "characters");

            migrationBuilder.DropIndex(
                name: "ix_animes_approved_popularity",
                table: "animes");

            migrationBuilder.DropIndex(
                name: "ix_animes_favorites",
                table: "animes");

            migrationBuilder.DropIndex(
                name: "ix_animes_malid",
                table: "animes");

            migrationBuilder.DropIndex(
                name: "ix_animes_popularity",
                table: "animes");

            migrationBuilder.DropIndex(
                name: "ix_animes_score",
                table: "animes");

            migrationBuilder.DropIndex(
                name: "ix_animes_status",
                table: "animes");

            migrationBuilder.DropIndex(
                name: "ix_animes_title",
                table: "animes");

            migrationBuilder.DropIndex(
                name: "ix_animes_titleenglish",
                table: "animes");

            migrationBuilder.DropIndex(
                name: "ix_animecharacters_animeid_characterid",
                table: "animecharacters");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            migrationBuilder.CreateIndex(
                name: "ix_themeentries_animeid",
                table: "themeentries",
                column: "animeid");

            migrationBuilder.CreateIndex(
                name: "ix_animecharacters_animeid",
                table: "animecharacters",
                column: "animeid");
        }
    }
}
