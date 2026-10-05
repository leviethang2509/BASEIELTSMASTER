using IELTSMaster.AuthService.Entities;
using Microsoft.EntityFrameworkCore;

namespace IELTSMaster.AuthService.Infrastructure.Data
{
    public static class AuthDataSeeder
    {
        public static async Task SeedMenusAndGroupsAsync(AuthDbContext context, ILogger logger)
        {
            try
            {
                // Kiểm tra xem đã có SystemGroup nào chưa
                if (await context.SystemGroups.AnyAsync())
                {
                    await EnsureDanhMucDanTocPermissionAsync(context, logger);
                    return;
                }

                logger.LogInformation("Bắt đầu khởi tạo dữ liệu mặc định SystemGroup và Menu trong auth schema...");

                // 1. Nhóm Hệ thống
                var systemGroup = new SystemGroup
                {
                    Id = Guid.Parse("11111111-0000-0000-0000-000000000001"),
                    Name = "Hệ thống",
                    Sort = 1,
                    IsEdit = false,
                    IsActived = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // 2. Nhóm E-Learning & Luyện thi
                var elearningGroup = new SystemGroup
                {
                    Id = Guid.Parse("22222222-0000-0000-0000-000000000002"),
                    Name = "E-Learning & Luyện thi",
                    Sort = 2,
                    IsEdit = false,
                    IsActived = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // 3. Nhóm Đào tạo & Học vụ
                var trainingGroup = new SystemGroup
                {
                    Id = Guid.Parse("33333333-0000-0000-0000-000000000003"),
                    Name = "Đào tạo & Học vụ",
                    Sort = 3,
                    IsEdit = false,
                    IsActived = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // 4. Nhóm Danh mục
                var danhMucGroup = new SystemGroup
                {
                    Id = Guid.Parse("44444444-0000-0000-0000-000000000004"),
                    Name = "Danh mục",
                    Sort = 4,
                    IsEdit = false,
                    IsActived = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                context.SystemGroups.AddRange(systemGroup, elearningGroup, trainingGroup, danhMucGroup);

                // Menu thuộc Nhóm Hệ thống
                var menus = new List<Menu>
                {
                    new Menu
                    {
                        Id = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"),
                        Controller = "User",
                        Name = "Quản lý Người dùng",
                        SystemGroupId = systemGroup.Id,
                        Sort = 1,
                        CanView = true, CanAdd = true, CanUpdate = true, CanDelete = true, CanApprove = true, CanAnalyze = true,
                        IsShowMenu = true, IsEdit = true, IsActived = true
                    },
                    new Menu
                    {
                        Id = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002"),
                        Controller = "Role",
                        Name = "Vai trò & Phân quyền",
                        SystemGroupId = systemGroup.Id,
                        Sort = 2,
                        CanView = true, CanAdd = true, CanUpdate = true, CanDelete = true, CanApprove = true, CanAnalyze = true,
                        IsShowMenu = true, IsEdit = true, IsActived = true
                    },
                    new Menu
                    {
                        Id = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003"),
                        Controller = "SystemGroup",
                        Name = "Nhóm chức năng",
                        SystemGroupId = systemGroup.Id,
                        Sort = 3,
                        CanView = true, CanAdd = true, CanUpdate = true, CanDelete = true, CanApprove = false, CanAnalyze = false,
                        IsShowMenu = true, IsEdit = true, IsActived = true
                    },
                    new Menu
                    {
                        Id = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000004"),
                        Controller = "Menu",
                        Name = "Menu hệ thống",
                        SystemGroupId = systemGroup.Id,
                        Sort = 4,
                        CanView = true, CanAdd = true, CanUpdate = true, CanDelete = true, CanApprove = false, CanAnalyze = false,
                        IsShowMenu = true, IsEdit = true, IsActived = true
                    },
                    new Menu
                    {
                        Id = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000005"),
                        Controller = "AuditLog",
                        Name = "Nhật ký hệ thống",
                        SystemGroupId = systemGroup.Id,
                        Sort = 5,
                        CanView = true, CanAdd = false, CanUpdate = false, CanDelete = false, CanApprove = false, CanAnalyze = true,
                        IsShowMenu = true, IsEdit = true, IsActived = true
                    },

                    // Menu thuộc Nhóm E-Learning
                    new Menu
                    {
                        Id = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001"),
                        Controller = "Exam",
                        Name = "Đề thi & Luyện tập",
                        SystemGroupId = elearningGroup.Id,
                        Sort = 1,
                        CanView = true, CanAdd = true, CanUpdate = true, CanDelete = true, CanApprove = true, CanAnalyze = true,
                        IsShowMenu = true, IsEdit = true, IsActived = true
                    },
                    new Menu
                    {
                        Id = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002"),
                        Controller = "Course",
                        Name = "Khóa học trực tuyến",
                        SystemGroupId = elearningGroup.Id,
                        Sort = 2,
                        CanView = true, CanAdd = true, CanUpdate = true, CanDelete = true, CanApprove = true, CanAnalyze = true,
                        IsShowMenu = true, IsEdit = true, IsActived = true
                    },
                    new Menu
                    {
                        Id = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000003"),
                        Controller = "Grading",
                        Name = "Chấm thi & Đánh giá AI",
                        SystemGroupId = elearningGroup.Id,
                        Sort = 3,
                        CanView = true, CanAdd = true, CanUpdate = true, CanDelete = true, CanApprove = true, CanAnalyze = true,
                        IsShowMenu = true, IsEdit = true, IsActived = true
                    },

                    // Menu thuộc Nhóm Đào tạo & Học vụ
                    new Menu
                    {
                        Id = Guid.Parse("cccccccc-0000-0000-0000-000000000001"),
                        Controller = "Classroom",
                        Name = "Quản lý Lớp học",
                        SystemGroupId = trainingGroup.Id,
                        Sort = 1,
                        CanView = true, CanAdd = true, CanUpdate = true, CanDelete = true, CanApprove = true, CanAnalyze = true,
                        IsShowMenu = true, IsEdit = true, IsActived = true
                    },

                    // Menu thuộc Nhóm Danh mục
                    new Menu
                    {
                        Id = Guid.Parse("dddddddd-0000-0000-0000-000000000001"),
                        Controller = "DanToc",
                        Name = "Dân tộc",
                        SystemGroupId = danhMucGroup.Id,
                        Sort = 1,
                        CanView = true, CanAdd = true, CanUpdate = true, CanDelete = true, CanApprove = false, CanAnalyze = false,
                        IsShowMenu = true, IsEdit = true, IsActived = true
                    }
                };

                context.Menus.AddRange(menus);
                await context.SaveChangesAsync();
                logger.LogInformation("Khởi tạo thành công {GroupCount} SystemGroups và {MenuCount} Menus.", 4, menus.Count);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi xảy ra khi seed dữ liệu SystemGroup & Menu.");
            }
        }

        private static async Task EnsureDanhMucDanTocPermissionAsync(AuthDbContext context, ILogger logger)
        {
            var now = DateTime.UtcNow;
            var danhMucGroupId = Guid.Parse("44444444-0000-0000-0000-000000000004");
            var danTocMenuId = Guid.Parse("dddddddd-0000-0000-0000-000000000001");

            var danhMucGroup = await context.SystemGroups
                .FirstOrDefaultAsync(g => g.Id == danhMucGroupId || g.Name == "Danh mục");

            if (danhMucGroup == null)
            {
                danhMucGroup = new SystemGroup
                {
                    Id = danhMucGroupId,
                    Name = "Danh mục",
                    Sort = 4,
                    IsEdit = false,
                    IsActived = true,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                context.SystemGroups.Add(danhMucGroup);
            }
            else
            {
                danhMucGroup.Name = "Danh mục";
                danhMucGroup.Sort = danhMucGroup.Sort <= 0 ? 4 : danhMucGroup.Sort;
                danhMucGroup.IsActived = true;
                danhMucGroup.UpdatedAt = now;
            }

            var danTocMenu = await context.Menus
                .FirstOrDefaultAsync(m => m.Id == danTocMenuId || m.Controller == "DanToc");

            if (danTocMenu == null)
            {
                context.Menus.Add(new Menu
                {
                    Id = danTocMenuId,
                    Controller = "DanToc",
                    Name = "Dân tộc",
                    SystemGroupId = danhMucGroup.Id,
                    Sort = 1,
                    CanView = true,
                    CanAdd = true,
                    CanUpdate = true,
                    CanDelete = true,
                    CanApprove = false,
                    CanAnalyze = false,
                    IsShowMenu = true,
                    IsEdit = true,
                    IsActived = true,
                    CreatedAt = now,
                    UpdatedAt = now
                });
                logger.LogInformation("Đã bổ sung menu phân quyền Dân tộc.");
            }
            else
            {
                danTocMenu.Controller = "DanToc";
                danTocMenu.Name = "Dân tộc";
                danTocMenu.SystemGroupId = danhMucGroup.Id;
                danTocMenu.Sort = danTocMenu.Sort <= 0 ? 1 : danTocMenu.Sort;
                danTocMenu.CanView = true;
                danTocMenu.CanAdd = true;
                danTocMenu.CanUpdate = true;
                danTocMenu.CanDelete = true;
                danTocMenu.IsShowMenu = true;
                danTocMenu.IsActived = true;
                danTocMenu.UpdatedAt = now;
            }

            await context.SaveChangesAsync();
        }

        public static async Task SeedAuditLogsAsync(AuthDbContext context, ILogger logger)
        {
            try
            {
                if (await context.AuditLogs.AnyAsync())
                {
                    return;
                }

                logger.LogInformation("Khởi tạo dữ liệu mẫu AuditLog trong auth schema...");

                var logs = new List<AuditLog>
                {
                    new AuditLog
                    {
                        Id = Guid.NewGuid(),
                        UserName = "admin@langsimulator.com",
                        Action = "LOGIN",
                        EntityName = "User",
                        EntityId = "ea016a85-cd84-47d6-b4b1-d6bbef2a6e4a",
                        OldValues = null,
                        NewValues = "{\"email\": \"admin@langsimulator.com\", \"role\": \"SUPER_ADMIN\"}",
                        IpAddress = "127.0.0.1",
                        ServiceName = "AuthService",
                        IsSuccess = true,
                        CreatedAt = DateTime.UtcNow.AddHours(-2)
                    },
                    new AuditLog
                    {
                        Id = Guid.NewGuid(),
                        UserName = "system",
                        Action = "INSERT",
                        EntityName = "SystemGroup",
                        EntityId = "11111111-0000-0000-0000-000000000001",
                        OldValues = null,
                        NewValues = "{\"name\": \"Hệ thống\", \"sort\": 1}",
                        IpAddress = "127.0.0.1",
                        ServiceName = "AuthService",
                        IsSuccess = true,
                        CreatedAt = DateTime.UtcNow.AddHours(-1)
                    },
                    new AuditLog
                    {
                        Id = Guid.NewGuid(),
                        UserName = "system",
                        Action = "INSERT",
                        EntityName = "Menu",
                        EntityId = "bbbbbbbb-0000-0000-0000-000000000001",
                        OldValues = null,
                        NewValues = "{\"controller\": \"User\", \"name\": \"Quản lý Người dùng\"}",
                        IpAddress = "127.0.0.1",
                        ServiceName = "AuthService",
                        IsSuccess = true,
                        CreatedAt = DateTime.UtcNow.AddMinutes(-30)
                    }
                };

                context.AuditLogs.AddRange(logs);
                await context.SaveChangesAsync();
                logger.LogInformation("Khởi tạo thành công {Count} bản ghi AuditLog mẫu.", logs.Count);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi xảy ra khi seed dữ liệu AuditLog.");
            }
        }
    }
}
