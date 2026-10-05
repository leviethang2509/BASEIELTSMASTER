using System;
using System.Collections.Generic;
using System.Security.Claims;
using AUN_QA.Shared.DTOs.Base;
using Microsoft.AspNetCore.Mvc;

namespace IELTSMaster.BusinessService.Controllers
{
    /// <summary>
    /// Base Controller chuẩn hóa cho toàn bộ Microservice BusinessService
    /// Kế thừa và cải tiến từ mô hình BaseController của DAHOCTAP:
    /// - Cung cấp sẵn các helper trích xuất Claims người dùng (UserId, Email, TenantId)
    /// - Chuẩn hóa phản hồi API qua BaseResponse thống nhất
    /// </summary>
    [ApiController]
    public abstract class BaseBusinessController : ControllerBase
    {
        protected Guid? CurrentUserId
        {
            get
            {
                var val = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
                return Guid.TryParse(val, out var id) ? id : null;
            }
        }

        protected string? CurrentUserEmail =>
            User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value;

        protected string? CurrentUsername =>
            User.Identity?.Name
            ?? User.FindFirst("preferred_username")?.Value;

        protected Guid? CurrentTenantId
        {
            get
            {
                var val = User.FindFirst("tenant_id")?.Value
                          ?? User.FindFirst("TenantId")?.Value;
                return Guid.TryParse(val, out var id) ? id : null;
            }
        }

        [NonAction]
        protected IActionResult OkResponse<T>(T data, string? message = null)
        {
            return Ok(new BaseResponse<T>
            {
                Success = true,
                StatusCode = 200,
                Data = data,
                Message = message
            });
        }

        [NonAction]
        protected IActionResult ErrorResponse(string message, int statusCode = 400)
        {
            return StatusCode(statusCode, new BaseResponse<object?>
            {
                Success = false,
                StatusCode = statusCode,
                Message = message,
                Data = null
            });
        }

        [NonAction]
        protected IActionResult PagedResponse<T>(IEnumerable<T> data, int totalRow, int pageIndex = 1, int pageSize = 10)
        {
            return Ok(new BaseResponse<object>
            {
                Success = true,
                StatusCode = 200,
                Data = new
                {
                    Data = data,
                    TotalRow = totalRow,
                    PageIndex = pageIndex,
                    PageSize = pageSize
                }
            });
        }
    }
}
