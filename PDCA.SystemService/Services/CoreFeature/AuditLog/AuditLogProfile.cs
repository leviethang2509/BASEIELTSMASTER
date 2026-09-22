using AutoMapper;
using AUN_QA.SystemService.DTOs.CoreFeature.AuditLog.Dtos;

namespace AUN_QA.SystemService.Services.CoreFeature.AuditLog;

public class AuditLogProfile : Profile
{
    public AuditLogProfile()
    {
        CreateMap<Entities.AuditLog, ModelAuditLog>();
    }
}
