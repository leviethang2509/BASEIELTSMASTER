using System;

namespace IELTSMaster.BusinessService.Entities.Common
{
    /// <summary>
    /// Thực thể cơ sở cho các Entity nghiệp vụ trong BusinessService.
    /// Tự động được BusinessDbContext điền thông tin Audit (CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
    /// tương tự mô hình chuyên nghiệp của DAHOCTAP.
    /// </summary>
    public abstract class BaseBusinessEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
        public bool IsDeleted { get; set; } = false;
    }
}
