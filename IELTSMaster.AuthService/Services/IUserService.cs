using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AUN_QA.Shared.DTOs.Base;
using IELTSMaster.AuthService.DTOs;

namespace IELTSMaster.AuthService.Services
{
    public interface IUserService
    {
        Task<(List<UserManagementDto> Users, int Total)> GetUsersAsync(
            string? searchTerm, 
            string? systemRole, 
            string? status, 
            int pageIndex, 
            int pageSize);

        Task<UserManagementDto?> GetUserByIdAsync(Guid id);

        Task<UserManagementDto> CreateUserAsync(CreateUserRequest request);

        Task<UserManagementDto> UpdateUserAsync(Guid id, UpdateUserRequest request);

        Task<int> DeleteUsersAsync(List<Guid> ids);

        Task<bool> LockUserAsync(Guid id);

        Task<bool> UnlockUserAsync(Guid id);

        Task<bool> AssignTenantRoleAsync(Guid userId, AssignTenantRoleRequest request);

        Task<bool> RemoveTenantRoleAsync(Guid userId, Guid tenantId, string role);

        Task<bool> UpdateSystemRoleAsync(Guid userId, UpdateUserSystemRoleRequest request);

        Task<List<ModelCombobox>> GetComboboxAsync();
    }
}
