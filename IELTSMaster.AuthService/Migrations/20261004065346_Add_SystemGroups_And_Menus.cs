using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IELTSMaster.AuthService.Migrations
{
    /// <inheritdoc />
    public partial class Add_SystemGroups_And_Menus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "system_groups",
                schema: "auth",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    sort = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    parent_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_edit = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_actived = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_system_groups", x => x.id);
                    table.ForeignKey(
                        name: "FK_system_groups_system_groups_parent_id",
                        column: x => x.parent_id,
                        principalSchema: "auth",
                        principalTable: "system_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "menus",
                schema: "auth",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    controller = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    system_group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sort = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    can_view = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    can_add = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    can_update = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    can_delete = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    can_approve = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    can_analyze = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_show_menu = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_edit = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_actived = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_menus", x => x.id);
                    table.ForeignKey(
                        name: "FK_menus_system_groups_system_group_id",
                        column: x => x.system_group_id,
                        principalSchema: "auth",
                        principalTable: "system_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_menus_system_group_id",
                schema: "auth",
                table: "menus",
                column: "system_group_id");

            migrationBuilder.CreateIndex(
                name: "IX_system_groups_parent_id",
                schema: "auth",
                table: "system_groups",
                column: "parent_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "menus",
                schema: "auth");

            migrationBuilder.DropTable(
                name: "system_groups",
                schema: "auth");
        }
    }
}
