namespace IELTSMaster.AuthService.Entities
{
    /// <summary>
    /// Nhóm menu / Nhóm chức năng hệ thống trong bảng auth.system_groups
    /// </summary>
    public class SystemGroup
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public int Sort { get; set; } = 0;
        public Guid? ParentId { get; set; }
        public bool IsEdit { get; set; } = true;
        public bool IsActived { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual SystemGroup? Parent { get; set; }
        public virtual ICollection<SystemGroup> Children { get; set; } = new List<SystemGroup>();
        public virtual ICollection<Menu> Menus { get; set; } = new List<Menu>();
    }
}
