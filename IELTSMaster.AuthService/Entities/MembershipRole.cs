namespace IELTSMaster.AuthService.Entities
{
    public class MembershipRole
    {
        public Guid MembershipId { get; set; }
        public virtual Membership? Membership { get; set; }

        public string Role { get; set; } = string.Empty;
        public Guid TenantId { get; set; }
    }
}
