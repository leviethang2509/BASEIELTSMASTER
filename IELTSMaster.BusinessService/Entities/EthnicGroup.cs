using IELTSMaster.BusinessService.Entities.Common;

namespace IELTSMaster.BusinessService.Entities
{
    public class EthnicGroup : BaseBusinessEntity
    {
        public string TenGoi { get; set; } = string.Empty;
        public string? GhiChu { get; set; }
        public string? MoTa { get; set; }
        public int? ThuTuUuTien { get; set; }
        public bool IsActived { get; set; } = true;
    }
}
