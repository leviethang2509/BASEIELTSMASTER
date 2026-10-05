using AUN_QA.ServiceDefaults;
using IELTSMaster.BusinessService.Infrastructure.Data;
using IELTSMaster.BusinessService.Validators.DanhMuc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                       ?? "Host=127.0.0.1;Port=5432;Database=lang-simulator;Username=postgres";

builder.Services.AddDbContext<BusinessDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsql =>
    {
        npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "business");
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });
builder.Services.AddAutoMapper(_ => { }, typeof(Program).Assembly);
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IELTSMaster.BusinessService.Infrastructure.Data.IDatabaseFunctionResolver, IELTSMaster.BusinessService.Infrastructure.Data.DatabaseFunctionResolver>();
builder.Services.AddScoped<IELTSMaster.BusinessService.Infrastructure.Data.IBusinessUnitOfWork, IELTSMaster.BusinessService.Infrastructure.Data.BusinessUnitOfWork>();
builder.Services.AddScoped<IELTSMaster.BusinessService.Services.IDanTocService, IELTSMaster.BusinessService.Services.DanTocService>();
builder.Services.AddScoped<IELTSMaster.BusinessService.Services.IBusinessAuditLogService, IELTSMaster.BusinessService.Services.BusinessAuditLogService>();
builder.Services.AddScoped<PostDanTocRequestValidator>();
builder.Services.AddScoped<UpdateDanTocRequestValidator>();
builder.Services.AddScoped<DanTocGetByIdRequestValidator>();
builder.Services.AddScoped<DanTocDeleteListRequestValidator>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "IELTSMaster BusinessService",
        Version = "v1",
        Description = "Microservice xử lý nghiệp vụ đào tạo, lớp học, khóa học, đề thi IELTS (PostgreSQL - Schema: business)"
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "IELTSMaster BusinessService v1"));
}

app.UseCors();
app.UseAuthorization();
app.MapControllers();

// Phục vụ Frontend React SPA tĩnh
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

// Tự động kiểm tra và áp dụng Migration khi khởi động (Code-First Auto-Migration)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BusinessDbContext>();
    try
    {
        await db.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Lỗi xảy ra trong quá trình tự động cập nhật Migration CSDL cho BusinessService.");
    }
}

app.Run();
