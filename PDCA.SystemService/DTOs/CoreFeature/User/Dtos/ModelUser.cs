using AUN_QA.Shared.DTOs.Base;

namespace AUN_QA.SystemService.DTOs.CoreFeature.User.Dtos
{
    public class ModelUser : BaseModel
    {
        public Guid Id { get; set; }

        public string Username { get; set; } = null!;

        public string Fullname { get; set; } = null!;

        public string Password { get; set; } = null!;

        public Guid RoleId { get; set; }

        public string? RoleName { get; set; }

        public string Email { get; set; } = null!;

        public string? Avatar { get; set; }
    }
}
