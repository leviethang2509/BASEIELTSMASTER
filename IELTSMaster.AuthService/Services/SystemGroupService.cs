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
    public class SystemGroupService : ISystemGroupService
    {
        private readonly AuthDbContext _context;
        private readonly ILogger<SystemGroupService> _logger;

        public SystemGroupService(AuthDbContext context, ILogger<SystemGroupService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<SystemGroupDto>> GetAllAsync()
        {
            return await _context.SystemGroups
                .Where(g => g.IsActived)
                .OrderBy(g => g.Sort)
                .Select(g => new SystemGroupDto
                {
                    Id = g.Id.ToString(),
                    Name = g.Name,
                    Sort = g.Sort,
                    ParentId = g.ParentId.HasValue ? g.ParentId.Value.ToString() : null,
                    IsEdit = g.IsEdit,
                    IsActived = g.IsActived
                })
                .ToListAsync();
        }

        public async Task<List<ModelComboboxDto>> GetAllComboboxAsync()
        {
            return await _context.SystemGroups
                .Where(g => g.IsActived)
                .OrderBy(g => g.Sort)
                .Select(g => new ModelComboboxDto
                {
                    Value = g.Id.ToString(),
                    Text = g.Name
                })
                .ToListAsync();
        }

        public async Task<List<ModelComboboxDto>> GetAllNotParentComboboxAsync()
        {
            return await _context.SystemGroups
                .Where(g => g.IsActived && !g.ParentId.HasValue)
                .OrderBy(g => g.Sort)
                .Select(g => new ModelComboboxDto
                {
                    Value = g.Id.ToString(),
                    Text = g.Name
                })
                .ToListAsync();
        }

        public async Task<GetListPagingResponse<SystemGroupDto>> GetListAsync(GetListPagingRequest request)
        {
            var query = _context.SystemGroups.AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.TextSearch))
            {
                var search = request.TextSearch.Trim();
                query = query.Where(g => EF.Functions.ILike(g.Name, $"%{search}%"));
            }

            var totalItems = await query.CountAsync();
            var pageIndex = request.PageIndex > 0 ? request.PageIndex : 1;
            var pageSize = request.PageSize > 0 ? request.PageSize : 10;

            var items = await query
                .OrderBy(g => g.Sort)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .Select(g => new SystemGroupDto
                {
                    Id = g.Id.ToString(),
                    Name = g.Name,
                    Sort = g.Sort,
                    ParentId = g.ParentId.HasValue ? g.ParentId.Value.ToString() : null,
                    IsEdit = g.IsEdit,
                    IsActived = g.IsActived
                })
                .ToListAsync();

            return new GetListPagingResponse<SystemGroupDto>
            {
                Data = items,
                TotalRow = totalItems,
                PageIndex = pageIndex,
                PageSize = pageSize
            };
        }

        public async Task<SystemGroupDto?> GetByIdAsync(Guid groupId)
        {
            var entity = await _context.SystemGroups.FindAsync(groupId);
            return entity == null ? null : ToDto(entity);
        }

        public async Task<SystemGroupDto> InsertAsync(SystemGroupDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                throw new BusinessException("Tên nhóm hệ thống không được để trống");
            }

            Guid? parentId = null;
            if (!string.IsNullOrWhiteSpace(dto.ParentId) && Guid.TryParse(dto.ParentId, out var parsedParentId))
            {
                parentId = parsedParentId;
            }

            var entity = new SystemGroup
            {
                Id = Guid.NewGuid(),
                Name = dto.Name.Trim(),
                ParentId = parentId,
                Sort = dto.Sort,
                IsEdit = dto.IsEdit,
                IsActived = dto.IsActived,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.SystemGroups.Add(entity);
            await _context.SaveChangesAsync();

            return ToDto(entity);
        }

        public async Task<SystemGroupDto> UpdateAsync(SystemGroupDto dto)
        {
            if (!Guid.TryParse(dto.Id, out var groupId))
            {
                throw new BusinessException("ID nhóm hệ thống không hợp lệ");
            }

            var entity = await _context.SystemGroups.FindAsync(groupId);
            if (entity == null)
            {
                throw new BusinessException("Không tìm thấy nhóm hệ thống", 404);
            }

            Guid? parentId = null;
            if (!string.IsNullOrWhiteSpace(dto.ParentId) && Guid.TryParse(dto.ParentId, out var parsedParentId))
            {
                parentId = parsedParentId;
            }

            entity.Name = dto.Name.Trim();
            entity.ParentId = parentId;
            entity.Sort = dto.Sort;
            entity.IsEdit = dto.IsEdit;
            entity.IsActived = dto.IsActived;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return ToDto(entity);
        }

        public async Task<List<SystemGroupDto>> DeleteListAsync(List<string> ids)
        {
            var guids = ids
                .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
                .Where(g => g != Guid.Empty)
                .ToList();

            var items = await _context.SystemGroups.Where(g => guids.Contains(g.Id)).ToListAsync();
            _context.SystemGroups.RemoveRange(items);
            await _context.SaveChangesAsync();

            return items.Select(ToDto).ToList();
        }

        private static SystemGroupDto ToDto(SystemGroup g) => new SystemGroupDto
        {
            Id = g.Id.ToString(),
            Name = g.Name,
            Sort = g.Sort,
            ParentId = g.ParentId.HasValue ? g.ParentId.Value.ToString() : null,
            IsEdit = g.IsEdit,
            IsActived = g.IsActived
        };
    }
}
