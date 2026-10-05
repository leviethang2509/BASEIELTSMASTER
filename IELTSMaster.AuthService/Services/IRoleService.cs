using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AUN_QA.Shared.DTOs.Base;
using IELTSMaster.AuthService.DTOs;

namespace IELTSMaster.AuthService.Services
{
    public interface IRoleService
    {
        Task<List<SystemRoleInfoDto>> GetRolesAsync();
        Task<RolePermissionMatrixResponse> GetRolePermissionMatrixAsync();
        List<PermissionCategoryDto> GetPermissions();
        Task<List<GetPermissionByUserDto>> GetPermissionsByUserAsync(Guid? id);
        Task<List<ModelCombobox>> GetComboboxAsync();
    }
}
