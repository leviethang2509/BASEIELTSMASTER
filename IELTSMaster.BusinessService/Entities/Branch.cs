namespace IELTSMaster.BusinessService.Entities
{
    public class Branch
    {
        public Guid Id { get; set; }
        public string BranchCode { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string? Hotline { get; set; }
        public bool? IsActive { get; set; } = true;
    }
}
