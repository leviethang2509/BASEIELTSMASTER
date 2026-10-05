namespace IELTSMaster.AuthService.Entities
{
    public class RefreshToken
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public virtual User? User { get; set; }

        public string TokenHash { get; set; } = string.Empty;
        public Guid FamilyId { get; set; } = Guid.NewGuid();
        public DateTime ExpiresAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public Guid? ReplacedById { get; set; }
        public string? UserAgent { get; set; }
        public string? Ip { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public bool IsActive => RevokedAt == null && DateTime.UtcNow < ExpiresAt;
    }
}
