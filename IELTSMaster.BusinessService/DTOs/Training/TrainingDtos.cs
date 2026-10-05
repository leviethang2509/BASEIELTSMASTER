using System;
using System.Collections.Generic;
using AUN_QA.Shared.DTOs.Base;

namespace IELTSMaster.BusinessService.DTOs.Training
{
    public class TrainingOverviewDto
    {
        public string Service { get; set; } = "IELTSMaster.BusinessService";
        public string Role { get; set; } = "Quản trị vận hành trung tâm IELTSMaster";
        public string Status { get; set; } = "Active";
        public string ElearningNote { get; set; } = "Nghiệp vụ đề thi và bài giảng số hóa được đồng bộ với Cổng E-Learning.";
        public int TotalBranches { get; set; }
        public int TotalClasses { get; set; }
        public int TotalStudents { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class BranchDto : BaseModel
    {
        public Guid Id { get; set; }
        public string BranchCode { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string? Hotline { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ClassItemDto : BaseModel
    {
        public Guid Id { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid BranchId { get; set; }
        public string? BranchName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int TotalSessions { get; set; }
        public string ClassStatus { get; set; } = "OPEN";
    }

    /// <summary>
    ///
    /// Phục vụ hiển thị Popup Dialog:
    /// - Khi thêm mới: IsEdit = false, Id được tạo sẵn, có danh sách combobox chi nhánh
    /// - Khi chỉnh sửa: IsEdit = true, nạp sẵn dữ liệu lớp học
    /// </summary>
    public class PostClassItemRequest
    {
        public Guid Id { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public Guid BranchId { get; set; }
        public DateTime StartDate { get; set; } = DateTime.Today;
        public DateTime EndDate { get; set; } = DateTime.Today.AddMonths(3);
        public int TotalSessions { get; set; } = 36;
        public string ClassStatus { get; set; } = "OPEN";
        public bool IsEdit { get; set; } = false;

        public List<ModelCombobox> BranchOptions { get; set; } = new();
    }
}
