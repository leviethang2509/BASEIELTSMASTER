using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AUN_QA.Shared.DTOs.Base;
using AUN_QA.Shared.Exceptions;
using AUN_QA.Shared.Security;
using IELTSMaster.AuthService.DTOs;
using IELTSMaster.AuthService.Entities;
using IELTSMaster.AuthService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace IELTSMaster.AuthService.Services
{
    public class UserService : IUserService
    {
        private readonly AuthDbContext _context;
        private readonly IPasswordHasher _passwordHasher;

        public UserService(AuthDbContext context, IPasswordHasher passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        public async Task<(List<UserManagementDto> Users, int Total)> GetUsersAsync(
            string? searchTerm, 
            string? systemRole, 
            string? status, 
            int pageIndex, 
            int pageSize)
        {
            if (pageIndex < 1) pageIndex = 1;
            if (pageSize < 1) pageSize = 10;

            var query = _context.Users
                .Include(u => u.Memberships)
                    .ThenInclude(m => m.Tenant)
                .Include(u => u.Memberships)
                    .ThenInclude(m => m.Roles)
                .Where(u => u.DeletedAt == null);

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim().ToLowerInvariant();
                query = query.Where(u => u.Email.ToLower().Contains(term) || u.FullName.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(systemRole))
            {
                query = query.Where(u => u.SystemRole == systemRole);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(u => u.Status == status);
            }

            var total = await query.CountAsync();

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new UserManagementDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    FullName = u.FullName,
                    SystemRole = u.SystemRole,
                    SystemRoleName = ResolveSystemRoleName(u.SystemRole),
                    Status = u.Status,
                    Phone = u.Phone,
                    AvatarUrl = u.AvatarUrl,
                    CreatedAt = u.CreatedAt,
                    LastLoginAt = u.LastLoginAt,
                    TenantNames = u.Memberships
                        .Where(m => m.DeletedAt == null && m.Tenant != null)
                        .Select(m => m.Tenant!.Name)
                        .Distinct()
                        .ToList(),
                    TenantRoles = u.Memberships
                        .Where(m => m.DeletedAt == null)
                        .SelectMany(m => m.Roles.Select(r => r.Role))
                        .Distinct()
                        .ToList()
                })
                .ToListAsync();

            return (users, total);
        }

        public async Task<UserManagementDto?> GetUserByIdAsync(Guid id)
        {
            var user = await _context.Users
                .Include(u => u.Memberships)
                    .ThenInclude(m => m.Tenant)
                .Include(u => u.Memberships)
                    .ThenInclude(m => m.Roles)
                .FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);

            return user == null ? null : MapToDto(user);
        }

        public async Task<UserManagementDto> CreateUserAsync(CreateUserRequest request)
        {
            var email = (request.Email ?? request.Username ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email))
            {
                throw new BusinessException("Email hoặc Tên đăng nhập không được để trống");
            }

            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == email && u.DeletedAt == null))
            {
                throw new ConflictException($"Email '{email}' đã tồn tại trong hệ thống");
            }

            var rawPassword = !string.IsNullOrWhiteSpace(request.Password) ? request.Password : "IeltsMaster@123";
            var role = !string.IsNullOrWhiteSpace(request.SystemRole) ? request.SystemRole : SystemRole.RegisteredUser;

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                PasswordHash = _passwordHasher.HashPassword(rawPassword),
                FullName = !string.IsNullOrWhiteSpace(request.FullName) ? request.FullName.Trim() : email,
                DateOfBirth = new DateTime(1995, 1, 1),
                Phone = request.Phone,
                AvatarUrl = request.AvatarUrl,
                SystemRole = role,
                Status = request.IsActived ? UserStatus.Active : UserStatus.Locked,
                Locale = "vi",
                Timezone = "Asia/Ho_Chi_Minh",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            return MapToDto(user);
        }

        public async Task<UserManagementDto> UpdateUserAsync(Guid id, UpdateUserRequest request)
        {
            var user = await _context.Users
                .Include(u => u.Memberships)
                    .ThenInclude(m => m.Tenant)
                .Include(u => u.Memberships)
                    .ThenInclude(m => m.Roles)
                .FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);

            if (user == null)
            {
                throw new BusinessException("Không tìm thấy người dùng", 404);
            }

            if (!string.IsNullOrWhiteSpace(request.FullName))
            {
                user.FullName = request.FullName.Trim();
            }

            if (request.Phone != null)
            {
                user.Phone = request.Phone;
            }

            if (request.AvatarUrl != null)
            {
                user.AvatarUrl = request.AvatarUrl;
            }

            if (!string.IsNullOrWhiteSpace(request.SystemRole))
            {
                user.SystemRole = request.SystemRole;
                user.TokenVersion += 1;
            }

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                user.Status = request.Status;
            }
            else if (request.IsActived.HasValue)
            {
                user.Status = request.IsActived.Value ? UserStatus.Active : UserStatus.Locked;
            }

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                user.PasswordHash = _passwordHasher.HashPassword(request.Password);
                user.TokenVersion += 1;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return MapToDto(user);
        }

        public async Task<int> DeleteUsersAsync(List<Guid> ids)
        {
            var users = await _context.Users
                .Where(u => ids.Contains(u.Id) && u.DeletedAt == null)
                .ToListAsync();

            if (users.Count == 0) return 0;

            foreach (var u in users)
            {
                u.DeletedAt = DateTime.UtcNow;
                u.Status = UserStatus.Locked;
                u.TokenVersion += 1;
            }

            await _context.SaveChangesAsync();
            return users.Count;
        }

        public async Task<bool> LockUserAsync(Guid id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);
            if (user == null) throw new BusinessException("Không tìm thấy người dùng", 404);

            user.Status = UserStatus.Locked;
            user.TokenVersion += 1;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UnlockUserAsync(Guid id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);
            if (user == null) throw new BusinessException("Không tìm thấy người dùng", 404);

            user.Status = UserStatus.Active;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AssignTenantRoleAsync(Guid userId, AssignTenantRoleRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null);
            if (user == null) throw new BusinessException("Không tìm thấy người dùng", 404);

            var membership = await _context.Memberships
                .Include(m => m.Roles)
                .FirstOrDefaultAsync(m => m.UserId == userId && m.TenantId == request.TenantId && m.DeletedAt == null);

            if (membership == null)
            {
                membership = new Membership
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    TenantId = request.TenantId,
                    JoinedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _context.Memberships.AddAsync(membership);
            }

            if (!membership.Roles.Any(r => r.Role == request.Role))
            {
                membership.Roles.Add(new MembershipRole
                {
                    MembershipId = membership.Id,
                    Role = request.Role,
                    TenantId = request.TenantId
                });
            }

            user.TokenVersion += 1;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemoveTenantRoleAsync(Guid userId, Guid tenantId, string role)
        {
            var membership = await _context.Memberships
                .Include(m => m.Roles)
                .FirstOrDefaultAsync(m => m.UserId == userId && m.TenantId == tenantId && m.DeletedAt == null);

            if (membership == null) return false;

            var roleItem = membership.Roles.FirstOrDefault(r => r.Role == role);
            if (roleItem != null)
            {
                _context.MembershipRoles.Remove(roleItem);
                var user = await _context.Users.FindAsync(userId);
                if (user != null) user.TokenVersion += 1;
                await _context.SaveChangesAsync();
                return true;
            }

            return false;
        }

        public async Task<bool> UpdateSystemRoleAsync(Guid userId, UpdateUserSystemRoleRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null);
            if (user == null) throw new BusinessException("Không tìm thấy người dùng", 404);

            user.SystemRole = request.SystemRole;
            user.TokenVersion += 1;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<ModelCombobox>> GetComboboxAsync()
        {
            return await _context.Users
                .Where(u => u.DeletedAt == null && u.Status == UserStatus.Active)
                .OrderBy(u => u.FullName)
                .Select(u => new ModelCombobox
                {
                    Value = u.Id.ToString(),
                    Text = $"{u.FullName} ({u.Email})"
                })
                .ToListAsync();
        }

        #region Helpers

        private static string ResolveSystemRoleName(string role)
        {
            return role switch
            {
                SystemRole.SystemOwner => "Chủ sở hữu hệ thống (System Owner)",
                SystemRole.SystemAdmin => "Quản trị viên hệ thống (System Admin)",
                SystemRole.RegisteredUser => "Người dùng đã đăng ký (Registered User)",
                _ => role
            };
        }

        private static UserManagementDto MapToDto(User u)
        {
            return new UserManagementDto
            {
                Id = u.Id,
                Email = u.Email,
                FullName = u.FullName,
                SystemRole = u.SystemRole,
                SystemRoleName = ResolveSystemRoleName(u.SystemRole),
                Status = u.Status,
                Phone = u.Phone,
                AvatarUrl = u.AvatarUrl,
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt,
                TenantNames = u.Memberships
                    .Where(m => m.DeletedAt == null && m.Tenant != null)
                    .Select(m => m.Tenant!.Name)
                    .Distinct()
                    .ToList(),
                TenantRoles = u.Memberships
                    .Where(m => m.DeletedAt == null)
                    .SelectMany(m => m.Roles.Select(r => r.Role))
                    .Distinct()
                    .ToList()
            };
        }

        #endregion
    }

    public class ConflictException : Exception
    {
        public ConflictException(string message) : base(message) { }
    }
}
