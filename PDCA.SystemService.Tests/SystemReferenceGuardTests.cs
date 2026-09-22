using AUN_QA.Shared.Exceptions;
using AUN_QA.SystemService.Entities;
using AUN_QA.SystemService.Infrastructure.Data;
using AUN_QA.SystemService.Infrastructure.Validation;
using Microsoft.EntityFrameworkCore;

namespace AUN_QA.SystemService.Tests;

public class SystemReferenceGuardTests
{
    [Fact]
    public async Task EnsureRoleExistsAsync_throws_when_role_is_missing()
    {
        await using var context = CreateContext();
        var guard = new SystemReferenceGuard(context);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            guard.EnsureRoleExistsAsync(Guid.NewGuid()));

        Assert.Contains("Vai trò", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task TryResolveExistingUserIdAsync_returns_null_for_guid_empty()
    {
        await using var context = CreateContext();
        var guard = new SystemReferenceGuard(context);

        var result = await guard.TryResolveExistingUserIdAsync(Guid.Empty);

        Assert.Null(result);
    }

    [Fact]
    public async Task TryResolveUserIdByUsernameAsync_returns_user_id_when_username_exists()
    {
        await using var context = CreateContext();
        var userId = Guid.NewGuid();
        context.Users.Add(new User
        {
            Id = userId,
            Username = "audit-user",
            Fullname = "Audit User",
            Email = "audit@example.com",
            Password = "password",
            PasswordSalt = "salt",
            RoleId = Guid.NewGuid(),
            IsActived = true,
            IsDeleted = false,
            CreatedBy = "seed",
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var guard = new SystemReferenceGuard(context);

        var result = await guard.TryResolveUserIdByUsernameAsync("audit-user");

        Assert.Equal(userId, result);
    }

    private static TestSystemContext CreateContext() => new();
}
