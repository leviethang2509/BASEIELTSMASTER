namespace IELTSMaster.AuthService.Entities
{
    public class ServicePlan
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int MaxMembers { get; set; }
        public decimal? Price { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();
    }
}
