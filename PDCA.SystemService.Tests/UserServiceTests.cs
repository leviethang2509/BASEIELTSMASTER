using System.Security.Claims;
using System.Reflection;
using AUN_QA.Shared.Exceptions;
using AUN_QA.SystemService.DTOs.CoreFeature.User.Dtos;
using AUN_QA.SystemService.Entities;
using AUN_QA.SystemService.Infrastructure.Data;
using AUN_QA.SystemService.Infrastructure.Validation;
using AUN_QA.SystemService.Protos;
using AUN_QA.SystemService.Services.Commons.UploadFile;
using AUN_QA.SystemService.Services.CoreFeature.User;
using AUN_QA.SystemService.Services.SystemGrpc;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace AUN_QA.SystemService.Tests;

public class UserServiceTests
{
    [Fact]
    public async Task GetByIds_IncludesInactiveUsersAndKeepsUsernameAndEmail()
    {
        await using var context = CreateContext();
        var activeUserId = Guid.NewGuid();
        var inactiveUserId = Guid.NewGuid();

        SeedUser(context, activeUserId, "user-01", "User 01", "user-01@example.com", true);
        SeedUser(context, inactiveUserId, "user-02", "User 02", "user-02@example.com", false);
        await context.SaveChangesAsync();

        var service = CreateService(context);

        var result = await service.GetByIds(new List<Guid> { inactiveUserId, activeUserId });

        Assert.Equal(2, result.Count);
        Assert.Contains(result, user => user.Id == inactiveUserId && user.Username == "user-02");
        Assert.Contains(result, user => user.Id == activeUserId && user.Email == "user-01@example.com");
    }

    [Fact]
    public async Task GetByIdsPaged_SearchesCaseInsensitiveAcrossLinkedUsers()
    {
        await using var context = CreateContext();
        var inactiveUserId = Guid.NewGuid();
        var activeUserId = Guid.NewGuid();

        SeedUser(context, inactiveUserId, "user-01", "User 01", "user-01@example.com", false);
        SeedUser(context, activeUserId, "user-02", "User 02", "user-02@example.com", true);
        await context.SaveChangesAsync();

        var service = CreateService(context);

        var result = await service.GetByIdsPaged(
            new List<Guid> { inactiveUserId, activeUserId },
            "user",
            1,
            10);

        Assert.Equal(2, result.TotalRow);
        Assert.Equal(1, result.PageIndex);
        Assert.Equal(10, result.PageSize);
        Assert.Contains(result.Data, user => user.Username == "user-01");
        Assert.Contains(result.Data, user => user.Email == "user-02@example.com");
    }

    [Fact]
    public async Task UpdateUserProfileById_RejectsDuplicateEmail()
    {
        await using var context = CreateContext();
        var targetUserId = Guid.NewGuid();
        var existingUserId = Guid.NewGuid();

        SeedUser(context, targetUserId, "target-user", "Target User", "target@example.com", true);
        SeedUser(context, existingUserId, "existing-user", "Existing User", "duplicated@example.com", true);
        await context.SaveChangesAsync();

        var service = CreateService(context);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.UpdateUserProfileById(
                targetUserId,
                "Người Dùng Mới",
                "target-user",
                "duplicated@example.com"));

        Assert.Contains("tồn tại", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateUserProfileById_UpdatesPasswordWhenProvided()
    {
        await using var context = CreateContext();
        var userId = Guid.NewGuid();

        SeedUser(context, userId, "target-user", "Target User", "target@example.com", true);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var method = typeof(UserService).GetMethod(
            "UpdateUserProfileById",
            new[]
            {
                typeof(Guid),
                typeof(string),
                typeof(string),
                typeof(string),
                typeof(string)
            });

        Assert.NotNull(method);

        var resultTask = (Task<ModelUser>)method!.Invoke(service, new object[]
        {
            userId,
            "NgÆ°á»i DÃ¹ng Má»›i",
            "target-user",
            "target@example.com",
            "new-password"
        })!;

        var updated = await resultTask;
        var persisted = await context.Users.SingleAsync(x => x.Id == userId);

        Assert.Equal("NgÆ°á»i DÃ¹ng Má»›i", updated.Fullname);
        Assert.NotEqual("salt", persisted.PasswordSalt);
        Assert.NotEqual("password", persisted.Password);
    }

    [Fact]
    public async Task GetUsersByIds_ReturnsUsernameAndEmail()
    {
        await using var context = CreateContext();
        var userId = Guid.NewGuid();
        SeedUser(context, userId, "user-01", "User 01", "user-01@example.com", false);
        await context.SaveChangesAsync();

        var grpc = new SystemGrpcService(context, new FakeUserService
        {
            GetByIdsFactory = _ => Task.FromResult(new List<ModelUser>
            {
                new()
                {
                    Id = userId,
                    Username = "user-01",
                    Fullname = "User 01",
                    Email = "user-01@example.com",
                    Avatar = "avatar.png",
                    IsActived = false
                }
            })
        }, new SystemReferenceGuard(context));

        var response = await grpc.GetUsersByIds(new GetUsersByIdsRequest
        {
            UserIds = { userId.ToString() }
        }, null!);

        Assert.Equal("user-01", response.Users[0].Username);
        Assert.Equal("user-01@example.com", response.Users[0].Email);
    }

    [Fact]
    public async Task UpdateUserProfile_MapsUpdatedUserInResponse()
    {
        await using var context = CreateContext();
        var userId = Guid.NewGuid();
        SeedUser(context, userId, "user-01", "User 01", "user-01@example.com", true);
        await context.SaveChangesAsync();

        var grpc = new SystemGrpcService(context, new FakeUserService
        {
            UpdateUserProfileByIdFactory = (_, _, _, _, _) => Task.FromResult(new ModelUser
            {
                Id = userId,
                Username = "updated-user",
                Fullname = "Updated User",
                Email = "updated-user@example.com",
                Avatar = "",
                IsActived = true
            })
        }, new SystemReferenceGuard(context));

        var response = await grpc.UpdateUserProfile(new UpdateUserProfileRequest
        {
            UserId = userId.ToString(),
            Fullname = "Updated User",
            Username = "updated-user",
            Email = "updated-user@example.com"
        }, null!);

        Assert.True(response.Success);
        Assert.Equal("updated-user", response.User.Username);
        Assert.Equal("updated-user@example.com", response.User.Email);
    }

    private static TestSystemContext CreateContext() => new();

    private static UserService CreateService(TestSystemContext context)
    {
        var mapperConfig = new MapperConfiguration(cfg =>
        {
            cfg.AddMaps(typeof(UserProfile).Assembly);
        }, NullLoggerFactory.Instance);

        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[]
                    {
                        new Claim(ClaimTypes.Name, "system"),
                    },
                    authenticationType: "TestAuth"))
            }
        };

        return new UserService(context, mapperConfig.CreateMapper(), accessor, new FakeUploadFileService(), new SystemReferenceGuard(context));
    }

    private static void SeedUser(
        SystemContext context,
        Guid id,
        string username,
        string fullname,
        string email,
        bool isActived)
    {
        context.Users.Add(new User
        {
            Id = id,
            Username = username,
            Fullname = fullname,
            Email = email,
            Password = "password",
            PasswordSalt = "salt",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "seed",
            IsActived = isActived,
            IsDeleted = false,
            RoleId = Guid.NewGuid(),
            Avatar = string.Empty
        });
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
        public Func<List<Guid>, Task<List<ModelUser>>>? GetByIdsFactory { get; set; }
        public Func<Guid, string, string, string, string?, Task<ModelUser>>? UpdateUserProfileByIdFactory { get; set; }

        public Task<ModelUser> GetById(AUN_QA.Shared.DTOs.Base.GetByIdRequest request)
            => throw new NotImplementedException();

        public Task<List<ModelUser>> GetByIds(List<Guid> ids)
            => GetByIdsFactory?.Invoke(ids) ?? Task.FromResult(new List<ModelUser>());

        public Task<List<ModelUser>> GetByUsernames(List<string> usernames) => throw new NotImplementedException();
        public Task<ModelUser> Insert(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.UserRequest request) => throw new NotImplementedException();
        public Task<ModelUser> Update(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.UserRequest request) => throw new NotImplementedException();
        public Task<string> DeleteList(AUN_QA.Shared.DTOs.Base.DeleteListRequest request) => throw new NotImplementedException();
        public Task<AUN_QA.Shared.DTOs.Base.GetListPagingResponse<ModelUserGetListPaging>> GetList(AUN_QA.Shared.DTOs.Base.GetListPagingRequest request) => throw new NotImplementedException();
        public Task<AUN_QA.SystemService.DTOs.CoreFeature.User.Dtos.CheckPermissionReponse> CheckPermission(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.CheckPermissionRequest request) => throw new NotImplementedException();
        public Task<ModelUser> GetCurrentUser() => throw new NotImplementedException();
        public Task<List<AUN_QA.Shared.DTOs.Base.ModelCombobox>> GetAllForCombobox() => throw new NotImplementedException();
        public Task<ModelUser> EditProfile(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.EditProfileRequest request) => throw new NotImplementedException();
        public Task<ModelUser> ChangePassword(AUN_QA.SystemService.DTOs.CoreFeature.User.Requests.ChangePasswordRequest request) => throw new NotImplementedException();

        public Task<AUN_QA.Shared.DTOs.Base.GetListPagingResponse<ModelUser>> GetByIdsPaged(List<Guid> ids, string? textSearch, int pageIndex, int pageSize)
            => throw new NotImplementedException();

        public Task<ModelUser> UpdateUserProfileById(Guid userId, string fullname, string username, string email, string? password = null)
            => UpdateUserProfileByIdFactory?.Invoke(userId, fullname, username, email, password) ?? throw new NotImplementedException();
    }
}
