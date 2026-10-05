namespace IELTSMaster.BusinessService.Entities
{
    public class Student
    {
        public Guid Id { get; set; }
        public Guid? CustomerId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? ParentName { get; set; }
        public string? ParentPhone { get; set; }
        public string? PaymentReceiptUrl { get; set; }
        public string? PortalStatus { get; set; }
        public DateTime? CreatedAt { get; set; }
    }
}
