using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AUN_QA.Shared.DTOs.Base;
using IELTSMaster.AuthService.DTOs;

namespace IELTSMaster.AuthService.Services
{
    public interface ISystemGroupService
    {
        Task<List<SystemGroupDto>> GetAllAsync();
        Task<List<ModelComboboxDto>> GetAllComboboxAsync();
        Task<List<ModelComboboxDto>> GetAllNotParentComboboxAsync();
        Task<GetListPagingResponse<SystemGroupDto>> GetListAsync(GetListPagingRequest request);
        Task<SystemGroupDto?> GetByIdAsync(Guid groupId);
        Task<SystemGroupDto> InsertAsync(SystemGroupDto dto);
        Task<SystemGroupDto> UpdateAsync(SystemGroupDto dto);
        Task<List<SystemGroupDto>> DeleteListAsync(List<string> ids);
    }
}
