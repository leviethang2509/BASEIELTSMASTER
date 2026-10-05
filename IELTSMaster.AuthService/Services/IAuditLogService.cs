using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using IELTSMaster.AuthService.DTOs;

namespace IELTSMaster.AuthService.Services
{
    public interface IAuditLogService
    {
        Task<AuditLogPagingResponse<AuditLogDto>> GetListAsync(AuditLogGetListRequest request);
        Task<AuditLogDto?> GetByIdAsync(Guid id);
        Task<List<string>> GetEntityNamesAsync();
        Task<List<string>> GetActionsAsync();
    }
}
