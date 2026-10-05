using System.Security.Claims;

namespace AUN_QA.Shared.Security
{
    public class TenantUserContext
    {
        public bool IsAuthenticated { get; }
        public Guid? UserId { get; }
        public string Email { get; } = string.Empty;
        public string FullName { get; } = string.Empty;
        public string SystemRole { get; } = string.Empty;

        public Guid? TenantId { get; }
        public string? TenantSlug { get; }
        public string? TenantName { get; }
        public Guid? MembershipId { get; }

        public IReadOnlyList<string> TenantRoles { get; } = Array.Empty<string>();
        public bool CanBypassAuthorization { get; }
        public bool CanAccessElearning { get; }

        public TenantUserContext(ClaimsPrincipal? principal)
        {
            if (principal?.Identity?.IsAuthenticated != true)
            {
                IsAuthenticated = false;
                return;
            }

            IsAuthenticated = true;

            var sub = principal.FindFirst(AuthClaimTypes.UserId)?.Value 
                      ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(sub, out var uid))
            {
                UserId = uid;
            }

            Email = principal.FindFirst(AuthClaimTypes.Email)?.Value 
                    ?? principal.FindFirst(ClaimTypes.Email)?.Value 
                    ?? string.Empty;

            FullName = principal.FindFirst(AuthClaimTypes.FullName)?.Value 
                       ?? principal.FindFirst(AuthClaimTypes.Name)?.Value 
                       ?? principal.FindFirst(ClaimTypes.Name)?.Value 
                       ?? string.Empty;

            SystemRole = principal.FindFirst(AuthClaimTypes.SystemRole)?.Value 
                         ?? Security.SystemRole.RegisteredUser;

            var tid = principal.FindFirst(AuthClaimTypes.TenantId)?.Value;
            if (Guid.TryParse(tid, out var parsedTenantId))
            {
                TenantId = parsedTenantId;
            }

            TenantSlug = principal.FindFirst(AuthClaimTypes.TenantSlug)?.Value;
            TenantName = principal.FindFirst(AuthClaimTypes.TenantName)?.Value;

            var mid = principal.FindFirst(AuthClaimTypes.MembershipId)?.Value;
            if (Guid.TryParse(mid, out var parsedMid))
            {
                MembershipId = parsedMid;
            }

            var roles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var claim in principal.FindAll(AuthClaimTypes.TenantRole))
            {
                if (!string.IsNullOrWhiteSpace(claim.Value)) roles.Add(claim.Value);
            }
            foreach (var claim in principal.FindAll(ClaimTypes.Role))
            {
                if (!string.IsNullOrWhiteSpace(claim.Value)) roles.Add(claim.Value);
            }
            foreach (var claim in principal.FindAll(AuthClaimTypes.Role))
            {
                if (!string.IsNullOrWhiteSpace(claim.Value)) roles.Add(claim.Value);
            }
            TenantRoles = roles.ToList();

            var bypassClaim = principal.FindFirst(AuthClaimTypes.ElearningBypassAuth)?.Value;
            CanBypassAuthorization = string.Equals(bypassClaim, "true", StringComparison.OrdinalIgnoreCase);

            var elearningAccess = principal.FindFirst(AuthClaimTypes.ElearningAccess)?.Value;
            CanAccessElearning = string.Equals(elearningAccess, "true", StringComparison.OrdinalIgnoreCase) 
                                 || TenantId.HasValue;
        }

        public bool HasTenantRole(string role)
        {
            return TenantRoles.Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase));
        }

        public bool HasAnyTenantRole(params string[] roles)
        {
            return TenantRoles.Any(r => roles.Contains(r, StringComparer.OrdinalIgnoreCase));
        }

        public bool IsSystemManager()
        {
            return RoleGroups.SystemManagerRoles.Contains(SystemRole, StringComparer.OrdinalIgnoreCase);
        }

        public bool IsTenantManager()
        {
            return HasAnyTenantRole(RoleGroups.TenantManagerRoles.ToArray());
        }

        public bool IsTeacher()
        {
            return HasTenantRole(Security.TenantRole.Teacher);
        }

        public bool IsStudent()
        {
            return HasTenantRole(Security.TenantRole.Student);
        }
    }
}
