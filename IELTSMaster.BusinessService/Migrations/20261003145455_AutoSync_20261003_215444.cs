using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IELTSMaster.BusinessService.Migrations
{
    /// <inheritdoc />
    public partial class AutoSync_20261003_215444 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "thumbnail_url",
                schema: "business",
                table: "courses",
                type: "character varying(1024)",
                maxLength: 1024,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "thumbnail_url",
                schema: "business",
                table: "courses");
        }
    }
}
