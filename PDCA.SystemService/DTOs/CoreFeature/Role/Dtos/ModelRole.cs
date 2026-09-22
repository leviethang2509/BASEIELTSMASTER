using AUN_QA.Shared.DTOs.Base;

namespace AUN_QA.SystemService.DTOs.CoreFeature.Role.Dtos
{
    public class ModelRole : BaseModel
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = null!;
    }
}
