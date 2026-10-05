using AUN_QA.Shared.DTOs.Base;
using AUN_QA.Shared.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AUN_QA.FileService.Infrastructure.Filters;

public class AuditActionFilter : IAsyncActionFilter
{
    private readonly ILogger<AuditActionFilter> _logger;

    private static readonly HashSet<string> AuditableMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "DELETE"
    };

    private static readonly HashSet<string> SkipActions = new(StringComparer.OrdinalIgnoreCase)
    {
        "get-list", "get-by-id"
    };

    private static readonly Dictionary<string, string> ActionMap = new(StringComparer.OrdinalIgnoreCase)
    {
        { "Post", "UPLOAD_FILE" },
        { "upload", "UPLOAD_FILE" },
        { "delete-list", "DELETE_FILE" },
    };

    public AuditActionFilter(ILogger<AuditActionFilter> logger)
    {
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpMethod = context.HttpContext.Request.Method;
        if (!AuditableMethods.Contains(httpMethod)) { await next(); return; }

        var routeName = GetRouteName(context);
        if (SkipActions.Contains(routeName)) { await next(); return; }

        var auditAction = ResolveAction(routeName, httpMethod);
        context.HttpContext.Items["AuditAction"] = auditAction;

        var controllerName = GetControllerName(context);
        var executedContext = await next();

        var httpContext = context.HttpContext;
        var userName = httpContext.User?.Claims.FirstOrDefault(c => c.Type == "unique_name")?.Value ?? "Unknown";
        var clientIp = httpContext.GetClientIp();

        if (IsFailedResponse(executedContext))
        {
            var errorMessage = ExtractErrorMessage(executedContext) ?? "Unknown error";
            _logger.LogWarning("AUDIT FileService [FAILED] Action: {Action}, User: {User}, IP: {IP}, Controller: {Controller}, Error: {Error}",
                auditAction, userName, clientIp, controllerName, errorMessage);
        }
        else
        {
            _logger.LogInformation("AUDIT FileService [SUCCESS] Action: {Action}, User: {User}, IP: {IP}, Controller: {Controller}",
                auditAction, userName, clientIp, controllerName);
        }
    }

    private static string ResolveAction(string routeName, string httpMethod)
    {
        if (ActionMap.TryGetValue(routeName, out var mapped)) return mapped;
        if (routeName.Contains("delete", StringComparison.OrdinalIgnoreCase)) return "DELETE_FILE";
        if (routeName.Contains("upload", StringComparison.OrdinalIgnoreCase)) return "UPLOAD_FILE";
        return httpMethod switch { "POST" => "UPLOAD_FILE", "PUT" => "UPDATE", "DELETE" => "DELETE_FILE", _ => "UNKNOWN" };
    }

    private static bool IsFailedResponse(ActionExecutedContext ctx)
    {
        if (ctx.Exception != null && !ctx.ExceptionHandled) return true;
        if (ctx.Result is ObjectResult obj && obj.Value != null)
        {
            var t = obj.Value.GetType();
            if (t.IsGenericType && t.GetGenericTypeDefinition() == typeof(BaseResponse<>))
                return (bool?)t.GetProperty("Success")?.GetValue(obj.Value) == false;
            if (obj.Value is BaseResponse br) return !br.Success;
        }
        return ctx.Result is ForbidResult;
    }

    private static string? ExtractErrorMessage(ActionExecutedContext ctx)
    {
        if (ctx.Exception != null) return ctx.Exception.Message;
        if (ctx.Result is ObjectResult obj && obj.Value != null)
        {
            var t = obj.Value.GetType();
            if (t.IsGenericType && t.GetGenericTypeDefinition() == typeof(BaseResponse<>))
                return t.GetProperty("Message")?.GetValue(obj.Value)?.ToString();
            if (obj.Value is BaseResponse br) return br.Message;
        }
        if (ctx.Result is ForbidResult) return "Không có quyền thực hiện thao tác này";
        return null;
    }

    private static string GetControllerName(ActionExecutingContext ctx)
        => ((ControllerActionDescriptor)ctx.ActionDescriptor).ControllerName;

    private static string GetRouteName(ActionExecutingContext ctx)
    {
        var d = ctx.ActionDescriptor as ControllerActionDescriptor;
        return d?.MethodInfo.GetCustomAttributes(typeof(RouteAttribute), false)
            .OfType<RouteAttribute>().FirstOrDefault()?.Template ?? d?.ActionName ?? "";
    }
}
