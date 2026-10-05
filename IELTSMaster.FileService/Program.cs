using AUN_QA.FileService.Configs;
using AUN_QA.FileService.Middlewares;
using AUN_QA.FileService.Services.Grpc;
using AUN_QA.ServiceDefaults;
using AUN_QA.Shared.Common;
using Grpc.AspNetCore.Web;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://+:{port}");
}

builder.AddServiceDefaults();
builder.Services.AddMemoryCache();

// Add services to the container.

builder.Services.AddControllers(options =>
{
    options.Filters.AddService<AUN_QA.FileService.Infrastructure.Filters.AuditActionFilter>();
}).AddJsonOptions(options => options.JsonSerializerOptions.PropertyNamingPolicy = null);
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.ExecuteConfigService();
builder.ExecuteConfigAuthentication();
builder.Services.AddTrustedForwardedHeaders(forwardLimit: 2);

var app = builder.Build();

app.UseMiddleware<GlobalExceptionHandler>();
app.UseTrustedForwardedHeaders();

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.UseGrpcWeb(new GrpcWebOptions { DefaultEnabled = true });
app.MapGrpcService<FileGrpcService>();

app.Run();
