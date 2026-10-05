namespace IELTSMaster.AuthService.Entities
{
    public class Membership
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public virtual Tenant? Tenant { get; set; }

        public Guid UserId { get; set; }
        public virtual User? User { get; set; }

        public string Status { get; set; } = AUN_QA.Shared.Security.MembershipStatus.Active;
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        public Guid? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; }
        public DateTime? LastActiveAt { get; set; }

        public virtual ICollection<MembershipRole> Roles { get; set; } = new List<MembershipRole>();
    }
}
