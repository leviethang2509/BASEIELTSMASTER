using AUN_QA.Shared.DTOs.Base;

namespace AUN_QA.SystemService.DTOs.CoreFeature.SystemGroup.Dtos
{
    public class ModelSystemGroup : BaseModel
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = null!;

        public new int Sort { get; set; }

        public Guid? ParentId { get; set; }
    }
}
