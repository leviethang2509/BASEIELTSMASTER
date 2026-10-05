using System.Text.Json;
using System.Threading.Tasks;
using IELTSMaster.BusinessService.Services;
using Microsoft.AspNetCore.Mvc;

namespace IELTSMaster.BusinessService.Controllers
{
    [ApiController]
    [Route("api/System/AuditLog")]
    [Route("api/System/[controller]")]
    [Route("api/[controller]")]
    public class AuditLogController : ControllerBase
    {
        private readonly IBusinessAuditLogService _auditLogService;

        public AuditLogController(IBusinessAuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        [HttpPost("get-list")]
        public async Task<IActionResult> GetList([FromBody] JsonElement request)
        {
            var resJson = await _auditLogService.ForwardGetListAsync(request);
            if (!string.IsNullOrEmpty(resJson))
            {
                return Content(resJson, "application/json");
            }

            return Ok(new
            {
                Success = true,
                StatusCode = 200,
                Data = new
                {
                    Data = new object[] { },
                    TotalRow = 0,
                    PageIndex = 1,
                    PageSize = 10
                }
            });
        }

        [HttpGet("get-by-id")]
        public async Task<IActionResult> GetById([FromQuery] string id)
        {
            var resJson = await _auditLogService.ForwardGetByIdAsync(id);
            if (!string.IsNullOrEmpty(resJson))
            {
                return Content(resJson, "application/json");
            }

            return Ok(new
            {
                Success = true,
                StatusCode = 200,
                Data = (object?)null
            });
        }

        [HttpGet("get-entity-names")]
        public async Task<IActionResult> GetEntityNames()
        {
            var resJson = await _auditLogService.ForwardGetEntityNamesAsync();
            if (!string.IsNullOrEmpty(resJson))
            {
                return Content(resJson, "application/json");
            }

            return Ok(new
            {
                Success = true,
                StatusCode = 200,
                Data = new[] { "User", "Role", "SystemGroup", "Menu", "Auth" }
            });
        }

        [HttpGet("get-actions")]
        public async Task<IActionResult> GetActions()
        {
            var resJson = await _auditLogService.ForwardGetActionsAsync();
            if (!string.IsNullOrEmpty(resJson))
            {
                return Content(resJson, "application/json");
            }

            return Ok(new
            {
                Success = true,
                StatusCode = 200,
                Data = new[] { "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "LOCK", "UNLOCK" }
            });
        }
    }
}
