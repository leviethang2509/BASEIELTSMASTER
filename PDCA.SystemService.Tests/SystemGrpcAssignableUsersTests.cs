using System.Collections;
using System.Reflection;
using AUN_QA.SystemService.Entities;
using AUN_QA.SystemService.DTOs.CoreFeature.User.Dtos;
using AUN_QA.SystemService.Infrastructure.Data;
using AUN_QA.SystemService.Infrastructure.Validation;
using AUN_QA.SystemService.Services.CoreFeature.User;
using AUN_QA.SystemService.Services.SystemGrpc;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;

namespace AUN_QA.SystemService.Tests;

public class SystemGrpcAssignableUsersTests
{
    [Fact]
    public async Task GetActiveUsersExceptRole_returns_only_active_non_excluded_users()
    {
        await using var context = CreateContext();

        var externalRoleId = Guid.Parse("551d1351-008e-4910-a39c-1fcdde409fdf");
        var internalRoleId = Guid.NewGuid();

        var includedId = Guid.NewGuid();
        var excludedByRoleId = Guid.NewGuid();
        var excludedByInactiveId = Guid.NewGuid();
        var excludedByDeletedId = Guid.NewGuid();

        SeedUser(context, includedId, internalRoleId, isActived: true, isDeleted: false, "internal-01", "Nguyễn A");
        SeedUser(context, excludedByRoleId, externalRoleId, isActived: true, isDeleted: false, "external-01", "External 01");
        SeedUser(context, excludedByInactiveId, internalRoleId, isActived: false, isDeleted: false, "inactive-01", "Inactive 01");
        SeedUser(context, excludedByDeletedId, internalRoleId, isActived: true, isDeleted: true, "deleted-01", "Deleted 01");

        await context.SaveChangesAsync();

        var grpc = new SystemGrpcService(context, new FakeUserService(), new SystemReferenceGuard(context));
        var method = typeof(SystemGrpcService).GetMethod(
            "GetActiveUsersExceptRole",
            BindingFlags.Instance | BindingFlags.Public);

        Assert.NotNull(method);

        var requestType = typeof(SystemGrpcService).Assembly.GetType(
            "AUN_QA.SystemService.Protos.GetActiveUsersExceptRoleRequest");
        Assert.NotNull(requestType);

        var request = Activator.CreateInstance(requestType!);
        requestType!.GetProperty("ExcludedRoleId")!.SetValue(request, externalRoleId.ToString());

        var task = (Task)method!.Invoke(grpc, new object?[] { request!, null! })!;
        await task;

        var response = task.GetType().GetProperty("Result")!.GetValue(task)!;
        var users = (IEnumerable)response.GetType().GetProperty("Users")!.GetValue(response)!;
        var rows = users.Cast<object>().ToList();

        Assert.Single(rows);

        var user = rows[0];
        Assert.Equal(includedId.ToString(), user.GetType().GetProperty("Id")!.GetValue(user));
        Assert.Equal("Nguyễn A", user.GetType().GetProperty("Fullname")!.GetValue(user));
        Assert.Equal("internal-01", user.GetType().GetProperty("Username")!.GetValue(user));
    }

    private static TestSystemContext CreateContext() => new();

    private static void SeedUser(
        SystemContext context,
        Guid id,
        Guid roleId,
        bool isActived,
        bool isDeleted,
        string username,
        string fullname)
    {
        context.Users.Add(new User
        {
            Id = id,
            Username = username,
            Fullname = fullname,
            Email = $"{username}@example.com",
            Password = "password",
            PasswordSalt = "salt",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "seed",
            IsActived = isActived,
            IsDeleted = isDeleted,
            RoleId = roleId,
            Avatar = string.Empty
        });
    }

    private sealed class FakeUserService : IUserService
    {
        public Task<ModelUser> GetById(AUN_QA.Shared.DTOs.Base.GetByIdRequest request)
            => throw new NotImplementedException();

        public Task<List<ModelUser>> GetByIds(List<Guid> ids)
            => throw new NotImplementedException();

        public Task<List<ModelUser>> GetByUsernames(List<string> usernames)
            => throw new NotImplementedException();

        public Task<ModelUser> Insert(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.UserRequest request)
            => throw new NotImplementedException();

        public Task<ModelUser> Update(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.UserRequest request)
            => throw new NotImplementedException();

        public Task<string> DeleteList(AUN_QA.Shared.DTOs.Base.DeleteListRequest request)
            => throw new NotImplementedException();

        public Task<AUN_QA.Shared.DTOs.Base.GetListPagingResponse<ModelUserGetListPaging>> GetList(AUN_QA.Shared.DTOs.Base.GetListPagingRequest request)
            => throw new NotImplementedException();

        public Task<AUN_QA.SystemService.DTOs.CoreFeature.User.Dtos.CheckPermissionReponse> CheckPermission(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.CheckPermissionRequest request)
            => throw new NotImplementedException();

        public Task<ModelUser> GetCurrentUser()
            => throw new NotImplementedException();

        public Task<List<AUN_QA.Shared.DTOs.Base.ModelCombobox>> GetAllForCombobox()
            => throw new NotImplementedException();

        public Task<ModelUser> EditProfile(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.EditProfileRequest request)
            => throw new NotImplementedException();

        public Task<ModelUser> ChangePassword(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.ChangePasswordRequest request)
            => throw new NotImplementedException();

        public Task<AUN_QA.Shared.DTOs.Base.GetListPagingResponse<ModelUser>> GetByIdsPaged(List<Guid> ids, string? textSearch, int pageIndex, int pageSize)
            => throw new NotImplementedException();

        public Task<ModelUser> UpdateUserProfileById(Guid userId, string fullname, string username, string email, string? password = null)
            => throw new NotImplementedException();
    }
}
