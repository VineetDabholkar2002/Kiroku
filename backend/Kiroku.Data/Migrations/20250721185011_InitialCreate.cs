using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Kiroku.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "airedpropdates",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    day = table.Column<int>(type: "integer", nullable: true),
                    month = table.Column<int>(type: "integer", nullable: true),
                    year = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_airedpropdates", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "broadcasts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    day = table.Column<string>(type: "text", nullable: true),
                    time = table.Column<string>(type: "text", nullable: true),
                    timezone = table.Column<string>(type: "text", nullable: true),
                    @string = table.Column<string>(name: "string", type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_broadcasts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "characters",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    url = table.Column<string>(type: "text", nullable: false),
                    imageurl = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    namekanji = table.Column<string>(type: "text", nullable: true),
                    nicknames = table.Column<List<string>>(type: "text[]", nullable: false),
                    favorites = table.Column<int>(type: "integer", nullable: false),
                    about = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_characters", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "genres",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    malid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true),
                    type = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_genres", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "licensors",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    malid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_licensors", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "mangas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    title = table.Column<string>(type: "text", nullable: false),
                    url = table.Column<string>(type: "text", nullable: false),
                    imageurl = table.Column<string>(type: "text", nullable: false),
                    synopsis = table.Column<string>(type: "text", nullable: true),
                    type = table.Column<string>(type: "text", nullable: false),
                    chapters = table.Column<int>(type: "integer", nullable: true),
                    volumes = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mangas", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "producers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    malid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_producers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "studios",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    malid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_studios", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "trailerimages",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    imageurl = table.Column<string>(type: "text", nullable: true),
                    smallimageurl = table.Column<string>(type: "text", nullable: true),
                    mediumimageurl = table.Column<string>(type: "text", nullable: true),
                    largeimageurl = table.Column<string>(type: "text", nullable: true),
                    maximumimageurl = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_trailerimages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    username = table.Column<string>(type: "text", nullable: false),
                    password = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    profilepicture = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "airedprops",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fromid = table.Column<int>(type: "integer", nullable: true),
                    toid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_airedprops", x => x.id);
                    table.ForeignKey(
                        name: "fk_airedprops_airedpropdates_fromid",
                        column: x => x.fromid,
                        principalTable: "airedpropdates",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_airedprops_airedpropdates_toid",
                        column: x => x.toid,
                        principalTable: "airedpropdates",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "people",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    url = table.Column<string>(type: "text", nullable: false),
                    imageurl = table.Column<string>(type: "text", nullable: false),
                    favorites = table.Column<int>(type: "integer", nullable: false),
                    about = table.Column<string>(type: "text", nullable: true),
                    mangaid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_people", x => x.id);
                    table.ForeignKey(
                        name: "fk_people_mangas_mangaid",
                        column: x => x.mangaid,
                        principalTable: "mangas",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "trailers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    youtubeid = table.Column<string>(type: "text", nullable: true),
                    url = table.Column<string>(type: "text", nullable: true),
                    embedurl = table.Column<string>(type: "text", nullable: true),
                    trailerimagesid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_trailers", x => x.id);
                    table.ForeignKey(
                        name: "fk_trailers_trailerimages_trailerimagesid",
                        column: x => x.trailerimagesid,
                        principalTable: "trailerimages",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "aireds",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    from = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    to = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    @string = table.Column<string>(name: "string", type: "text", nullable: true),
                    propid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_aireds", x => x.id);
                    table.ForeignKey(
                        name: "fk_aireds_airedprops_propid",
                        column: x => x.propid,
                        principalTable: "airedprops",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "animes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    malid = table.Column<int>(type: "integer", nullable: false),
                    url = table.Column<string>(type: "text", nullable: true),
                    approved = table.Column<bool>(type: "boolean", nullable: false),
                    trailerid = table.Column<int>(type: "integer", nullable: true),
                    title = table.Column<string>(type: "text", nullable: true),
                    titleenglish = table.Column<string>(type: "text", nullable: true),
                    titlejapanese = table.Column<string>(type: "text", nullable: true),
                    type = table.Column<string>(type: "text", nullable: true),
                    source = table.Column<string>(type: "text", nullable: true),
                    episodes = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "text", nullable: true),
                    airing = table.Column<bool>(type: "boolean", nullable: false),
                    duration = table.Column<string>(type: "text", nullable: true),
                    rating = table.Column<string>(type: "text", nullable: true),
                    score = table.Column<double>(type: "double precision", nullable: true),
                    scoredby = table.Column<int>(type: "integer", nullable: true),
                    rank = table.Column<int>(type: "integer", nullable: true),
                    popularity = table.Column<int>(type: "integer", nullable: true),
                    members = table.Column<int>(type: "integer", nullable: true),
                    favorites = table.Column<int>(type: "integer", nullable: true),
                    synopsis = table.Column<string>(type: "text", nullable: true),
                    background = table.Column<string>(type: "text", nullable: true),
                    season = table.Column<string>(type: "text", nullable: true),
                    year = table.Column<int>(type: "integer", nullable: true),
                    broadcastid = table.Column<int>(type: "integer", nullable: true),
                    airedid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_animes", x => x.id);
                    table.ForeignKey(
                        name: "fk_animes_aireds_airedid",
                        column: x => x.airedid,
                        principalTable: "aireds",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_animes_broadcasts_broadcastid",
                        column: x => x.broadcastid,
                        principalTable: "broadcasts",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_animes_trailers_trailerid",
                        column: x => x.trailerid,
                        principalTable: "trailers",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "animegenres",
                columns: table => new
                {
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    genreid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_animegenres", x => new { x.animeid, x.genreid });
                    table.ForeignKey(
                        name: "fk_animegenres_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_animegenres_genres_genreid",
                        column: x => x.genreid,
                        principalTable: "genres",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "animeimages",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    format = table.Column<string>(type: "text", nullable: true),
                    imageurl = table.Column<string>(type: "text", nullable: true),
                    smallimageurl = table.Column<string>(type: "text", nullable: true),
                    largeimageurl = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_animeimages", x => x.id);
                    table.ForeignKey(
                        name: "fk_animeimages_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "animelicensors",
                columns: table => new
                {
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    licensorid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_animelicensors", x => new { x.animeid, x.licensorid });
                    table.ForeignKey(
                        name: "fk_animelicensors_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_animelicensors_licensors_licensorid",
                        column: x => x.licensorid,
                        principalTable: "licensors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "animeproducers",
                columns: table => new
                {
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    producerid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_animeproducers", x => new { x.animeid, x.producerid });
                    table.ForeignKey(
                        name: "fk_animeproducers_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_animeproducers_producers_producerid",
                        column: x => x.producerid,
                        principalTable: "producers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "animestudios",
                columns: table => new
                {
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    studioid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_animestudios", x => new { x.animeid, x.studioid });
                    table.ForeignKey(
                        name: "fk_animestudios_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_animestudios_studios_studioid",
                        column: x => x.studioid,
                        principalTable: "studios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "animetitles",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    type = table.Column<string>(type: "text", nullable: true),
                    title = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_animetitles", x => x.id);
                    table.ForeignKey(
                        name: "fk_animetitles_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "animetitlesynonyms",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    synonym = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_animetitlesynonyms", x => x.id);
                    table.ForeignKey(
                        name: "fk_animetitlesynonyms_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "externallinks",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true),
                    url = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_externallinks", x => x.id);
                    table.ForeignKey(
                        name: "fk_externallinks_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "relations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    relationtype = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_relations", x => x.id);
                    table.ForeignKey(
                        name: "fk_relations_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "streaminglinks",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true),
                    url = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_streaminglinks", x => x.id);
                    table.ForeignKey(
                        name: "fk_streaminglinks_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "themeentries",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    category = table.Column<string>(type: "text", nullable: true),
                    sequence = table.Column<int>(type: "integer", nullable: false),
                    rawtext = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_themeentries", x => x.id);
                    table.ForeignKey(
                        name: "fk_themeentries_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "useranimelists",
                columns: table => new
                {
                    userid = table.Column<int>(type: "integer", nullable: false),
                    animeid = table.Column<int>(type: "integer", nullable: false),
                    id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_useranimelists", x => new { x.userid, x.animeid });
                    table.ForeignKey(
                        name: "fk_useranimelists_animes_animeid",
                        column: x => x.animeid,
                        principalTable: "animes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_useranimelists_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "relationentries",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    relationid = table.Column<int>(type: "integer", nullable: false),
                    malid = table.Column<int>(type: "integer", nullable: false),
                    entrytype = table.Column<string>(type: "text", nullable: true),
                    name = table.Column<string>(type: "text", nullable: true),
                    url = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_relationentries", x => x.id);
                    table.ForeignKey(
                        name: "fk_relationentries_relations_relationid",
                        column: x => x.relationid,
                        principalTable: "relations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_airedprops_fromid",
                table: "airedprops",
                column: "fromid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_airedprops_toid",
                table: "airedprops",
                column: "toid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_aireds_propid",
                table: "aireds",
                column: "propid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_animegenres_genreid",
                table: "animegenres",
                column: "genreid");

            migrationBuilder.CreateIndex(
                name: "ix_animeimages_animeid",
                table: "animeimages",
                column: "animeid");

            migrationBuilder.CreateIndex(
                name: "ix_animelicensors_licensorid",
                table: "animelicensors",
                column: "licensorid");

            migrationBuilder.CreateIndex(
                name: "ix_animeproducers_producerid",
                table: "animeproducers",
                column: "producerid");

            migrationBuilder.CreateIndex(
                name: "ix_animes_airedid",
                table: "animes",
                column: "airedid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_animes_broadcastid",
                table: "animes",
                column: "broadcastid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_animes_trailerid",
                table: "animes",
                column: "trailerid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_animestudios_studioid",
                table: "animestudios",
                column: "studioid");

            migrationBuilder.CreateIndex(
                name: "ix_animetitles_animeid",
                table: "animetitles",
                column: "animeid");

            migrationBuilder.CreateIndex(
                name: "ix_animetitlesynonyms_animeid",
                table: "animetitlesynonyms",
                column: "animeid");

            migrationBuilder.CreateIndex(
                name: "ix_externallinks_animeid",
                table: "externallinks",
                column: "animeid");

            migrationBuilder.CreateIndex(
                name: "ix_people_mangaid",
                table: "people",
                column: "mangaid");

            migrationBuilder.CreateIndex(
                name: "ix_relationentries_relationid",
                table: "relationentries",
                column: "relationid");

            migrationBuilder.CreateIndex(
                name: "ix_relations_animeid",
                table: "relations",
                column: "animeid");

            migrationBuilder.CreateIndex(
                name: "ix_streaminglinks_animeid",
                table: "streaminglinks",
                column: "animeid");

            migrationBuilder.CreateIndex(
                name: "ix_themeentries_animeid",
                table: "themeentries",
                column: "animeid");

            migrationBuilder.CreateIndex(
                name: "ix_trailers_trailerimagesid",
                table: "trailers",
                column: "trailerimagesid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_useranimelists_animeid",
                table: "useranimelists",
                column: "animeid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "animegenres");

            migrationBuilder.DropTable(
                name: "animeimages");

            migrationBuilder.DropTable(
                name: "animelicensors");

            migrationBuilder.DropTable(
                name: "animeproducers");

            migrationBuilder.DropTable(
                name: "animestudios");

            migrationBuilder.DropTable(
                name: "animetitles");

            migrationBuilder.DropTable(
                name: "animetitlesynonyms");

            migrationBuilder.DropTable(
                name: "characters");

            migrationBuilder.DropTable(
                name: "externallinks");

            migrationBuilder.DropTable(
                name: "people");

            migrationBuilder.DropTable(
                name: "relationentries");

            migrationBuilder.DropTable(
                name: "streaminglinks");

            migrationBuilder.DropTable(
                name: "themeentries");

            migrationBuilder.DropTable(
                name: "useranimelists");

            migrationBuilder.DropTable(
                name: "genres");

            migrationBuilder.DropTable(
                name: "licensors");

            migrationBuilder.DropTable(
                name: "producers");

            migrationBuilder.DropTable(
                name: "studios");

            migrationBuilder.DropTable(
                name: "mangas");

            migrationBuilder.DropTable(
                name: "relations");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "animes");

            migrationBuilder.DropTable(
                name: "aireds");

            migrationBuilder.DropTable(
                name: "broadcasts");

            migrationBuilder.DropTable(
                name: "trailers");

            migrationBuilder.DropTable(
                name: "airedprops");

            migrationBuilder.DropTable(
                name: "trailerimages");

            migrationBuilder.DropTable(
                name: "airedpropdates");
        }
    }
}
