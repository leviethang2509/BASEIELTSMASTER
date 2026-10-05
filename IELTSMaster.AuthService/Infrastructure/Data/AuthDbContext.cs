using IELTSMaster.AuthService.Entities;
using Microsoft.EntityFrameworkCore;

namespace IELTSMaster.AuthService.Infrastructure.Data
{
    public class AuthDbContext : DbContext
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
        {
        }

        public virtual DbSet<User> Users => Set<User>();
        public virtual DbSet<Tenant> Tenants => Set<Tenant>();
        public virtual DbSet<ServicePlan> ServicePlans => Set<ServicePlan>();
        public virtual DbSet<Membership> Memberships => Set<Membership>();
        public virtual DbSet<MembershipRole> MembershipRoles => Set<MembershipRole>();
        public virtual DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public virtual DbSet<SystemGroup> SystemGroups => Set<SystemGroup>();
        public virtual DbSet<Menu> Menus => Set<Menu>();
        public virtual DbSet<AuditLog> AuditLogs => Set<AuditLog>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.HasDefaultSchema("auth");
            var currentUtcSql = Database.IsSqlServer() ? "SYSUTCDATETIME()" : "now()";

            // User mapping
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("users", "auth");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(254).IsRequired();
                entity.Property(e => e.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
                entity.Property(e => e.FullName).HasColumnName("full_name").HasMaxLength(150).IsRequired();
                entity.Property(e => e.DateOfBirth).HasColumnName("date_of_birth").HasColumnType("date");
                entity.Property(e => e.Gender).HasColumnName("gender").HasMaxLength(10);
                entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(30);
                entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(1024);
                entity.Property(e => e.Address).HasColumnName("address").HasMaxLength(500);
                entity.Property(e => e.Locale).HasColumnName("locale").HasMaxLength(10).HasDefaultValue("vi");
                entity.Property(e => e.Timezone).HasColumnName("timezone").HasMaxLength(64).HasDefaultValue("Asia/Ho_Chi_Minh");
                entity.Property(e => e.SystemRole).HasColumnName("system_role").HasMaxLength(32).HasDefaultValue("REGISTERED_USER");
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(16).HasDefaultValue("active");
                entity.Property(e => e.MustChangePassword).HasColumnName("must_change_password").HasDefaultValue(false);
                entity.Property(e => e.TokenVersion).HasColumnName("token_version").HasDefaultValue(0);
                entity.Property(e => e.EmailVerifiedAt).HasColumnName("email_verified_at");
                entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");

                entity.HasIndex(e => e.Email).IsUnique();
            });

            // ServicePlan mapping
            modelBuilder.Entity<ServicePlan>(entity =>
            {
                entity.ToTable("service_plans", "auth");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(32).IsRequired();
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.MaxMembers).HasColumnName("max_members");
                entity.Property(e => e.Price).HasColumnName("price").HasColumnType("numeric(12,2)");
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
                entity.Property(e => e.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql(currentUtcSql);
            });

            // Tenant mapping
            modelBuilder.Entity<Tenant>(entity =>
            {
                entity.ToTable("tenants", "auth");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
                entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(40).IsRequired();
                entity.Property(e => e.LogoUrl).HasColumnName("logo_url").HasMaxLength(1024);
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(254);
                entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(30);
                entity.Property(e => e.Address).HasColumnName("address").HasMaxLength(500);
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(16).HasDefaultValue("pending");
                entity.Property(e => e.RejectionReason).HasColumnName("rejection_reason").HasMaxLength(1000);
                entity.Property(e => e.SuspensionReason).HasColumnName("suspension_reason").HasMaxLength(1000);
                entity.Property(e => e.PlanId).HasColumnName("plan_id");
                entity.Property(e => e.OwnerUserId).HasColumnName("owner_user_id");
                entity.Property(e => e.ReviewedBy).HasColumnName("reviewed_by");
                entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");

                entity.HasIndex(e => e.Slug).IsUnique();

                entity.HasOne(e => e.Plan)
                    .WithMany(p => p.Tenants)
                    .HasForeignKey(e => e.PlanId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Owner)
                    .WithMany()
                    .HasForeignKey(e => e.OwnerUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Membership mapping
            modelBuilder.Entity<Membership>(entity =>
            {
                entity.ToTable("memberships", "auth");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.TenantId).HasColumnName("tenant_id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(16).HasDefaultValue("active");
                entity.Property(e => e.JoinedAt).HasColumnName("joined_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.CreatedBy).HasColumnName("created_by");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
                entity.Property(e => e.LastActiveAt).HasColumnName("last_active_at");

                entity.HasOne(e => e.Tenant)
                    .WithMany(t => t.Memberships)
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Memberships)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // MembershipRole mapping (composite PK: membership_id, role)
            modelBuilder.Entity<MembershipRole>(entity =>
            {
                entity.ToTable("membership_roles", "auth");
                entity.HasKey(e => new { e.MembershipId, e.Role });

                entity.Property(e => e.MembershipId).HasColumnName("membership_id");
                entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(32);
                entity.Property(e => e.TenantId).HasColumnName("tenant_id");

                entity.HasOne(e => e.Membership)
                    .WithMany(m => m.Roles)
                    .HasForeignKey(e => e.MembershipId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // RefreshToken mapping
            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.ToTable("refresh_tokens", "auth");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.TokenHash).HasColumnName("token_hash").HasMaxLength(64).IsFixedLength().IsRequired();
                entity.Property(e => e.FamilyId).HasColumnName("family_id");
                entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
                entity.Property(e => e.RevokedAt).HasColumnName("revoked_at");
                entity.Property(e => e.ReplacedById).HasColumnName("replaced_by_id");
                entity.Property(e => e.UserAgent).HasColumnName("user_agent").HasMaxLength(512);
                entity.Property(e => e.Ip).HasColumnName("ip").HasMaxLength(64);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql(currentUtcSql);

                entity.HasIndex(e => e.TokenHash).IsUnique();
                entity.HasIndex(e => e.FamilyId);
                entity.HasIndex(e => e.UserId);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.RefreshTokens)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SystemGroup mapping
            modelBuilder.Entity<SystemGroup>(entity =>
            {
                entity.ToTable("system_groups", "auth");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
                entity.Property(e => e.Sort).HasColumnName("sort").HasDefaultValue(0);
                entity.Property(e => e.ParentId).HasColumnName("parent_id");
                entity.Property(e => e.IsEdit).HasColumnName("is_edit").HasDefaultValue(true);
                entity.Property(e => e.IsActived).HasColumnName("is_actived").HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql(currentUtcSql);

                entity.HasOne(e => e.Parent)
                    .WithMany(p => p.Children)
                    .HasForeignKey(e => e.ParentId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Menu mapping
            modelBuilder.Entity<Menu>(entity =>
            {
                entity.ToTable("menus", "auth");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Controller).HasColumnName("controller").HasMaxLength(150).IsRequired();
                entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
                entity.Property(e => e.SystemGroupId).HasColumnName("system_group_id");
                entity.Property(e => e.Sort).HasColumnName("sort").HasDefaultValue(0);
                entity.Property(e => e.CanView).HasColumnName("can_view").HasDefaultValue(true);
                entity.Property(e => e.CanAdd).HasColumnName("can_add").HasDefaultValue(true);
                entity.Property(e => e.CanUpdate).HasColumnName("can_update").HasDefaultValue(true);
                entity.Property(e => e.CanDelete).HasColumnName("can_delete").HasDefaultValue(true);
                entity.Property(e => e.CanApprove).HasColumnName("can_approve").HasDefaultValue(false);
                entity.Property(e => e.CanAnalyze).HasColumnName("can_analyze").HasDefaultValue(false);
                entity.Property(e => e.IsShowMenu).HasColumnName("is_show_menu").HasDefaultValue(true);
                entity.Property(e => e.IsEdit).HasColumnName("is_edit").HasDefaultValue(true);
                entity.Property(e => e.IsActived).HasColumnName("is_actived").HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql(currentUtcSql);
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql(currentUtcSql);

                entity.HasOne(e => e.SystemGroup)
                    .WithMany(g => g.Menus)
                    .HasForeignKey(e => e.SystemGroupId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // AuditLog mapping
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.ToTable("audit_logs", "auth");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.UserName).HasColumnName("user_name").HasMaxLength(256).HasDefaultValue(string.Empty);
                entity.Property(e => e.Action).HasColumnName("action").HasMaxLength(100).IsRequired();
                entity.Property(e => e.EntityName).HasColumnName("entity_name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.EntityId).HasColumnName("entity_id").HasMaxLength(100);
                entity.Property(e => e.OldValues).HasColumnName("old_values").HasColumnType("jsonb");
                entity.Property(e => e.NewValues).HasColumnName("new_values").HasColumnType("jsonb");
                entity.Property(e => e.IpAddress).HasColumnName("ip_address").HasMaxLength(100).HasDefaultValue("127.0.0.1");
                entity.Property(e => e.ServiceName).HasColumnName("service_name").HasMaxLength(100).HasDefaultValue("AuthService");
                entity.Property(e => e.IsSuccess).HasColumnName("is_success").HasDefaultValue(true);
                entity.Property(e => e.ErrorMessage).HasColumnName("error_message");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql(currentUtcSql);

                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => e.Action);
                entity.HasIndex(e => e.EntityName);
                entity.HasIndex(e => e.UserId);
            });
        }
    }
}
