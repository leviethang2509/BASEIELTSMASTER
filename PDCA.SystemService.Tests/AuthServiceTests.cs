using AUN_QA.SystemService.DTOs.CoreFeature.Auth.Requests;
using AUN_QA.SystemService.Entities;
using AUN_QA.SystemService.Infrastructure.Data;
using AUN_QA.SystemService.Services.CoreFeature.Auth;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace AUN_QA.SystemService.Tests;

public class AuthServiceTests
{
    [Fact]
    public async Task RegisterAsync_creates_an_active_user_with_the_default_role()
    {
        await using var context = new TestSystemContext();
        var roleId = Guid.NewGuid();
        context.Roles.Add(new Role
        {
            Id = roleId,
            Name = "User",
            CreatedBy = "seed",
            CreatedAt = DateTime.UtcNow,
            IsActived = true,
            IsDeleted = false
        });
        await context.SaveChangesAsync();

        var mapperConfig = new MapperConfiguration(cfg =>
        {
            cfg.AddMaps(typeof(AuthService).Assembly);
        }, NullLoggerFactory.Instance);
        var configuration = new ConfigurationBuilder().Build();
        var service = new AuthService(
            context,
            mapperConfig.CreateMapper(),
            new HttpContextAccessor(),
            configuration);

        var result = await service.RegisterAsync(new RegisterRequest
        {
            Username = "new-user",
            Fullname = "New User",
            Email = "new-user@example.com",
            Password = "secret123",
            ConfirmPassword = "secret123"
        });

        Assert.Equal("new-user", result.Username);
        Assert.Equal(roleId, result.RoleId);
        Assert.True(await context.Users.AnyAsync(x => x.Username == "new-user" && x.IsActived));
    }
}
