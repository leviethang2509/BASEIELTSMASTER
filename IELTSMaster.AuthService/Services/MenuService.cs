using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AUN_QA.Shared.DTOs.Base;
using AUN_QA.Shared.Exceptions;
using IELTSMaster.AuthService.DTOs;
using IELTSMaster.AuthService.Entities;
using IELTSMaster.AuthService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IELTSMaster.AuthService.Services
{
    public class MenuService : IMenuService
    {
        private readonly AuthDbContext _context;
        private readonly ILogger<MenuService> _logger;

        public MenuService(AuthDbContext context, ILogger<MenuService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<MenuGetListPagingDto>> GetListByUserAsync(string? userId)
        {
            _logger.LogInformation("GetListByUser requested for user id: {UserId}", userId);

            return await _context.Menus
                .Include(m => m.SystemGroup)
                .Where(m => m.IsActived)
                .OrderBy(m => m.SystemGroup != null ? m.SystemGroup.Sort : 0)
                .ThenBy(m => m.Sort)
                .Select(m => new MenuGetListPagingDto
                {
                    Id = m.Id.ToString(),
                    Controller = m.Controller,
                    Name = m.Name,
                    SystemGroupId = m.SystemGroupId.ToString(),
                    SystemGroup = m.SystemGroup != null ? m.SystemGroup.Name : string.Empty,
                    Sort = m.Sort,
                    CanView = m.CanView,
                    CanAdd = m.CanAdd,
                    CanUpdate = m.CanUpdate,
                    CanDelete = m.CanDelete,
                    CanApprove = m.CanApprove,
                    CanAnalyze = m.CanAnalyze,
                    IsShowMenu = m.IsShowMenu,
                    IsEdit = m.IsEdit,
                    IsActived = m.IsActived
                })
                .ToListAsync();
        }

        public async Task<GetListPagingResponse<MenuGetListPagingDto>> GetListAsync(GetListPagingRequest request)
        {
            var query = _context.Menus
                .Include(m => m.SystemGroup)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.TextSearch))
            {
                var search = request.TextSearch.Trim();
                query = query.Where(m => EF.Functions.ILike(m.Name, $"%{search}%") || EF.Functions.ILike(m.Controller, $"%{search}%"));
            }

            var totalItems = await query.CountAsync();
            var pageIndex = request.PageIndex > 0 ? request.PageIndex : 1;
            var pageSize = request.PageSize > 0 ? request.PageSize : 10;

            var items = await query
                .OrderBy(m => m.Sort)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new MenuGetListPagingDto
                {
                    Id = m.Id.ToString(),
                    Controller = m.Controller,
                    Name = m.Name,
                    SystemGroupId = m.SystemGroupId.ToString(),
                    SystemGroup = m.SystemGroup != null ? m.SystemGroup.Name : string.Empty,
                    Sort = m.Sort,
                    CanView = m.CanView,
                    CanAdd = m.CanAdd,
                    CanUpdate = m.CanUpdate,
                    CanDelete = m.CanDelete,
                    CanApprove = m.CanApprove,
                    CanAnalyze = m.CanAnalyze,
                    IsShowMenu = m.IsShowMenu,
                    IsEdit = m.IsEdit,
                    IsActived = m.IsActived
                })
                .ToListAsync();

            return new GetListPagingResponse<MenuGetListPagingDto>
            {
                Data = items,
                TotalRow = totalItems,
                PageIndex = pageIndex,
                PageSize = pageSize
            };
        }

        public async Task<MenuDto?> GetByIdAsync(Guid menuId)
        {
            var menu = await _context.Menus.FindAsync(menuId);
            return menu == null ? null : ToDto(menu);
        }

        public async Task<MenuDto> InsertAsync(MenuDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Controller))
            {
                throw new BusinessException("Tên menu và Controller không được để trống");
            }

            Guid.TryParse(dto.SystemGroupId, out var groupId);

            var entity = new Menu
            {
                Id = Guid.NewGuid(),
                Controller = dto.Controller.Trim(),
                Name = dto.Name.Trim(),
                SystemGroupId = groupId,
                Sort = dto.Sort,
                CanView = dto.CanView,
                CanAdd = dto.CanAdd,
                CanUpdate = dto.CanUpdate,
                CanDelete = dto.CanDelete,
                CanApprove = dto.CanApprove,
                CanAnalyze = dto.CanAnalyze,
                IsShowMenu = dto.IsShowMenu,
                IsEdit = dto.IsEdit,
                IsActived = dto.IsActived,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Menus.Add(entity);
            await _context.SaveChangesAsync();

            return ToDto(entity);
        }

        public async Task<MenuDto> UpdateAsync(MenuDto dto)
        {
            if (!Guid.TryParse(dto.Id, out var menuId))
            {
                throw new BusinessException("ID menu không hợp lệ");
            }

            var entity = await _context.Menus.FindAsync(menuId);
            if (entity == null)
            {
                throw new BusinessException("Không tìm thấy menu", 404);
            }

            Guid.TryParse(dto.SystemGroupId, out var groupId);

            entity.Controller = dto.Controller.Trim();
            entity.Name = dto.Name.Trim();
            entity.SystemGroupId = groupId;
            entity.Sort = dto.Sort;
            entity.CanView = dto.CanView;
            entity.CanAdd = dto.CanAdd;
            entity.CanUpdate = dto.CanUpdate;
            entity.CanDelete = dto.CanDelete;
            entity.CanApprove = dto.CanApprove;
            entity.CanAnalyze = dto.CanAnalyze;
            entity.IsShowMenu = dto.IsShowMenu;
            entity.IsEdit = dto.IsEdit;
            entity.IsActived = dto.IsActived;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return ToDto(entity);
        }

        public async Task<List<MenuDto>> DeleteListAsync(List<string> ids)
        {
            var guids = ids
                .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
                .Where(g => g != Guid.Empty)
                .ToList();

            var items = await _context.Menus.Where(m => guids.Contains(m.Id)).ToListAsync();
            _context.Menus.RemoveRange(items);
            await _context.SaveChangesAsync();

            return items.Select(ToDto).ToList();
        }

        private static MenuDto ToDto(Menu m) => new MenuDto
        {
            Id = m.Id.ToString(),
            Controller = m.Controller,
            Name = m.Name,
            SystemGroupId = m.SystemGroupId.ToString(),
            Sort = m.Sort,
            CanView = m.CanView,
            CanAdd = m.CanAdd,
            CanUpdate = m.CanUpdate,
            CanDelete = m.CanDelete,
            CanApprove = m.CanApprove,
            CanAnalyze = m.CanAnalyze,
            IsShowMenu = m.IsShowMenu,
            IsEdit = m.IsEdit,
            IsActived = m.IsActived
        };
    }
}
