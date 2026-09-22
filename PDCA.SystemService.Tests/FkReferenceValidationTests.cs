using System.Reflection;
using AUN_QA.Shared.Exceptions;
using AUN_QA.Shared.DTOs.Base;
using AUN_QA.SystemService.DTOs.CoreFeature.Menu.Requests;
using AUN_QA.SystemService.DTOs.CoreFeature.Permission.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.Permission.Requests;
using AUN_QA.SystemService.DTOs.CoreFeature.Role.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.Role.Requests;
using AUN_QA.SystemService.DTOs.CoreFeature.SystemGroup.Requests;
using AUN_QA.SystemService.DTOs.CoreFeature.SystemGroup.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.User.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.User.Requests;
using AUN_QA.SystemService.Entities;
using AUN_QA.SystemService.Infrastructure.Data;
using AUN_QA.SystemService.Infrastructure.Validation;
using AUN_QA.SystemService.Services.Commons.UploadFile;
using AUN_QA.SystemService.Services.CoreFeature.Menu;
using AUN_QA.SystemService.Services.CoreFeature.Role;
using AUN_QA.SystemService.Services.CoreFeature.SystemGroup;
using AUN_QA.SystemService.Services.CoreFeature.User;
using AUN_QA.SystemService.Services.SystemGrpc;
using AUN_QA.SystemService.Protos;
using AutoMapper;
using Grpc.Core;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace AUN_QA.SystemService.Tests;

public class FkReferenceValidationTests
{
    [Fact]
    public async Task UserService_Insert_throws_when_role_does_not_exist()
    {
        await using var context = CreateContext();
        var service = CreateUserService(context);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.Insert(new UserRequest
        {
            Username = "fk-user",
            Fullname = "FK User",
            Password = "secret",
            Email = "fk-user@example.com",
            RoleId = Guid.NewGuid()
        }));

        Assert.Contains("Vai trò", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task MenuService_Insert_throws_when_system_group_does_not_exist()
    {
        await using var context = CreateContext();
        var service = CreateMenuService(context);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.Insert(new MenuRequest
        {
            Name = "Broken Menu",
            Controller = "broken",
            SystemGroupId = Guid.NewGuid()
        }));

        Assert.Contains("Nhóm hệ thống", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SystemGroupService_Insert_throws_when_parent_does_not_exist()
    {
        await using var context = CreateContext();
        var service = CreateSystemGroupService(context);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.Insert(new SystemGroupRequest
        {
            Name = "Child Group",
            Parentid = Guid.NewGuid()
        }));

        Assert.Contains("Nhóm cha", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RoleService_UpdatePermissions_throws_when_menu_does_not_exist()
    {
        await using var context = CreateContext();
        var roleId = Guid.NewGuid();
        context.Roles.Add(new Role
        {
            Id = roleId,
            Name = "Role A",
            CreatedBy = "seed",
            CreatedAt = DateTime.UtcNow,
            IsActived = true,
            IsDeleted = false
        });
        await context.SaveChangesAsync();

        var service = CreateRoleService(context);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.UpdatePermissions(new UpdatePermissionsRequest
        {
            Permissions =
            {
                new PermissionRequest
                {
                    Id = Guid.NewGuid(),
                    RoleId = roleId,
                    MenuId = Guid.NewGuid()
                }
            }
        }));

        Assert.Contains("Menu", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static TestSystemContext CreateContext() => new();

    private static UserService CreateUserService(TestSystemContext context)
        => new(context, CreateMapper<UserProfile>(), CreateHttpContextAccessor(), new FakeUploadFileService(), new SystemReferenceGuard(context));

    private static MenuService CreateMenuService(TestSystemContext context)
        => new(context, CreateMapper<MenuProfile>(), CreateHttpContextAccessor(), new SystemReferenceGuard(context));

    private static SystemGroupService CreateSystemGroupService(TestSystemContext context)
        => new(context, CreateMapper<SystemGroupProfile>(), CreateHttpContextAccessor(), new SystemReferenceGuard(context));

    private static RoleService CreateRoleService(TestSystemContext context)
        => new(context, CreateMapper<RoleProfile>(), CreateHttpContextAccessor(), new SystemReferenceGuard(context));

    private static HttpContextAccessor CreateHttpContextAccessor()
        => new()
        {
            HttpContext = new DefaultHttpContext()
        };

    private static IMapper CreateMapper<TProfile>()
        where TProfile : Profile, new()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile(new TProfile());
        }, NullLoggerFactory.Instance);

        return config.CreateMapper();
    }

    private sealed class FakeUploadFileService : IUploadFileService
    {
        public Task<List<AUN_QA.Shared.DTOs.Base.ModelAttachment>> UploadDataAsync(string lienKetId, string folderName, string tempFolder)
            => Task.FromResult(new List<AUN_QA.Shared.DTOs.Base.ModelAttachment>());

        public Task<bool> DeleteDataAsync(List<string> filePaths) => Task.FromResult(true);

        public Task<string> UploadAvatarAsync(string folderUploadId, string? oldImage) => Task.FromResult(oldImage ?? string.Empty);
    }

    private sealed class FakeUserService : IUserService
    {
        public Task<ModelUser> GetById(AUN_QA.Shared.DTOs.Base.GetByIdRequest request) => throw new NotImplementedException();
        public Task<List<ModelUser>> GetByIds(List<Guid> ids) => throw new NotImplementedException();
        public Task<List<ModelUser>> GetByUsernames(List<string> usernames) => throw new NotImplementedException();
        public Task<GetListPagingResponse<ModelUser>> GetByIdsPaged(List<Guid> ids, string? textSearch, int pageIndex, int pageSize) => throw new NotImplementedException();
        public Task<ModelUser> Insert(UserRequest request) => throw new NotImplementedException();
        public Task<ModelUser> Update(UserRequest request) => throw new NotImplementedException();
        public Task<string> DeleteList(AUN_QA.Shared.DTOs.Base.DeleteListRequest request) => throw new NotImplementedException();
        public Task<GetListPagingResponse<ModelUserGetListPaging>> GetList(AUN_QA.Shared.DTOs.Base.GetListPagingRequest request) => throw new NotImplementedException();
        public Task<CheckPermissionReponse> CheckPermission(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.CheckPermissionRequest request) => throw new NotImplementedException();
        public Task<ModelUser> GetCurrentUser() => throw new NotImplementedException();
        public Task<List<AUN_QA.Shared.DTOs.Base.ModelCombobox>> GetAllForCombobox() => throw new NotImplementedException();
        public Task<ModelUser> EditProfile(EditProfileRequest request) => throw new NotImplementedException();
        public Task<ModelUser> ChangePassword(ChangePasswordRequest request) => throw new NotImplementedException();
        public Task<ModelUser> UpdateUserProfileById(Guid userId, string fullname, string username, string email, string? password = null) => throw new NotImplementedException();
    }
}
