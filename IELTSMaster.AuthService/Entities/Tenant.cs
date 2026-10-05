namespace IELTSMaster.AuthService.Entities
{
    public class Tenant
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string? Description { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string Status { get; set; } = AUN_QA.Shared.Security.TenantStatus.Pending;
        public string? RejectionReason { get; set; }
        public string? SuspensionReason { get; set; }

        public Guid PlanId { get; set; }
        public virtual ServicePlan? Plan { get; set; }

        public Guid OwnerUserId { get; set; }
        public virtual User? Owner { get; set; }

        public Guid? ReviewedBy { get; set; }
        public DateTime? ReviewedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; }

        public virtual ICollection<Membership> Memberships { get; set; } = new List<Membership>();
    }
}
