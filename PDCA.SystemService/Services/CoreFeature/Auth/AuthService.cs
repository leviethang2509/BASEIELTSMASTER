using AUN_QA.Shared.Exceptions;
using AUN_QA.SystemService.DTOs.CoreFeature.Auth.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.Auth.Requests;
using AUN_QA.SystemService.DTOs.CoreFeature.RefreshToken.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.RefreshToken.Requests;
using AUN_QA.SystemService.DTOs.CoreFeature.User.Dtos;
using AUN_QA.SystemService.Entities;
using AUN_QA.SystemService.Helpers;
using AUN_QA.SystemService.Infrastructure.Data;
using AutoDependencyRegistration.Attributes;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace AUN_QA.SystemService.Services.CoreFeature.Auth
{
    [RegisterClassAsTransient]
    public class AuthService : IAuthService
    {
        private readonly SystemContext _context;
        private readonly IMapper _mapper;
        private readonly IHttpContextAccessor _contextAccessor;
        private readonly IConfiguration _config;
        public AuthService(
            SystemContext context,
            IMapper mapper,
            IHttpContextAccessor contextAccessor,
            IConfiguration config)
        {
            _context = context;
            _mapper = mapper;
            _contextAccessor = contextAccessor;
            _config = config;
        }

        public async Task<ModelUser> RegisterAsync(RegisterRequest request)
        {
            var username = request.Username.Trim();
            var email = request.Email.Trim();

            var exists = await _context.Users.AnyAsync(x =>
                !x.IsDeleted && (x.Username == username || x.Email == email));
            if (exists)
            {
                throw new BusinessException("Tên đăng nhập hoặc email đã tồn tại");
            }

            var roleId = Guid.Empty;
            var configuredRoleId = _config["Auth:DefaultRegisterRoleId"];
            if (!string.IsNullOrWhiteSpace(configuredRoleId))
            {
                Guid.TryParse(configuredRoleId, out roleId);
            }

            if (roleId == Guid.Empty)
            {
                roleId = await _context.Roles
                    .Where(x => !x.IsDeleted && x.IsActived)
                    .OrderBy(x => x.CreatedAt)
                    .Select(x => x.Id)
                    .FirstOrDefaultAsync();
            }

            if (roleId == Guid.Empty)
            {
                throw new BusinessException("Hệ thống chưa có vai trò mặc định cho đăng ký");
            }

            var salt = Encrypt_DecryptHelper.GenerateSalt();
            var user = new Entities.User
            {
                Id = Guid.NewGuid(),
                Username = username,
                Fullname = request.Fullname.Trim(),
                Email = email,
                PasswordSalt = salt,
                Password = Encrypt_DecryptHelper.EncodePassword(request.Password, salt),
                RoleId = roleId,
                IsActived = true,
                IsDeleted = false,
                Avatar = string.Empty,
                CreatedBy = "SelfRegistration",
                CreatedAt = DateTime.UtcNow
            };

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            var response = _mapper.Map<ModelUser>(user);
            response.Password = string.Empty;
            response.RoleName = await _context.Roles
                .Where(x => x.Id == roleId)
                .Select(x => x.Name)
                .FirstOrDefaultAsync();
            return response;
        }

        public async Task<LoginResponse> LoginAsync(LoginRequest request, string ipAddress)
        {
            var user = _context.Users.Where(x => x.Username == request.Username && !x.IsDeleted).FirstOrDefault();
            if (user == null)
            {
                throw new BusinessException("Tài khoản không tồn tại");
            }

            if (!user.IsActived)
            {
                throw new BusinessException("Tài khoản đã bị vô hiệu");
            }

            var pass = Encrypt_DecryptHelper.EncodePassword(request.Password, user.PasswordSalt);
            if (!pass.Equals(user.Password))
            {
                throw new BusinessException("Tài khoản hoặc mật khẩu không đúng");
            }

            var data = _mapper.Map<LoginResponse>(user);
            var token = _config.GenerateJwtToken(data);
            var refreshToken = _config.GenerateRefreshToken(ipAddress);
            refreshToken.UserId = user.Id;
            _context.RefreshTokens.Add(refreshToken);
            _context.SaveChanges();

            data.RefreshToken = refreshToken.Token.ToString();
            data.AccessToken = token;

            return data;
        }

        public ModelToken RefreshToken(RefreshTokenRequest request, string ipAddress)
        {
            var user = getUserByRefreshToken(request.RefreshToken);
            var refreshToken = _mapper.Map<ModelRefreshToken>(user.RefreshTokens.Single(x => x.Token == request.RefreshToken));

            if (refreshToken.IsRevoked)
            {
                revokeDescendantRefreshTokens(refreshToken, user, ipAddress, $"Phát hiện Refresh token được sử dụng lại: {request.RefreshToken}");
                _context.SaveChanges();
            }

            if (!refreshToken.IsActive) throw new BusinessException("Token không hợp lệ");

            var newRefreshToken = rotateRefreshToken(refreshToken, ipAddress);
            newRefreshToken.UserId = user.Id;
            _context.RefreshTokens.Add(newRefreshToken);
            _context.SaveChanges();

            return new ModelToken
            {
                AccessToken = _config.GenerateJwtToken(_mapper.Map<ModelUser>(user)),
                RefreshToken = newRefreshToken.Token
            };
        }

        #region Private Methods
        private Entities.User? getUserByRefreshToken(string token)
        {
            return _context.Users.Include(u => u.RefreshTokens).AsNoTracking().SingleOrDefault(u => u.RefreshTokens.Any(t => t.Token == token));
        }

        private void revokeDescendantRefreshTokens(ModelRefreshToken refreshToken, Entities.User user, string ipAddress, string reason)
        {
            if (!string.IsNullOrEmpty(refreshToken.ReplacedByToken))
            {
                var childToken = _mapper.Map<ModelRefreshToken>(user.RefreshTokens.SingleOrDefault(x => x.Token == refreshToken.ReplacedByToken));
                if (childToken.IsActive) revokeRefreshToken(childToken, ipAddress, reason);
                else revokeDescendantRefreshTokens(childToken, user, ipAddress, reason);
            }
        }

        private void revokeRefreshToken(ModelRefreshToken token, string ipAddress, string reason = null, string replacedByToken = null)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedByIp = ipAddress;
            token.ReasonRevoked = reason;
            token.ReplacedByToken = replacedByToken;
            var updateToken = _mapper.Map<Entities.RefreshToken>(token);
            _context.RefreshTokens.Update(updateToken);
        }

        private RefreshToken rotateRefreshToken(ModelRefreshToken refreshToken, string ipAddress)
        {
            var newRefreshToken = _config.GenerateRefreshToken(ipAddress);
            revokeRefreshToken(refreshToken, ipAddress, "Generating a new refresh token", newRefreshToken.Token);
            return newRefreshToken;
        }
        #endregion
    }
}
