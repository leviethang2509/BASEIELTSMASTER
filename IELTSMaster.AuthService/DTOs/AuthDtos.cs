namespace IELTSMaster.AuthService.DTOs
{
    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string? Username { get; set; }
        public string Password { get; set; } = string.Empty;
        public Guid? TenantId { get; set; }
        public string? TenantSlug { get; set; }
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Phone { get; set; }
    }

    public class RefreshTokenRequest
    {
        public string? RefreshToken { get; set; }
    }

    public class SwitchTenantRequest
    {
        public Guid? TenantId { get; set; }
        public string? TenantSlug { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class IntrospectTokenRequest
    {
        public string Token { get; set; } = string.Empty;
    }

    public class AuthUserDto
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string DateOfBirth { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? AvatarUrl { get; set; }
        public string Locale { get; set; } = "vi";
        public string Timezone { get; set; } = "Asia/Ho_Chi_Minh";
        public string SystemRole { get; set; } = string.Empty;
        public bool MustChangePassword { get; set; }
    }

    public class TenantSummaryDto
    {
        public Guid Id { get; set; }
        public string Slug { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class MeTenantContextDto
    {
        public Guid MembershipId { get; set; }
        public List<string> Roles { get; set; } = new List<string>();
        public List<string> Permissions { get; set; } = new List<string>();
        public DateTime JoinedAt { get; set; }
        public TenantSummaryDto Tenant { get; set; } = new TenantSummaryDto();
    }

    public class ElearningContextDto
    {
        public bool CanAccess { get; set; }
        public bool CanBypassAuthorization { get; set; }
        public string ElearningRole { get; set; } = "Learner";
        public List<string> Permissions { get; set; } = new List<string>();
        public string Reason { get; set; } = string.Empty;
    }

    public class LoginResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public AuthUserDto User { get; set; } = new AuthUserDto();
        public TenantSummaryDto? ActiveTenant { get; set; }
        public List<MeTenantContextDto> AvailableTenants { get; set; } = new List<MeTenantContextDto>();
        public ElearningContextDto Elearning { get; set; } = new ElearningContextDto();
    }

    public class MeContextsResponseDto
    {
        public string SystemRole { get; set; } = string.Empty;
        public List<MeTenantContextDto> Tenants { get; set; } = new List<MeTenantContextDto>();
    }

    public class TokenIntrospectResponseDto
    {
        public bool Active { get; set; }
        public Guid? UserId { get; set; }
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? SystemRole { get; set; }
        public bool MustChangePassword { get; set; }
        public TenantSummaryDto? Tenant { get; set; }
        public Guid? MembershipId { get; set; }
        public List<string> Roles { get; set; } = new List<string>();
        public List<string> Permissions { get; set; } = new List<string>();
        public ElearningContextDto Elearning { get; set; } = new ElearningContextDto();
    }

    public class ClientInfo
    {
        public string? UserAgent { get; set; }
        public string? Ip { get; set; }
    }
}
