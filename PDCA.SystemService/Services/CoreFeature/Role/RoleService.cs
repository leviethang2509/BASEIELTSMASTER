using AUN_QA.Shared.DTOs.Base;
using AUN_QA.Shared.Exceptions;
using AUN_QA.SystemService.DTOs.CoreFeature.Permission.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.Permission.Requests;
using AUN_QA.SystemService.DTOs.CoreFeature.Role.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.Role.Requests;
using AUN_QA.SystemService.Helpers;
using AUN_QA.SystemService.Infrastructure.Data;
using AUN_QA.SystemService.Infrastructure.Validation;
using AutoDependencyRegistration.Attributes;
using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AUN_QA.SystemService.Services.CoreFeature.Role
{
    [RegisterClassAsTransient]
    public class RoleService : IRoleService
    {
        private readonly SystemContext _context;
        private readonly IMapper _mapper;
        private readonly IHttpContextAccessor _contextAccessor;
        private readonly ISystemReferenceGuard _referenceGuard;

        public RoleService(
            SystemContext context,
            IMapper mapper,
            IHttpContextAccessor contextAccessor,
            ISystemReferenceGuard referenceGuard)
        {
            _context = context;
            _mapper = mapper;
            _contextAccessor = contextAccessor;
            _referenceGuard = referenceGuard;
        }

        public async Task<ModelRole> GetById(GetByIdRequest request)
        {
            var data = await _context.Roles.FindAsync(request.Id);
            if (data == null)
            {
                throw new BusinessException("Dữ liệu không tồn tại");
            }

            return _mapper.Map<ModelRole>(data);
        }

        public async Task<ModelRole> Insert(RoleRequest request)
        {
            var data = _context.Roles.Where(x =>
                x.Name == request.Name
                && !x.IsDeleted
            );

            if (data.Any())
            {
                throw new BusinessException("Tên gọi đã tồn tại");
            }

            var add = _mapper.Map<Entities.Role>(request);
            add.Id = request.Id == Guid.Empty ? Guid.NewGuid() : request.Id;
            add.CreatedBy = _contextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
            add.CreatedAt = DateTime.UtcNow;
            add.IsActived = true;

            await _context.Roles.AddAsync(add);
            await _context.SaveChangesAsync();

            return _mapper.Map<ModelRole>(add);
        }

        public async Task<ModelRole> Update(RoleRequest request)
        {
            var data = _context.Roles.Where(x =>
                x.Name == request.Name
                && !x.IsDeleted && x.Id != request.Id);

            if (data.Any())
            {
                throw new BusinessException("Tên gọi đã tồn tại");
            }

            var update = await _context.Roles.FindAsync(request.Id);
            if (update == null)
            {
                throw new BusinessException("Dữ liệu không tồn tại");
            }

            _mapper.Map(request, update);

            update.UpdatedBy = _contextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
            update.UpdatedAt = DateTime.UtcNow;
            _context.Roles.Update(update);
            await _context.SaveChangesAsync();

            return _mapper.Map<ModelRole>(update);
        }

        public async Task<string> DeleteList(DeleteListRequest request)
        {
            foreach (var id in request.Ids)
            {
                var delete = await _context.Roles.FindAsync(id);
                if (delete == null)
                {
                    throw new BusinessException("Dữ liệu không tồn tại");
                }

                delete.IsDeleted = true;
                delete.UpdatedBy = _contextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
                delete.UpdatedAt = DateTime.UtcNow;

                _context.Roles.Update(delete);
            }

            await _context.SaveChangesAsync();
            return string.Join(',', request.Ids);
        }

        public async Task<GetListPagingResponse<ModelRoleGetListPaging>> GetList(GetListPagingRequest request)
        {
            var parameters = new[]
            {
                new SqlParameter("@i_textsearch", request.TextSearch),
                new SqlParameter("@i_pageindex", request.PageIndex - 1),
                new SqlParameter("@i_pagesize", request.PageSize),
            };

            var result = await _context.ExecuteStoredProcedure<GetListPagingResponse<ModelRoleGetListPaging>>("sp_role_getlistpaging", parameters);
            return result;
        }

        public async Task<List<ModelCombobox>> GetAllForCombobox()
        {
            var result = await _context.Roles.AsNoTracking().Where(x => !x.IsDeleted && x.IsActived)
            .Select(x => new ModelCombobox
            {
                Text = x.Name,
                Value = x.Id.ToString(),
            })
            .OrderBy(x => x.Text).ToListAsync();
            return result;
        }

        public async Task<List<ModelPermission>> GetPermissionsByRole(GetByIdRequest request)
        {
            var parameters = new[]
            {
                new SqlParameter("@i_role_id", request.Id)
            };

            var result = await _context.ExecuteStoredProcedure<List<ModelPermission>>("sp_permission_getbyrole", parameters);
            return result;
        }

        public async Task<bool> UpdatePermissions(UpdatePermissionsRequest request)
        {
            foreach (var item in request.Permissions)
            {
                await _referenceGuard.EnsureRoleExistsAsync(item.RoleId);
                await _referenceGuard.EnsureMenuExistsAsync(item.MenuId);

                var resultUpdate = await _context.Permissions.FindAsync(item.Id);
                if (resultUpdate == null)
                {
                    var add = _mapper.Map<Entities.Permission>(item);
                    _context.Add(add);
                }
                else
                {
                    _mapper.Map(item, resultUpdate);
                    _context.Update(resultUpdate);
                }

                var roleUpdate = await _context.Roles.FindAsync(item.RoleId);
                if (roleUpdate == null)
                {
                    throw new BusinessException("Vai trò không tồn tại.");
                }

                roleUpdate.UpdatedAt = DateTime.UtcNow;
                roleUpdate.UpdatedBy = _contextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
                _context.Update(roleUpdate);
            }


            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<List<ModelGetPermissionByUser>> GetPermissionsByUser(GetByIdRequest request)
        {
            var parameters = new[]
            {
                new SqlParameter("@i_user_id", request.Id)
            };

            var result = await _context.ExecuteStoredProcedure<List<ModelGetPermissionByUser>>("sp_permission_getbyuser", parameters);
            return result;
        }
    }
}
