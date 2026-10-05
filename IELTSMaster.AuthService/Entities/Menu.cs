namespace IELTSMaster.AuthService.Entities
{
    /// <summary>
    /// Menu / Chức năng hệ thống phân quyền trong bảng auth.menus
    /// </summary>
    public class Menu
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Controller { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Guid SystemGroupId { get; set; }
        public int Sort { get; set; } = 0;

        // Quyền thao tác mặc định / phân quyền
        public bool CanView { get; set; } = true;
        public bool CanAdd { get; set; } = true;
        public bool CanUpdate { get; set; } = true;
        public bool CanDelete { get; set; } = true;
        public bool CanApprove { get; set; } = false;
        public bool CanAnalyze { get; set; } = false;

        public bool IsShowMenu { get; set; } = true;
        public bool IsEdit { get; set; } = true;
        public bool IsActived { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual SystemGroup? SystemGroup { get; set; }
    }
}
