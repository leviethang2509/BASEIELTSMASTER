using Grpc.Core;
using IELTSMaster.AuthService.Infrastructure.Data;
using IELTSMaster.AuthService.Protos;
using Microsoft.EntityFrameworkCore;

namespace IELTSMaster.AuthService.Services
{
    public class AuthGrpcService : AuthProto.AuthProtoBase
    {
        private readonly IAuthService _authService;
        private readonly AuthDbContext _context;

        public AuthGrpcService(IAuthService authService, AuthDbContext context)
        {
            _authService = authService;
            _context = context;
        }

        public override async Task<ValidateTokenResponse> ValidateToken(ValidateTokenRequest request, ServerCallContext context)
        {
            var result = await _authService.IntrospectTokenAsync(request.Token);
            if (!result.Active)
            {
                return new ValidateTokenResponse
                {
                    IsValid = false,
                    ErrorMessage = "Token không hợp lệ hoặc đã hết hạn"
                };
            }

            var response = new ValidateTokenResponse
            {
                IsValid = true,
                UserId = result.UserId?.ToString() ?? string.Empty,
                Email = result.Email ?? string.Empty,
                FullName = result.FullName ?? string.Empty,
                SystemRole = result.SystemRole ?? string.Empty,
                TenantId = result.Tenant?.Id.ToString() ?? string.Empty,
                TenantSlug = result.Tenant?.Slug ?? string.Empty,
                TenantName = result.Tenant?.Name ?? string.Empty,
                CanBypassElearningAuth = result.Elearning.CanBypassAuthorization,
                ElearningRole = result.Elearning.ElearningRole
            };

            if (result.Roles != null)
            {
                response.Roles.AddRange(result.Roles);
            }

            // Nếu caller yêu cầu kiểm tra tenant cụ thể
            if (!string.IsNullOrWhiteSpace(request.TargetTenantId) && 
                Guid.TryParse(request.TargetTenantId, out var targetTid))
            {
                if (result.Tenant?.Id != targetTid)
                {
                    response.IsValid = false;
                    response.ErrorMessage = "Token không thuộc tenant được yêu cầu";
                }
            }

            return response;
        }

        public override async Task<GetUserTenantContextResponse> GetUserTenantContext(GetUserTenantContextRequest request, ServerCallContext context)
        {
            if (!Guid.TryParse(request.UserId, out var userId) || !Guid.TryParse(request.TenantId, out var tenantId))
            {
                return new GetUserTenantContextResponse
                {
                    IsMember = false,
                    CanAccessElearning = false
                };
            }

            var membership = await _context.Memberships
                .Include(m => m.Roles)
                .FirstOrDefaultAsync(m => m.UserId == userId && m.TenantId == tenantId && m.DeletedAt == null);

            if (membership == null)
            {
                return new GetUserTenantContextResponse
                {
                    IsMember = false,
                    CanAccessElearning = false
                };
            }

            var response = new GetUserTenantContextResponse
            {
                IsMember = true,
                MembershipStatus = membership.Status,
                CanAccessElearning = membership.Status == AUN_QA.Shared.Security.MembershipStatus.Active
            };

            response.Roles.AddRange(membership.Roles.Select(r => r.Role));
            return response;
        }
    }
}
