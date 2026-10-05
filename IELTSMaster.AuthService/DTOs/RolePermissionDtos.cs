using System;
using System.Collections.Generic;

namespace IELTSMaster.AuthService.DTOs
{
    public class SystemRoleInfoDto
    {
        public string RoleKey { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Scope { get; set; } = "SYSTEM"; // SYSTEM | TENANT
        public string BadgeVariant { get; set; } = "default";
        public string ColorClass { get; set; } = string.Empty;
        public int UserCount { get; set; }
        public List<string> Capabilities { get; set; } = new();
    }

    public class PermissionCategoryDto
    {
        public string CategoryKey { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<PermissionItemDto> Permissions { get; set; } = new();
    }

    public class PermissionItemDto
    {
        public string PermissionKey { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> GrantedRoles { get; set; } = new();
    }

    public class UserManagementDto
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Username => Email;
        public string FullName { get; set; } = string.Empty;
        public string SystemRole { get; set; } = string.Empty;
        public string SystemRoleName { get; set; } = string.Empty;
        public string RoleId => SystemRole;
        public string Role => SystemRoleName;
        public string Status { get; set; } = string.Empty;
        public bool IsActived => string.Equals(Status, "active", StringComparison.OrdinalIgnoreCase);
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Avatar => AvatarUrl;
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public List<string> TenantNames { get; set; } = new();
        public List<string> TenantRoles { get; set; } = new();
    }

    public class UpdateUserSystemRoleRequest
    {
        public string SystemRole { get; set; } = string.Empty;
    }

    public class AssignTenantRoleRequest
    {
        public Guid TenantId { get; set; }
        public string Role { get; set; } = string.Empty;
    }

    public class RolePermissionMatrixResponse
    {
        public List<SystemRoleInfoDto> Roles { get; set; } = new();
        public List<PermissionCategoryDto> PermissionCategories { get; set; } = new();
    }

    public class CreateUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string? Username { get; set; }
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string SystemRole { get; set; } = AUN_QA.Shared.Security.SystemRole.RegisteredUser;
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public bool IsActived { get; set; } = true;
    }

    public class UpdateUserRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string? SystemRole { get; set; }
        public string? Status { get; set; }
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Password { get; set; }
        public bool? IsActived { get; set; }
    }

    public class DeleteUsersRequest
    {
        public List<Guid> Ids { get; set; } = new();
    }

    public class GetUserListRequest
    {
        public int PageIndex { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? TextSearch { get; set; }
        public string? Search { get; set; }
        public string? SystemRole { get; set; }
        public string? Status { get; set; }
    }

    public class GetPermissionByUserDto
    {
        public string Controller { get; set; } = string.Empty;
        public bool IsViewed { get; set; } = true;
        public bool IsAdded { get; set; } = true;
        public bool IsUpdated { get; set; } = true;
        public bool IsDeleted { get; set; } = true;
        public bool IsApproved { get; set; } = true;
        public bool IsAnalyzed { get; set; } = true;
    }
}
