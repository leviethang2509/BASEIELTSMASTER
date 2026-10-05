using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using IELTSMaster.AuthService.DTOs;
using IELTSMaster.AuthService.Filters;
using IELTSMaster.AuthService.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace IELTSMaster.AuthService.Controllers
{
    [ApiController]
    [Route("api/audit-logs")]
    [Route("api/AuditLog")]
    [Route("api/System/AuditLog")]
    [BusinessExceptionFilter]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _auditLogService;

        public AuditLogsController(IAuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        [HttpPost("get-list")]
        public async Task<IActionResult> GetList([FromBody] AuditLogGetListRequest request)
        {
            var result = await _auditLogService.GetListAsync(request);
            return Ok(new
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = result
            });
        }

        [HttpGet("{id:guid}")]
        [HttpGet("get-by-id")]
        public async Task<IActionResult> GetById([FromRoute] Guid? id, [FromQuery] Guid? queryId)
        {
            var targetId = id ?? queryId;
            if (!targetId.HasValue)
            {
                return BadRequest(new
                {
                    Success = false,
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "ID nhật ký không hợp lệ"
                });
            }

            var log = await _auditLogService.GetByIdAsync(targetId.Value);
            if (log == null)
            {
                return NotFound(new
                {
                    Success = false,
                    StatusCode = StatusCodes.Status404NotFound,
                    Message = "Không tìm thấy nhật ký kiểm toán"
                });
            }

            return Ok(new
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = log
            });
        }

        [HttpGet("get-entity-names")]
        public async Task<IActionResult> GetEntityNames()
        {
            var names = await _auditLogService.GetEntityNamesAsync();
            return Ok(new
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = names
            });
        }

        [HttpGet("get-actions")]
        public async Task<IActionResult> GetActions()
        {
            var actions = await _auditLogService.GetActionsAsync();
            return Ok(new
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = actions
            });
        }
    }
}
