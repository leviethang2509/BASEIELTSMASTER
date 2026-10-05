namespace AUN_QA.Shared.Security
{
    public static class SystemRole
    {
        public const string SystemOwner = "SYSTEM_OWNER";
        public const string SystemAdmin = "SYSTEM_ADMIN";
        public const string RegisteredUser = "REGISTERED_USER";

        public static readonly IReadOnlyList<string> All = new[]
        {
            SystemOwner,
            SystemAdmin,
            RegisteredUser
        };
    }

    public static class TenantRole
    {
        public const string TenantOwner = "TENANT_OWNER";
        public const string TenantAdmin = "TENANT_ADMIN";
        public const string Teacher = "TEACHER";
        public const string Student = "STUDENT";
        public const string Parent = "PARENT";

        public static readonly IReadOnlyList<string> All = new[]
        {
            TenantOwner,
            TenantAdmin,
            Teacher,
            Student,
            Parent
        };
    }

    public static class TenantStatus
    {
        public const string Pending = "pending";
        public const string Active = "active";
        public const string Rejected = "rejected";
        public const string Suspended = "suspended";
    }

    public static class MembershipStatus
    {
        public const string Active = "active";
        public const string Inactive = "inactive";
    }

    public static class UserStatus
    {
        public const string Active = "active";
        public const string Locked = "locked";
    }

    public static class RoleGroups
    {
        public static readonly IReadOnlyList<string> SystemManagerRoles = new[]
        {
            SystemRole.SystemOwner,
            SystemRole.SystemAdmin
        };

        public static readonly IReadOnlyList<string> TenantManagerRoles = new[]
        {
            TenantRole.TenantOwner,
            TenantRole.TenantAdmin
        };

        public static readonly IReadOnlyList<string> ExamAuthorRoles = new[]
        {
            TenantRole.TenantOwner,
            TenantRole.TenantAdmin,
            TenantRole.Teacher
        };

        public static readonly IReadOnlyList<string> GraderRoles = ExamAuthorRoles;

        public static readonly IReadOnlyList<string> TenantDashboardRoles = ExamAuthorRoles;

        public static readonly IReadOnlyList<string> AssignableTenantRoles = new[]
        {
            TenantRole.TenantAdmin,
            TenantRole.Teacher,
            TenantRole.Student,
            TenantRole.Parent
        };

        public static readonly IReadOnlyList<string> ElearningAllowedRoles = new[]
        {
            TenantRole.TenantOwner,
            TenantRole.TenantAdmin,
            TenantRole.Teacher,
            TenantRole.Student,
            TenantRole.Parent
        };
    }

    public static class AuthClaimTypes
    {
        public const string UserId = "sub";
        public const string Email = "email";
        public const string Name = "name";
        public const string FullName = "full_name";
        public const string SystemRole = "system_role";
        public const string TenantId = "tenant_id";
        public const string TenantSlug = "tenant_slug";
        public const string TenantName = "tenant_name";
        public const string MembershipId = "membership_id";
        public const string Role = "role";
        public const string TenantRole = "tenant_role";
        public const string TokenVersion = "tv";
        public const string ElearningAccess = "elearning_access";
        public const string ElearningBypassAuth = "elearning_bypass_auth";
    }
}
