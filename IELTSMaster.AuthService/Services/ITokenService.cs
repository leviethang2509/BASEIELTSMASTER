using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AUN_QA.Shared.Security;
using IELTSMaster.AuthService.Entities;
using Microsoft.IdentityModel.Tokens;

namespace IELTSMaster.AuthService.Services
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user, Tenant? activeTenant, Guid? membershipId, IEnumerable<string>? roles);
        (string RawToken, string TokenHash) GenerateRefreshToken();
        string HashToken(string rawToken);
        ClaimsPrincipal? ValidateToken(string token, out SecurityToken? validatedToken);
    }

    public class TokenService : ITokenService
    {
        private readonly IConfiguration _config;
        private readonly SymmetricSecurityKey _key;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly int _accessExpirationMinutes;

        public TokenService(IConfiguration config)
        {
            _config = config;
            var secret = _config["Jwt:Key"] ?? "super_secret_local_dev_key_must_be_over_32_chars_long_1234567890";
            _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            _issuer = _config["Jwt:Issuer"] ?? "IELTSMaster";
            _audience = _config["Jwt:Audience"] ?? "IELTSMaster";
            // Ưu tiên key chuẩn trong appsettings.json; giữ key cũ để tương thích ngược.
            // Thời hạn token phải khớp JWT_ACCESS_EXPIRES_IN của các service tích hợp.
            var expiryRaw = _config["Jwt:AccessTokenExpirationMinutes"] ?? _config["Jwt:AccessExpiryMinutes"];
            _accessExpirationMinutes = int.TryParse(expiryRaw, out var exp) ? exp : 15;
        }

        public string GenerateAccessToken(User user, Tenant? activeTenant, Guid? membershipId, IEnumerable<string>? roles)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.FullName),
                new Claim(AuthClaimTypes.FullName, user.FullName),
                new Claim(AuthClaimTypes.SystemRole, user.SystemRole),
                new Claim(AuthClaimTypes.TokenVersion, user.TokenVersion.ToString(), ClaimValueTypes.Integer32),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            // Nếu user có tenant context được kích hoạt
            if (activeTenant != null)
            {
                claims.Add(new Claim(AuthClaimTypes.TenantId, activeTenant.Id.ToString()));
                claims.Add(new Claim(AuthClaimTypes.TenantSlug, activeTenant.Slug));
                claims.Add(new Claim(AuthClaimTypes.TenantName, activeTenant.Name));

                if (membershipId.HasValue)
                {
                    claims.Add(new Claim(AuthClaimTypes.MembershipId, membershipId.Value.ToString()));
                }

                if (roles != null)
                {
                    foreach (var role in roles)
                    {
                        claims.Add(new Claim(AuthClaimTypes.TenantRole, role));
                        claims.Add(new Claim(ClaimTypes.Role, role));
                        claims.Add(new Claim(AuthClaimTypes.Role, role));
                    }
                }

                // E-learning access follows tenant context; bypass is reserved for system owner.
                claims.Add(new Claim(AuthClaimTypes.ElearningAccess, "true"));
                claims.Add(new Claim(AuthClaimTypes.ElearningBypassAuth,
                    string.Equals(user.SystemRole, SystemRole.SystemOwner, StringComparison.OrdinalIgnoreCase) ? "true" : "false"));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Claims = new Dictionary<string, object>
                {
                    { AuthClaimTypes.TokenVersion, user.TokenVersion }
                },
                Expires = DateTime.UtcNow.AddMinutes(_accessExpirationMinutes),
                Issuer = _issuer,
                Audience = _audience,
                SigningCredentials = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public (string RawToken, string TokenHash) GenerateRefreshToken()
        {
            var bytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            var rawToken = Base64UrlEncoder.Encode(bytes);
            var hash = HashToken(rawToken);
            return (rawToken, hash);
        }

        public string HashToken(string rawToken)
        {
            using var sha = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(rawToken);
            var hashBytes = sha.ComputeHash(bytes);
            return Convert.ToHexString(hashBytes).ToLowerInvariant();
        }

        public ClaimsPrincipal? ValidateToken(string token, out SecurityToken? validatedToken)
        {
            validatedToken = null;
            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = _key,
                    ValidateIssuer = true,
                    ValidIssuer = _issuer,
                    ValidateAudience = true,
                    ValidAudience = _audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out validatedToken);

                return principal;
            }
            catch
            {
                return null;
            }
        }
    }
}
