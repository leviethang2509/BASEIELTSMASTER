using System.Text;
using AUN_QA.ServiceDefaults;
using AUN_QA.Shared.Common;
using Grpc.AspNetCore.Web;
using IELTSMaster.AuthService.Infrastructure.Data;
using IELTSMaster.AuthService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://+:{port}");
}

builder.WebHost.ConfigureKestrel(options =>
{
    options.ConfigureEndpointDefaults(lo => lo.Protocols = HttpProtocols.Http1AndHttp2);
});

builder.AddServiceDefaults();

// Cấu hình Database Context (hỗ trợ cả PostgreSQL - kế thừa từ lang-simulator và SQL Server)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                       ?? builder.Configuration.GetConnectionString("Auth");
var dbProvider = builder.Configuration["DatabaseProvider"] ?? "PostgreSQL";

if (string.Equals(dbProvider, "SqlServer", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddDbContext<AuthDbContext>(options => options.UseSqlServer(connectionString));
}
else
{
    builder.Services.AddDbContext<AuthDbContext>(options => options.UseNpgsql(connectionString, npgsql =>
    {
        npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "auth");
    }));
}

// Đăng ký Services nghiệp vụ Authentication & Phân quyền quản trị
builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IMenuService, MenuService>();
builder.Services.AddScoped<ISystemGroupService, SystemGroupService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

// Cấu hình JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Key"] ?? "super_secret_local_dev_key_must_be_over_32_chars_long_1234567890";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "IELTSMaster";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "IELTSMaster";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Controllers và gRPC
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });
builder.Services.AddGrpc();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>();
        if (origins.Length > 0)
        {
            policy.WithOrigins(origins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "IELTSMaster AuthService", 
        Version = "v1",
        Description = "Microservice chuyên biệt cho Authentication, phân quyền đa người thuê (Multi-tenant RBAC) và tích hợp E-learning"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Ví dụ: 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddTrustedForwardedHeaders(forwardLimit: 2);

var app = builder.Build();

app.UseTrustedForwardedHeaders();
app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "IELTSMaster AuthService v1"));
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.UseGrpcWeb(new GrpcWebOptions { DefaultEnabled = true });
app.MapGrpcService<AuthGrpcService>();

// Tự động kiểm tra và áp dụng Migration khi khởi động (Code-First Auto-Migration)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        await db.Database.MigrateAsync();
        await AuthDataSeeder.SeedMenusAndGroupsAsync(db, logger);
        await AuthDataSeeder.SeedAuditLogsAsync(db, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Lỗi xảy ra trong quá trình tự động cập nhật Migration CSDL cho AuthService.");
    }
}

app.Run();
