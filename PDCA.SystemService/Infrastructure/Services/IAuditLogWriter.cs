using AUN_QA.SystemService.Entities;

namespace AUN_QA.SystemService.Infrastructure.Services;

public interface IAuditLogWriter
{
    Task WriteAsync(AuditLog auditLog);
}
