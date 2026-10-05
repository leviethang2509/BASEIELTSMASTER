using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AUN_QA.Shared.Security
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
    public class ElearningAuthorizeAttribute : Attribute, IAsyncAuthorizationFilter
    {
        public bool BypassRbac { get; set; } = true;
        public string? Roles { get; set; }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                context.Result = new ContentResult
                {
                    Content = JsonSerializer.Serialize(new
                    {
                        success = false,
                        statusCode = StatusCodes.Status401Unauthorized,
                        message = "Chưa xác thực: Cần Access Token hợp lệ để truy cập tài nguyên e-learning"
                    }),
                    ContentType = "application/json",
                    StatusCode = StatusCodes.Status401Unauthorized
                };
                return;
            }

            var tenantCtx = new TenantUserContext(user);

            if (!tenantCtx.TenantId.HasValue)
            {
                context.Result = new ContentResult
                {
                    Content = JsonSerializer.Serialize(new
                    {
                        success = false,
                        statusCode = StatusCodes.Status403Forbidden,
                        message = "Người dùng chưa được gán vào trung tâm/tenant nào để tham gia học e-learning"
                    }),
                    ContentType = "application/json",
                    StatusCode = StatusCodes.Status403Forbidden
                };
                return;
            }

            context.HttpContext.Items["TenantUserContext"] = tenantCtx;

            if (BypassRbac)
            {
                await Task.CompletedTask;
                return;
            }

            if (!string.IsNullOrWhiteSpace(Roles))
            {
                var allowed = Roles.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (!tenantCtx.HasAnyTenantRole(allowed) && !tenantCtx.IsSystemManager())
                {
                    context.Result = new ContentResult
                    {
                        Content = JsonSerializer.Serialize(new
                        {
                            success = false,
                            statusCode = StatusCodes.Status403Forbidden,
                            message = "Bạn không có quyền thực hiện thao tác này trong hệ thống e-learning"
                        }),
                        ContentType = "application/json",
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                    return;
                }
            }

            await Task.CompletedTask;
        }
    }
}
