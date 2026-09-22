using AUN_QA.Shared.DTOs.Base;
using AUN_QA.SystemService.DTOs.CoreFeature.AuditLog.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.AuditLog.Requests;

namespace AUN_QA.SystemService.Services.CoreFeature.AuditLog;

public interface IAuditLogService
{
    Task<GetListPagingResponse<ModelAuditLog>> GetList(AuditLogGetListRequest request);
    Task<ModelAuditLog> GetById(GetByIdRequest request);
    Task<List<string>> GetDistinctEntityNames();
    Task<List<string>> GetDistinctActions();
}
