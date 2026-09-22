using AUN_QA.Shared.DTOs.Base;
using AUN_QA.SystemService.DTOs.CoreFeature.Permission.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.Permission.Requests;
using AUN_QA.SystemService.DTOs.CoreFeature.Role.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.Role.Requests;

namespace AUN_QA.SystemService.Services.CoreFeature.Role
{
    public interface IRoleService
    {
        Task<ModelRole> GetById(GetByIdRequest request);
        Task<ModelRole> Insert(RoleRequest request);
        Task<ModelRole> Update(RoleRequest request);
        Task<string> DeleteList(DeleteListRequest request);
        Task<GetListPagingResponse<ModelRoleGetListPaging>> GetList(GetListPagingRequest request);
        Task<List<ModelPermission>> GetPermissionsByRole(GetByIdRequest request);
        Task<bool> UpdatePermissions(UpdatePermissionsRequest request);
        Task<List<ModelCombobox>> GetAllForCombobox();
        Task<List<ModelGetPermissionByUser>> GetPermissionsByUser(GetByIdRequest request);
    }
}
