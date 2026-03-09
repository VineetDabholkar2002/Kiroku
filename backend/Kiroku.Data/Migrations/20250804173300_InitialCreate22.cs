using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Kiroku.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate22 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "about",
                table: "people");

            migrationBuilder.DropColumn(
                name: "imageurl",
                table: "people");

            migrationBuilder.DropColumn(
                name: "about",
                table: "characters");

            migrationBuilder.DropColumn(
                name: "imageurl",
                table: "characters");

            migrationBuilder.DropColumn(
                name: "namekanji",
                table: "characters");

            migrationBuilder.DropColumn(
                name: "nicknames",
                table: "characters");

            migrationBuilder.RenameColumn(
                name: "favorites",
                table: "people",
                newName: "malid");

            migrationBuilder.AddColumn<int>(
                name: "malid",
                table: "characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "animecharacters",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    characterid = table.Column<int>(type: "integer", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    favorites = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_animecharacters", x => x.id);
                    table.ForeignKey(
                        name: "fk_animecharacters_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_animecharacters_characters_characterid",
                        column: x => x.characterid,
                        principalTable: "characters",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "characterimages",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    characterid = table.Column<int>(type: "integer", nullable: false),
                    format = table.Column<string>(type: "text", nullable: false),
                    imageurl = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_characterimages", x => x.id);
                    table.ForeignKey(
                        name: "fk_characterimages_characters_characterid",
                        column: x => x.characterid,
                        principalTable: "characters",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "charactervoices",
                columns: table => new
                {
                    characterid = table.Column<int>(type: "integer", nullable: false),
                    personid = table.Column<int>(type: "integer", nullable: false),
                    language = table.Column<string>(type: "text", nullable: false),
                    id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_charactervoices", x => new { x.characterid, x.personid, x.language });
                    table.ForeignKey(
                        name: "fk_charactervoices_characters_characterid",
                        column: x => x.characterid,
                        principalTable: "characters",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_charactervoices_people_personid",
                        column: x => x.personid,
                        principalTable: "people",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "personimages",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    format = table.Column<string>(type: "text", nullable: false),
                    imageurl = table.Column<string>(type: "text", nullable: false),
                    personid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_personimages", x => x.id);
                    table.ForeignKey(
                        name: "fk_personimages_people_personid",
                        column: x => x.personid,
                        principalTable: "people",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_animecharacters_animeid",
                table: "animecharacters",
                column: "animeid");

            migrationBuilder.CreateIndex(
                name: "ix_animecharacters_characterid",
                table: "animecharacters",
                column: "characterid");

            migrationBuilder.CreateIndex(
                name: "ix_characterimages_characterid",
                table: "characterimages",
                column: "characterid");

            migrationBuilder.CreateIndex(
                name: "ix_charactervoices_personid",
                table: "charactervoices",
                column: "personid");

            migrationBuilder.CreateIndex(
                name: "ix_personimages_personid",
                table: "personimages",
                column: "personid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "animecharacters");

            migrationBuilder.DropTable(
                name: "characterimages");

            migrationBuilder.DropTable(
                name: "charactervoices");

            migrationBuilder.DropTable(
                name: "personimages");

            migrationBuilder.DropColumn(
                name: "malid",
                table: "characters");

            migrationBuilder.RenameColumn(
                name: "malid",
                table: "people",
                newName: "favorites");

            migrationBuilder.AddColumn<string>(
                name: "about",
                table: "people",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "imageurl",
                table: "people",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "about",
                table: "characters",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "imageurl",
                table: "characters",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "namekanji",
                table: "characters",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "nicknames",
                table: "characters",
                type: "text[]",
                nullable: false);
        }
    }
}
