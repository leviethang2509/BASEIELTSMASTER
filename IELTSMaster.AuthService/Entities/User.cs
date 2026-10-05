namespace IELTSMaster.AuthService.Entities
{
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Address { get; set; }
        public string Locale { get; set; } = "vi";
        public string Timezone { get; set; } = "Asia/Ho_Chi_Minh";
        public string SystemRole { get; set; } = AUN_QA.Shared.Security.SystemRole.RegisteredUser;
        public string Status { get; set; } = AUN_QA.Shared.Security.UserStatus.Active;
        public bool MustChangePassword { get; set; } = false;
        public int TokenVersion { get; set; } = 0;
        public DateTime? EmailVerifiedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; }

        public virtual ICollection<Membership> Memberships { get; set; } = new List<Membership>();
        public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    }
}
