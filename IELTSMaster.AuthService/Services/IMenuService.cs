using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AUN_QA.Shared.DTOs.Base;
using IELTSMaster.AuthService.DTOs;

namespace IELTSMaster.AuthService.Services
{
    public interface IMenuService
    {
        Task<List<MenuGetListPagingDto>> GetListByUserAsync(string? userId);
        Task<GetListPagingResponse<MenuGetListPagingDto>> GetListAsync(GetListPagingRequest request);
        Task<MenuDto?> GetByIdAsync(Guid menuId);
        Task<MenuDto> InsertAsync(MenuDto dto);
        Task<MenuDto> UpdateAsync(MenuDto dto);
        Task<List<MenuDto>> DeleteListAsync(List<string> ids);
    }
}
