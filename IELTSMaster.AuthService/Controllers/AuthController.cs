using System.Security.Claims;
using AUN_QA.Shared.DTOs.Base;
using AUN_QA.Shared.Exceptions;
using AUN_QA.Shared.Security;
using IELTSMaster.AuthService.DTOs;
using IELTSMaster.AuthService.Filters;
using IELTSMaster.AuthService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IELTSMaster.AuthService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [BusinessExceptionFilter]
    public class AuthController : ControllerBase
    {
        private const string RefreshCookieName = "ls_rt";
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var clientInfo = GetClientInfo();
            var result = await _authService.RegisterAsync(request, clientInfo);
            SetRefreshTokenCookie(result.RefreshToken);

            return Ok(new BaseResponse<LoginResponseDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status201Created,
                Message = "Đăng ký tài khoản thành công",
                Data = result
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var clientInfo = GetClientInfo();
                var result = await _authService.LoginAsync(request, clientInfo);
                SetRefreshTokenCookie(result.RefreshToken);

                return Ok(new BaseResponse<LoginResponseDto>
                {
                    Success = true,
                    StatusCode = StatusCodes.Status200OK,
                    Message = "Đăng nhập thành công",
                    Data = result
                });
            }
            catch (BusinessException ex)
            {
                return BadRequest(new BaseResponse<LoginResponseDto?>
                {
                    Success = false,
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = ex.Message,
                    Data = null
                });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest? request)
        {
            var rawToken = request?.RefreshToken;
            if (string.IsNullOrWhiteSpace(rawToken))
            {
                Request.Cookies.TryGetValue(RefreshCookieName, out rawToken);
            }

            var clientInfo = GetClientInfo();
            var result = await _authService.RefreshTokenAsync(rawToken, clientInfo);
            SetRefreshTokenCookie(result.RefreshToken);

            return Ok(new BaseResponse<LoginResponseDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Làm mới phiên đăng nhập thành công",
                Data = result
            });
        }

        [Authorize]
        [HttpPost("switch-tenant")]
        public async Task<IActionResult> SwitchTenant([FromBody] SwitchTenantRequest request)
        {
            var userId = GetCurrentUserId();
            var clientInfo = GetClientInfo();
            var result = await _authService.SwitchTenantAsync(userId, request, clientInfo);
            SetRefreshTokenCookie(result.RefreshToken);

            return Ok(new BaseResponse<LoginResponseDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Chuyển ngữ cảnh trung tâm thành công",
                Data = result
            });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest? request)
        {
            var rawToken = request?.RefreshToken;
            if (string.IsNullOrWhiteSpace(rawToken))
            {
                Request.Cookies.TryGetValue(RefreshCookieName, out rawToken);
            }

            await _authService.LogoutAsync(rawToken);
            Response.Cookies.Delete(RefreshCookieName);

            return Ok(new BaseResponse<string>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Đăng xuất thành công",
                Data = "Logged out"
            });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userId = GetCurrentUserId();
            var result = await _authService.GetMeAsync(userId);

            return Ok(new BaseResponse<AuthUserDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = result
            });
        }

        [Authorize]
        [HttpGet("contexts")]
        public async Task<IActionResult> GetContexts()
        {
            var userId = GetCurrentUserId();
            var result = await _authService.GetMeContextsAsync(userId);

            return Ok(new BaseResponse<MeContextsResponseDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = result
            });
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = GetCurrentUserId();
            Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken);
            var clientInfo = GetClientInfo();

            var result = await _authService.ChangePasswordAsync(userId, request, rawToken, clientInfo);
            SetRefreshTokenCookie(result.RefreshToken);

            return Ok(new BaseResponse<LoginResponseDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Đổi mật khẩu thành công",
                Data = result
            });
        }

        /// <summary>
        /// Endpoint kiểm tra và giải mã Access Token dành cho các hệ thống tích hợp (E-learning, ApiGateway, microservices khác).
        /// Cho phép e-learning kiểm tra tính hợp lệ và lấy thông tin user + tenant mà KHÔNG CẦN phân quyền phức tạp.
        /// </summary>
        [HttpPost("introspect")]
        public async Task<IActionResult> Introspect([FromBody] IntrospectTokenRequest request)
        {
            var result = await _authService.IntrospectTokenAsync(request.Token);
            return Ok(new BaseResponse<TokenIntrospectResponseDto>
            {
                Success = result.Active,
                StatusCode = result.Active ? StatusCodes.Status200OK : StatusCodes.Status401Unauthorized,
                Message = result.Active ? "Token hợp lệ" : "Token không hợp lệ hoặc đã hết hạn",
                Data = result
            });
        }

        /// <summary>
        /// Xác thực token trực tiếp qua header Authorization Bearer
        /// </summary>
        [Authorize]
        [HttpGet("validate")]
        public async Task<IActionResult> ValidateToken()
        {
            var authHeader = Request.Headers.Authorization.ToString();
            var token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? authHeader.Substring(7).Trim()
                : authHeader.Trim();

            var result = await _authService.IntrospectTokenAsync(token);
            return Ok(new BaseResponse<TokenIntrospectResponseDto>
            {
                Success = result.Active,
                StatusCode = StatusCodes.Status200OK,
                Data = result
            });
        }

        #region Helpers

        private Guid GetCurrentUserId()
        {
            var sub = User.FindFirst(AuthClaimTypes.UserId)?.Value 
                      ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(sub, out var uid))
            {
                return uid;
            }
            throw new BusinessException("Không tìm thấy thông tin định danh người dùng trong phiên làm việc");
        }

        private ClientInfo GetClientInfo()
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();
            return new ClientInfo
            {
                Ip = ip,
                UserAgent = string.IsNullOrWhiteSpace(userAgent) ? null : userAgent
            };
        }

        private void SetRefreshTokenCookie(string token)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = false,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(30),
                Path = "/"
            };
            Response.Cookies.Append(RefreshCookieName, token, cookieOptions);
        }

        #endregion
    }
}
