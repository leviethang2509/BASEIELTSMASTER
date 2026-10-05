using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using IELTSMaster.BusinessService.DTOs.DanhMuc;
using IELTSMaster.BusinessService.Entities;
using IELTSMaster.BusinessService.Entities.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace IELTSMaster.BusinessService.Infrastructure.Data
{
    public class BusinessDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public DbSet<Branch> Branches => Set<Branch>();
        public DbSet<ClassItem> ClassItems => Set<ClassItem>();
        public DbSet<Student> Students => Set<Student>();
        public DbSet<EthnicGroup> EthnicGroups => Set<EthnicGroup>();

        public BusinessDbContext(
            DbContextOptions<BusinessDbContext> options,
            IHttpContextAccessor? httpContextAccessor = null) : base(options)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.HasDefaultSchema("business");

            // Tự động quét và nạp toàn bộ cấu hình IEntityTypeConfiguration<T> trong Assembly
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(BusinessDbContext).Assembly);

            modelBuilder.Entity<CaLamViecComboboxRow>(entity =>
            {
                entity.HasNoKey();
                entity.Property(x => x.Text).HasColumnName("Text");
                entity.Property(x => x.Value).HasColumnName("Value");
                entity.Property(x => x.Sort).HasColumnName("Sort");
                entity.Property(x => x.Parent).HasColumnName("Parent");
                entity.Property(x => x.IsSelected).HasColumnName("IsSelected");
            });

            modelBuilder.Entity<EthnicGroup>(entity =>
            {
                entity.ToTable("dm_dantoc", "business");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Id).HasColumnName("id");
                entity.Property(x => x.TenGoi).HasColumnName("ten_goi").HasMaxLength(255).IsRequired();
                entity.Property(x => x.GhiChu).HasColumnName("ghi_chu");
                entity.Property(x => x.MoTa).HasColumnName("mo_ta");
                entity.Property(x => x.ThuTuUuTien).HasColumnName("thu_tu_uu_tien");
                entity.Property(x => x.IsActived).HasColumnName("is_actived").HasDefaultValue(true);
                entity.Property(x => x.CreatedAt).HasColumnName("created_at");
                entity.Property(x => x.CreatedBy).HasColumnName("created_by").HasMaxLength(255);
                entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
                entity.Property(x => x.UpdatedBy).HasColumnName("updated_by").HasMaxLength(255);
                entity.Property(x => x.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);
            });

            modelBuilder.Entity<DanTocDto>(entity =>
            {
                entity.HasNoKey();
                entity.Property(x => x.Id).HasColumnName("Id");
                entity.Property(x => x.TenGoi).HasColumnName("TenGoi");
                entity.Property(x => x.GhiChu).HasColumnName("GhiChu");
                entity.Property(x => x.MoTa).HasColumnName("MoTa");
                entity.Property(x => x.ThuTuUuTien).HasColumnName("ThuTuUuTien");
                entity.Property(x => x.CreatedAt).HasColumnName("CreatedAt");
                entity.Property(x => x.CreatedBy).HasColumnName("CreatedBy");
                entity.Property(x => x.UpdatedAt).HasColumnName("UpdatedAt");
                entity.Property(x => x.UpdatedBy).HasColumnName("UpdatedBy");
                entity.Property(x => x.IsActived).HasColumnName("IsActived");
                entity.Property(x => x.IsEdit).HasColumnName("IsEdit");
                entity.Property(x => x.Sort).HasColumnName("Sort");
                entity.Property(x => x.TotalRow).HasColumnName("TotalRow");
            });

            modelBuilder.Entity<DanTocCommandResult>(entity =>
            {
                entity.HasNoKey();
                entity.Property(x => x.Success).HasColumnName("Success");
                entity.Property(x => x.Message).HasColumnName("Message");
                entity.Property(x => x.Id).HasColumnName("Id");
            });

            modelBuilder.Entity<DanTocComboboxRow>(entity =>
            {
                entity.HasNoKey();
                entity.Property(x => x.Text).HasColumnName("Text");
                entity.Property(x => x.Value).HasColumnName("Value");
                entity.Property(x => x.Sort).HasColumnName("Sort");
                entity.Property(x => x.Parent).HasColumnName("Parent");
                entity.Property(x => x.IsSelected).HasColumnName("IsSelected");
            });
        }

        /// <summary>
        /// Tự động Audit Trails khi lưu thay đổi (học hỏi cơ chế Audit từ DAHOCTAP)
        /// Tự động trích xuất User hiện tại từ JWT Claims trong HttpContext
        /// </summary>
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            ApplyAuditInformation();
            return await base.SaveChangesAsync(cancellationToken);
        }

        public override int SaveChanges()
        {
            ApplyAuditInformation();
            return base.SaveChanges();
        }

        private void ApplyAuditInformation()
        {
            var user = _httpContextAccessor?.HttpContext?.User;
            var currentUserId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                                ?? user?.FindFirst("sub")?.Value 
                                ?? user?.Identity?.Name;

            var entries = ChangeTracker.Entries<BaseBusinessEntity>();
            var now = DateTime.UtcNow;

            foreach (var entry in entries)
            {
                if (entry.State == EntityState.Added)
                {
                    entry.Entity.CreatedAt = now;
                    entry.Entity.CreatedBy = currentUserId ?? entry.Entity.CreatedBy;
                }
                else if (entry.State == EntityState.Modified)
                {
                    entry.Entity.UpdatedAt = now;
                    entry.Entity.UpdatedBy = currentUserId ?? entry.Entity.UpdatedBy;
                }
            }
        }
    }
}
