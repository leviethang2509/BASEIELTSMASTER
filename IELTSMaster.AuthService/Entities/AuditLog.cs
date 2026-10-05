using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IELTSMaster.AuthService.Entities
{
    [Table("audit_logs", Schema = "auth")]
    public class AuditLog
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("user_id")]
        public Guid? UserId { get; set; }

        [Column("user_name")]
        [MaxLength(256)]
        public string UserName { get; set; } = string.Empty;

        [Required]
        [Column("action")]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        [Required]
        [Column("entity_name")]
        [MaxLength(100)]
        public string EntityName { get; set; } = string.Empty;

        [Column("entity_id")]
        [MaxLength(100)]
        public string? EntityId { get; set; }

        [Column("old_values", TypeName = "jsonb")]
        public string? OldValues { get; set; }

        [Column("new_values", TypeName = "jsonb")]
        public string? NewValues { get; set; }

        [Column("ip_address")]
        [MaxLength(100)]
        public string IpAddress { get; set; } = "127.0.0.1";

        [Column("service_name")]
        [MaxLength(100)]
        public string ServiceName { get; set; } = "AuthService";

        [Column("is_success")]
        public bool IsSuccess { get; set; } = true;

        [Column("error_message")]
        public string? ErrorMessage { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
