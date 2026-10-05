using System;
using System.Linq;
using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace IELTSMaster.BusinessService.Infrastructure.Extensions
{
    /// <summary>
    /// Các Extension cấu hình dịch vụ học hỏi từ kiến trúc ConfigService của DAHOCTAP
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Tự động quét và đăng ký tất cả các Service nghiệp vụ trong Assembly
        /// Quy ước: Class kết thúc bằng 'Service' và Interface bắt đầu bằng 'I' + tên class.
        /// Giúp không cần sửa Program.cs bằng tay mỗi khi tạo thêm Service mới.
        /// </summary>
        public static IServiceCollection AddBusinessServices(this IServiceCollection services)
        {
            var assembly = Assembly.GetExecutingAssembly();

            var serviceTypes = assembly.GetTypes()
                .Where(t => t.IsClass && !t.IsAbstract && t.Name.EndsWith("Service"))
                .ToList();

            foreach (var implType in serviceTypes)
            {
                var matchingInterface = implType.GetInterfaces()
                    .FirstOrDefault(i => i.Name == $"I{implType.Name}");

                if (matchingInterface != null)
                {
                    services.AddScoped(matchingInterface, implType);
                }
            }

            return services;
        }
    }
}
