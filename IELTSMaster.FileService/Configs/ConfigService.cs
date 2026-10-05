using AUN_QA.FileService.Services.CoreFeature.Watermark;
using AutoDependencyRegistration;

namespace AUN_QA.FileService.Configs
{
    public static class ConfigService
    {
        public static void ExecuteConfigService(this WebApplicationBuilder builder)
        {
            //SYSTEM
            builder.WebHost.ConfigureKestrel(options =>
            {
                options.ConfigureEndpointDefaults(defaults =>
                {
                    defaults.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1AndHttp2;
                });
            });
            builder.Services.AddSingleton(builder.Configuration);
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            // Audit action filter
            builder.Services.AddScoped<AUN_QA.FileService.Infrastructure.Filters.AuditActionFilter>();

            //ALL SERVICE
            builder.Services.AutoRegisterDependencies();
            builder.Services.AddHostedService<PdfCacheCleanupJob>();

            // STORAGE CONFIGURATION (Local Disk & Cloudflare R2)
            builder.Services.Configure<StorageSettings>(builder.Configuration.GetSection(StorageSettings.SectionName));
            builder.Services.AddSingleton<AUN_QA.FileService.Services.Storage.LocalStorageService>();
            builder.Services.AddSingleton<AUN_QA.FileService.Services.Storage.R2StorageService>();
            builder.Services.AddScoped<AUN_QA.FileService.Services.Storage.IStorageService, AUN_QA.FileService.Services.Storage.HybridStorageService>();

            //CORS
            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(
                    policy =>
                    {
                        var origin = builder.Configuration.GetSection("Cors:Origins").Get<string[]>();
                        if (origin != null && origin.Length > 0)
                        {
                            policy.WithOrigins(origin)
                                  .WithExposedHeaders("Content-Disposition", "X-Original-Content-Type", "X-Converted-Content-Type")
                                  .AllowAnyHeader()
                                  .AllowAnyMethod();
                        }
                    });
            });

            const int grpcMaxMessageSize = 128 * 1024 * 1024; // 128 MB
            builder.Services.AddGrpc(options =>
            {
                options.MaxReceiveMessageSize = grpcMaxMessageSize;
                options.MaxSendMessageSize = grpcMaxMessageSize;
            });
        }
    }
}
