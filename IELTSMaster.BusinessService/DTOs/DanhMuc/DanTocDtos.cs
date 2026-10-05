using System.ComponentModel.DataAnnotations;
using AUN_QA.Shared.DTOs.Base;

namespace IELTSMaster.BusinessService.DTOs.DanhMuc
{
    public class DanTocDto : BaseModel
    {
        public Guid Id { get; set; }
        public string TenGoi { get; set; } = string.Empty;
        public string? GhiChu { get; set; }
        public string? MoTa { get; set; }
        public int? ThuTuUuTien { get; set; }
        public int TotalRow { get; set; }
    }

    public class PostDanTocRequest : BaseModel
    {
        public Guid Id { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Tên dân tộc không được rỗng")]
        public string TenGoi { get; set; } = string.Empty;

        public string? GhiChu { get; set; }
        public string? MoTa { get; set; }
        public int? ThuTuUuTien { get; set; }
    }

    public class DanTocCommandResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public Guid? Id { get; set; }
    }

    public class DanTocComboboxRow : ModelCombobox
    {
    }
}
