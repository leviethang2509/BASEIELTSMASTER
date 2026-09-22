using AUN_QA.Shared.DTOs.Base;
using AUN_QA.SystemService.DTOs.Base;
using AUN_QA.SystemService.DTOs.CoreFeature.AuditLog.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.AuditLog.Requests;
using AUN_QA.SystemService.Helpers;
using AUN_QA.SystemService.Services.CoreFeature.AuditLog;
using AUN_QA.Shared.Common;
using Microsoft.AspNetCore.Mvc;

namespace AUN_QA.SystemService.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuditLogController : BaseController<AuditLogController>
{
    private readonly IAuditLogService _service;

    public AuditLogController(IAuditLogService service)
    {
        _service = service;
    }

    [HttpPost, Route("get-list")]
    [AttributePermission(Action = ActionType.VIEW)]
    public async Task<IActionResult> GetList(AuditLogGetListRequest request)
    {
        var result = await _service.GetList(request);
        return Ok(new BaseResponse<GetListPagingResponse<ModelAuditLog>> { Data = result, Success = true });
    }

    [HttpGet, Route("get-by-id")]
    [AttributePermission(Action = ActionType.VIEW)]
    public async Task<IActionResult> GetById([FromQuery] GetByIdRequest request)
    {
        var result = await _service.GetById(request);
        return Ok(new BaseResponse<ModelAuditLog> { Data = result, Success = true });
    }

    [HttpGet, Route("get-entity-names")]
    [AttributePermission(Action = ActionType.VIEW)]
    public async Task<IActionResult> GetEntityNames()
    {
        var result = await _service.GetDistinctEntityNames();
        return Ok(new BaseResponse<List<string>> { Data = result, Success = true });
    }

    [HttpGet, Route("get-actions")]
    [AttributePermission(Action = ActionType.VIEW)]
    public async Task<IActionResult> GetActions()
    {
        var result = await _service.GetDistinctActions();
        return Ok(new BaseResponse<List<string>> { Data = result, Success = true });
    }
}
