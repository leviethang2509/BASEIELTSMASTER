namespace AUN_QA.Shared.Security
{
    public static class PermissionKey
    {
        public const string SystemUsersManage = "system:users:manage";
        public const string SystemRolesAssign = "system:roles:assign";
        public const string SystemTenantsManage = "system:tenants:manage";
        public const string SystemAuditView = "system:audit:view";
        public const string CatalogEthnicGroupsManage = "catalog:ethnic-groups:manage";
        public const string TenantMembersManage = "tenant:members:manage";
        public const string TenantClassesManage = "tenant:classes:manage";
        public const string TenantSettingsEdit = "tenant:settings:edit";
        public const string ExamsCreate = "exams:create";
        public const string ExamsGrade = "exams:grade";
        public const string ExamsTake = "exams:take";
        public const string ElearningPortalAccess = "elearning:portal:access";
        public const string ElearningBypassAuth = "elearning:bypass:auth";

        public static readonly IReadOnlyList<string> All = new[]
        {
            SystemUsersManage,
            SystemRolesAssign,
            SystemTenantsManage,
            SystemAuditView,
            CatalogEthnicGroupsManage,
            TenantMembersManage,
            TenantClassesManage,
            TenantSettingsEdit,
            ExamsCreate,
            ExamsGrade,
            ExamsTake,
            ElearningPortalAccess,
            ElearningBypassAuth
        };
    }

    public static class PermissionPolicy
    {
        public static List<string> ResolvePermissions(
            string? systemRole,
            IEnumerable<string>? tenantRoles)
        {
            var roles = new HashSet<string>(
                tenantRoles ?? Enumerable.Empty<string>(),
                StringComparer.OrdinalIgnoreCase);
            var permissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            void Add(params string[] keys)
            {
                foreach (var key in keys)
                {
                    permissions.Add(key);
                }
            }

            if (string.Equals(systemRole, SystemRole.SystemOwner, StringComparison.OrdinalIgnoreCase))
            {
                permissions.UnionWith(PermissionKey.All);
                return permissions.OrderBy(x => x).ToList();
            }

            if (string.Equals(systemRole, SystemRole.SystemAdmin, StringComparison.OrdinalIgnoreCase))
            {
                Add(
                    PermissionKey.SystemUsersManage,
                    PermissionKey.SystemTenantsManage,
                    PermissionKey.SystemAuditView,
                    PermissionKey.CatalogEthnicGroupsManage,
                    PermissionKey.ElearningPortalAccess);
            }

            if (roles.Contains(TenantRole.TenantOwner))
            {
                Add(
                    PermissionKey.TenantMembersManage,
                    PermissionKey.TenantClassesManage,
                    PermissionKey.TenantSettingsEdit,
                    PermissionKey.ExamsCreate,
                    PermissionKey.ExamsGrade,
                    PermissionKey.ExamsTake,
                    PermissionKey.ElearningPortalAccess);
            }

            if (roles.Contains(TenantRole.TenantAdmin))
            {
                Add(
                    PermissionKey.TenantMembersManage,
                    PermissionKey.TenantClassesManage,
                    PermissionKey.TenantSettingsEdit,
                    PermissionKey.ExamsCreate,
                    PermissionKey.ExamsGrade,
                    PermissionKey.ExamsTake,
                    PermissionKey.ElearningPortalAccess);
            }

            if (roles.Contains(TenantRole.Teacher))
            {
                Add(
                    PermissionKey.TenantClassesManage,
                    PermissionKey.ExamsCreate,
                    PermissionKey.ExamsGrade,
                    PermissionKey.ElearningPortalAccess);
            }

            if (roles.Contains(TenantRole.Student))
            {
                Add(PermissionKey.ExamsTake, PermissionKey.ElearningPortalAccess);
            }

            if (roles.Contains(TenantRole.Parent))
            {
                Add(PermissionKey.ElearningPortalAccess);
            }

            if (string.Equals(systemRole, SystemRole.RegisteredUser, StringComparison.OrdinalIgnoreCase))
            {
                Add(PermissionKey.ExamsTake);
            }

            return permissions.OrderBy(x => x).ToList();
        }
    }
}
