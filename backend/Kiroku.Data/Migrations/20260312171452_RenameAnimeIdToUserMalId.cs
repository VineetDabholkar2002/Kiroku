using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kiroku.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameAnimeIdToUserMalId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "animeid",
                table: "users",
                newName: "maluserid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "maluserid",
                table: "users",
                newName: "animeid");
        }
    }
}
