using AUN_QA.SystemService.Entities;
using AUN_QA.SystemService.Infrastructure.Data;
using AUN_QA.SystemService.Infrastructure.Interceptors;
using AUN_QA.SystemService.Infrastructure.Validation;
using AUN_QA.SystemService.Services.GrpcService;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace AUN_QA.SystemService.Tests;

public class AuditFkRegressionTests
{
    [Fact]
    public async Task SaveChanges_skips_audit_row_when_request_has_no_valid_user_claim()
    {
        var httpContextAccessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext()
        };

        await using var seedContext = new TestSystemContext();
        var userId = Guid.NewGuid();
        var roleId = Guid.NewGuid();

        seedContext.Roles.Add(new Role
        {
            Id = roleId,
            Name = "Role A",
            CreatedBy = "seed",
            CreatedAt = DateTime.UtcNow,
            IsActived = true,
            IsDeleted = false
        });

        seedContext.Users.Add(new User
        {
            Id = userId,
            Username = "seed-user",
            Fullname = "Seed User",
            Email = "seed@example.com",
            Password = "hash",
            PasswordSalt = "salt",
            RoleId = roleId,
            Avatar = string.Empty,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "seed",
            IsActived = true,
            IsDeleted = false
        });

        await seedContext.SaveChangesAsync();

        await using var context = CreateContext(seedContext, httpContextAccessor);

        context.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = "refresh-token",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            CreatedByIp = "127.0.0.1"
        });

        await context.SaveChangesAsync();

        Assert.Empty(context.AuditLogs);
    }

    [Fact]
    public async Task AuditGrpcService_skips_invalid_user_id_without_persisting_audit_row()
    {
        await using var context = new TestSystemContext();
        var service = new AuditGrpcService(context, new SystemReferenceGuard(context), NullLogger<AuditGrpcService>.Instance);

        var response = await service.WriteAuditLog(new AUN_QA.SystemService.Protos.WriteAuditLogRequest
        {
            UserId = Guid.NewGuid().ToString(),
            UserName = "unknown",
            Action = "LOGIN",
            EntityName = "Auth",
            ServiceName = "SystemService",
            IsSuccess = true
        }, null!);

        Assert.True(response.Success);
        Assert.Empty(context.AuditLogs);
    }

    private static SystemContext CreateContext(TestSystemContext seedContext, HttpContextAccessor? httpContextAccessor = null)
    {
        var options = new DbContextOptionsBuilder<SystemContext>()
            .UseInMemoryDatabase(seedContext.DatabaseName, seedContext.DatabaseRoot)
            .AddInterceptors(new AuditInterceptor(
                httpContextAccessor ?? new HttpContextAccessor { HttpContext = new DefaultHttpContext() },
                new SystemReferenceGuard(seedContext)))
            .Options;

        return new SystemContext(options);
    }
}
