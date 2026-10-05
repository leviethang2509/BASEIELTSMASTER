using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AUN_QA.Shared.DTOs.Base;
using AUN_QA.Shared.Security;
using IELTSMaster.AuthService.DTOs;
using IELTSMaster.AuthService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IELTSMaster.AuthService.Services
{
    public class RoleService : IRoleService
    {
        private readonly AuthDbContext _context;

        public RoleService(AuthDbContext context)
        {
            _context = context;
        }

        public async Task<List<SystemRoleInfoDto>> GetRolesAsync()
        {
            var systemCounts = await _context.Users
                .Where(u => u.DeletedAt == null)
                .GroupBy(u => u.SystemRole)
                .Select(g => new { Role = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Role, x => x.Count);

            var tenantCounts = await _context.MembershipRoles
                .GroupBy(mr => mr.Role)
                .Select(g => new { Role = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Role, x => x.Count);

            return new List<SystemRoleInfoDto>
            {
                new SystemRoleInfoDto
                {
                    RoleKey = SystemRole.SystemOwner,
                    DisplayName = "Chủ sở hữu hệ thống (System Owner)",
                    Description = "Quản trị tối cao toàn bộ nền tảng: toàn quyền quản trị tenant, người dùng, phân quyền, cấu hình hệ thống và E-learning",
                    Scope = "SYSTEM",
                    BadgeVariant = "amber",
                    ColorClass = "bg-amber-500/15 text-amber-600 border-amber-500/30",
                    UserCount = systemCounts.GetValueOrDefault(SystemRole.SystemOwner, 0),
                    Capabilities = new List<string> { "Toàn quyền hệ thống", "Quản lý trung tâm/Tenant", "Phân quyền toàn bộ", "Miễn trừ xác thực Elearning", "Xem Audit Log" }
                },
                new SystemRoleInfoDto
                {
                    RoleKey = SystemRole.SystemAdmin,
                    DisplayName = "Quản trị viên hệ thống (System Admin)",
                    Description = "Quản trị viên nền tảng: quản lý người dùng, phê duyệt và giám sát trung tâm đào tạo, hỗ trợ vận hành",
                    Scope = "SYSTEM",
                    BadgeVariant = "blue",
                    ColorClass = "bg-blue-500/15 text-blue-600 border-blue-500/30",
                    UserCount = systemCounts.GetValueOrDefault(SystemRole.SystemAdmin, 0),
                    Capabilities = new List<string> { "Quản lý người dùng", "Duyệt trung tâm/Tenant", "Theo dõi hoạt động", "Giám sát Elearning" }
                },
                new SystemRoleInfoDto
                {
                    RoleKey = TenantRole.TenantOwner,
                    DisplayName = "Chủ cơ sở đào tạo (Tenant Owner)",
                    Description = "Giám đốc / Chủ trung tâm: toàn quyền quản trị cơ sở, giảng viên, học viên, khóa học, học phí và đề thi",
                    Scope = "TENANT",
                    BadgeVariant = "purple",
                    ColorClass = "bg-purple-500/15 text-purple-600 border-purple-500/30",
                    UserCount = tenantCounts.GetValueOrDefault(TenantRole.TenantOwner, 0),
                    Capabilities = new List<string> { "Quản lý trung tâm", "Cấu hình cơ sở", "Quản lý giáo viên/học viên", "Quản trị đề thi & lớp học" }
                },
                new SystemRoleInfoDto
                {
                    RoleKey = TenantRole.TenantAdmin,
                    DisplayName = "Quản trị viên cơ sở (Tenant Admin)",
                    Description = "Nhân viên quản lý trung tâm: điều phối lớp học, điểm danh, lịch thi và chăm sóc học viên",
                    Scope = "TENANT",
                    BadgeVariant = "indigo",
                    ColorClass = "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
                    UserCount = tenantCounts.GetValueOrDefault(TenantRole.TenantAdmin, 0),
                    Capabilities = new List<string> { "Quản lý lớp học", "Xếp lịch học/thi", "Quản lý hồ sơ học viên", "Hỗ trợ học vụ" }
                },
                new SystemRoleInfoDto
                {
                    RoleKey = TenantRole.Teacher,
                    DisplayName = "Giảng viên IELTS (Teacher)",
                    Description = "Giảng viên phụ trách giảng dạy: biên soạn đề thi, tổ chức thi thử, chấm bài Writing/Speaking, quản lý lớp dạy",
                    Scope = "TENANT",
                    BadgeVariant = "emerald",
                    ColorClass = "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
                    UserCount = tenantCounts.GetValueOrDefault(TenantRole.Teacher, 0),
                    Capabilities = new List<string> { "Tạo đề thi IELTS", "Chấm bài Writing & Speaking", "Quản lý lớp học dạy", "Giảng dạy Elearning" }
                },
                new SystemRoleInfoDto
                {
                    RoleKey = TenantRole.Student,
                    DisplayName = "Học viên (Student)",
                    Description = "Học viên tại trung tâm: tham gia lớp học, làm bài tập về nhà, luyện thi trực tuyến trên Elearning",
                    Scope = "TENANT",
                    BadgeVariant = "sky",
                    ColorClass = "bg-sky-500/15 text-sky-600 border-sky-500/30",
                    UserCount = tenantCounts.GetValueOrDefault(TenantRole.Student, 0),
                    Capabilities = new List<string> { "Luyện thi trực tuyến", "Tham gia lớp học", "Nộp bài tập IELTS", "Xem kết quả & điểm số" }
                },
                new SystemRoleInfoDto
                {
                    RoleKey = TenantRole.Parent,
                    DisplayName = "Phụ huynh (Parent)",
                    Description = "Phụ huynh học viên: theo dõi tiến độ học tập, điểm thi và nhận thông báo từ trung tâm",
                    Scope = "TENANT",
                    BadgeVariant = "orange",
                    ColorClass = "bg-orange-500/15 text-orange-600 border-orange-500/30",
                    UserCount = tenantCounts.GetValueOrDefault(TenantRole.Parent, 0),
                    Capabilities = new List<string> { "Theo dõi chuyên cần", "Xem bảng điểm", "Nhận thông báo từ trung tâm" }
                },
                new SystemRoleInfoDto
                {
                    RoleKey = SystemRole.RegisteredUser,
                    DisplayName = "Người dùng đã đăng ký (Registered User)",
                    Description = "Tài khoản người dùng thông thường đã đăng ký nhưng chưa tham gia trung tâm nào",
                    Scope = "SYSTEM",
                    BadgeVariant = "secondary",
                    ColorClass = "bg-muted text-muted-foreground border-border",
                    UserCount = systemCounts.GetValueOrDefault(SystemRole.RegisteredUser, 0),
                    Capabilities = new List<string> { "Đăng ký tham gia trung tâm", "Cập nhật hồ sơ cá nhân", "Luyện thi thử IELTS tự do" }
                }
            };
        }

        public async Task<RolePermissionMatrixResponse> GetRolePermissionMatrixAsync()
        {
            var roles = await GetRolesAsync();
            var categories = GetPermissionCategoriesDefinition();

            return new RolePermissionMatrixResponse
            {
                Roles = roles,
                PermissionCategories = categories
            };
        }

        public List<PermissionCategoryDto> GetPermissions()
        {
            return GetPermissionCategoriesDefinition();
        }

        public async Task<List<GetPermissionByUserDto>> GetPermissionsByUserAsync(Guid? id)
        {
            if (!id.HasValue) return new List<GetPermissionByUserDto>();

            var user = await _context.Users
                .Include(u => u.Memberships)
                    .ThenInclude(m => m.Roles)
                .FirstOrDefaultAsync(u => u.Id == id.Value && u.DeletedAt == null);

            if (user == null) return new List<GetPermissionByUserDto>();

            var isSystemAdmin = string.Equals(user.SystemRole, SystemRole.SystemOwner, StringComparison.OrdinalIgnoreCase)
                             || string.Equals(user.SystemRole, SystemRole.SystemAdmin, StringComparison.OrdinalIgnoreCase)
                             || string.Equals(user.SystemRole, "ADMIN", StringComparison.OrdinalIgnoreCase);

            var menus = await _context.Menus
                .Where(m => m.IsActived)
                .ToListAsync();

            var permissionList = new List<GetPermissionByUserDto>
            {
                new GetPermissionByUserDto
                {
                    Controller = "Home",
                    IsViewed = true,
                    IsAdded = isSystemAdmin,
                    IsUpdated = isSystemAdmin,
                    IsDeleted = isSystemAdmin,
                    IsApproved = isSystemAdmin,
                    IsAnalyzed = isSystemAdmin
                }
            };

            foreach (var menu in menus)
            {
                if (string.IsNullOrWhiteSpace(menu.Controller)) continue;

                permissionList.Add(new GetPermissionByUserDto
                {
                    Controller = menu.Controller,
                    IsViewed = isSystemAdmin || menu.CanView,
                    IsAdded = isSystemAdmin || menu.CanAdd,
                    IsUpdated = isSystemAdmin || menu.CanUpdate,
                    IsDeleted = isSystemAdmin || menu.CanDelete,
                    IsApproved = isSystemAdmin || menu.CanApprove,
                    IsAnalyzed = isSystemAdmin || menu.CanAnalyze
                });
            }

            var coreControllers = new[] { "User", "Role", "SystemGroup", "Menu", "AuditLog" };
            foreach (var ctrl in coreControllers)
            {
                if (!permissionList.Any(p => string.Equals(p.Controller, ctrl, StringComparison.OrdinalIgnoreCase)))
                {
                    permissionList.Add(new GetPermissionByUserDto
                    {
                        Controller = ctrl,
                        IsViewed = isSystemAdmin,
                        IsAdded = isSystemAdmin,
                        IsUpdated = isSystemAdmin,
                        IsDeleted = isSystemAdmin,
                        IsApproved = isSystemAdmin,
                        IsAnalyzed = isSystemAdmin
                    });
                }
            }

            return permissionList;
        }

        public async Task<List<ModelCombobox>> GetComboboxAsync()
        {
            var roles = await GetRolesAsync();
            return roles.Select(r => new ModelCombobox
            {
                Value = r.RoleKey,
                Text = r.DisplayName
            }).ToList();
        }

        private static List<PermissionCategoryDto> GetPermissionCategoriesDefinition()
        {
            return new List<PermissionCategoryDto>
            {
                new PermissionCategoryDto
                {
                    CategoryKey = "SYSTEM_ADMINISTRATION",
                    CategoryName = "Quản trị Nền tảng & Hệ thống",
                    Description = "Các quyền hạn quản trị hệ thống cấp cao, phân quyền và giám sát toàn nền tảng",
                    Permissions = new List<PermissionItemDto>
                    {
                        new PermissionItemDto
                        {
                            PermissionKey = "system:users:manage",
                            Name = "Quản lý Người dùng & Tài khoản",
                            Description = "Xem danh sách, kích hoạt, khóa và quản trị tài khoản người dùng trên toàn hệ thống",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, SystemRole.SystemAdmin }
                        },
                        new PermissionItemDto
                        {
                            PermissionKey = "system:roles:assign",
                            Name = "Phân quyền & Gán vai trò",
                            Description = "Gán vai trò hệ thống và vai trò cơ sở cho người dùng",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, SystemRole.SystemAdmin, TenantRole.TenantOwner }
                        },
                        new PermissionItemDto
                        {
                            PermissionKey = "system:tenants:manage",
                            Name = "Quản lý & Duyệt Trung tâm Đào tạo",
                            Description = "Cấp phép, tạm ngừng và quản lý các trung tâm tiếng Anh tham gia nền tảng",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, SystemRole.SystemAdmin }
                        },
                        new PermissionItemDto
                        {
                            PermissionKey = "system:audit:view",
                            Name = "Xem Nhật ký Kiểm toán (Audit Log)",
                            Description = "Truy vết toàn bộ lịch sử thao tác dữ liệu, IP và thời gian",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, SystemRole.SystemAdmin }
                        },
                        new PermissionItemDto
                        {
                            PermissionKey = "catalog:ethnic-groups:manage",
                            Name = "Quản lý danh mục Dân tộc",
                            Description = "Xem, thêm, sửa và xóa dữ liệu danh mục Dân tộc dùng chung trong hệ thống",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, SystemRole.SystemAdmin, TenantRole.TenantOwner, TenantRole.TenantAdmin }
                        }
                    }
                },
                new PermissionCategoryDto
                {
                    CategoryKey = "TENANT_MANAGEMENT",
                    CategoryName = "Quản lý Trung tâm & Cơ sở Đào tạo",
                    Description = "Quản trị nhân sự, lớp học, học vụ và vận hành tại cơ sở",
                    Permissions = new List<PermissionItemDto>
                    {
                        new PermissionItemDto
                        {
                            PermissionKey = "tenant:members:manage",
                            Name = "Quản lý Thành viên Trung tâm",
                            Description = "Thêm, mời và quản lý giảng viên, học viên trong trung tâm",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, TenantRole.TenantOwner, TenantRole.TenantAdmin }
                        },
                        new PermissionItemDto
                        {
                            PermissionKey = "tenant:classes:manage",
                            Name = "Quản lý Lớp học & Thời khóa biểu",
                            Description = "Tạo lớp học, phân công giảng viên và xếp lịch học tại trung tâm",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, TenantRole.TenantOwner, TenantRole.TenantAdmin, TenantRole.Teacher }
                        },
                        new PermissionItemDto
                        {
                            PermissionKey = "tenant:settings:edit",
                            Name = "Cấu hình Thông tin Trung tâm",
                            Description = "Chỉnh sửa tên thương hiệu, logo, địa chỉ và thông tin liên hệ của trung tâm",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, TenantRole.TenantOwner }
                        }
                    }
                },
                new PermissionCategoryDto
                {
                    CategoryKey = "EXAMS_AND_ASSESSMENT",
                    CategoryName = "Khảo thí & Đề thi IELTS",
                    Description = "Biên soạn, chấm điểm và tổ chức thi thử IELTS 4 kỹ năng",
                    Permissions = new List<PermissionItemDto>
                    {
                        new PermissionItemDto
                        {
                            PermissionKey = "exams:create",
                            Name = "Biên soạn Đề thi IELTS",
                            Description = "Tạo mới cấu trúc đề thi, tải audio Listening, đoạn văn Reading, đề Writing & Speaking",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, TenantRole.TenantOwner, TenantRole.Teacher }
                        },
                        new PermissionItemDto
                        {
                            PermissionKey = "exams:grade",
                            Name = "Chấm bài Writing & Speaking",
                            Description = "Chấm điểm chi tiết theo 4 tiêu chí IELTS, thu âm nhận xét và gửi phản hồi",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, TenantRole.TenantOwner, TenantRole.Teacher }
                        },
                        new PermissionItemDto
                        {
                            PermissionKey = "exams:take",
                            Name = "Tham gia Luyện thi & Làm bài",
                            Description = "Làm bài thi IELTS trực tuyến trên nền tảng E-learning với giao diện chuẩn phòng thi",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, TenantRole.Student, SystemRole.RegisteredUser }
                        }
                    }
                },
                new PermissionCategoryDto
                {
                    CategoryKey = "ELEARNING_INTEGRATION",
                    CategoryName = "Tích hợp & Khai thác E-Learning",
                    Description = "Đăng nhập một lần (SSO) và truy cập học liệu số hóa trên cổng E-learning",
                    Permissions = new List<PermissionItemDto>
                    {
                        new PermissionItemDto
                        {
                            PermissionKey = "elearning:portal:access",
                            Name = "Truy cập Cổng E-Learning",
                            Description = "Truy cập học liệu và bài tập trên cổng E-Learning từ tài khoản IELTSMaster",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner, SystemRole.SystemAdmin, TenantRole.TenantOwner, TenantRole.TenantAdmin, TenantRole.Teacher, TenantRole.Student, SystemRole.RegisteredUser }
                        },
                        new PermissionItemDto
                        {
                            PermissionKey = "elearning:bypass:auth",
                            Name = "Miễn trừ Ràng buộc Tham gia Khóa học",
                            Description = "Toàn quyền xem mọi bài giảng và đề thi mà không cần đăng ký lớp học",
                            GrantedRoles = new List<string> { SystemRole.SystemOwner }
                        }
                    }
                }
            };
        }
    }
}
