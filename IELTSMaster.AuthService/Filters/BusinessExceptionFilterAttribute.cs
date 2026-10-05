using AUN_QA.Shared.DTOs.Base;
using AUN_QA.Shared.Exceptions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace IELTSMaster.AuthService.Filters
{
    /// <summary>
    /// Chuyển <see cref="BusinessException"/> thành JSON <see cref="BaseResponse{T}"/> với đúng status code
    /// thay vì để rơi thành lỗi 500. Cần cho các client và service tích hợp (ClientApp, ELearning lang-api)
    /// đọc được thông báo lỗi nghiệp vụ (sai mật khẩu, phiên hết hạn, email trùng...).
    /// </summary>
    public sealed class BusinessExceptionFilterAttribute : ExceptionFilterAttribute
    {
        public override void OnException(ExceptionContext context)
        {
            if (context.Exception is not BusinessException ex)
            {
                return;
            }

            var statusCode = ex.StatusCode is >= 400 and < 600 ? ex.StatusCode : StatusCodes.Status400BadRequest;
            context.Result = new ObjectResult(new BaseResponse<object?>
            {
                Success = false,
                StatusCode = statusCode,
                Message = ex.Message,
                Data = null
            })
            {
                StatusCode = statusCode
            };
            context.ExceptionHandled = true;
        }
    }
}
