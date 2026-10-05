using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IELTSMaster.BusinessService.Services
{
    public interface IBusinessAuditLogService
    {
        Task<string?> ForwardGetListAsync(JsonElement request);
        Task<string?> ForwardGetByIdAsync(string id);
        Task<string?> ForwardGetEntityNamesAsync();
        Task<string?> ForwardGetActionsAsync();
    }

    public class BusinessAuditLogService : IBusinessAuditLogService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<BusinessAuditLogService> _logger;

        public BusinessAuditLogService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<BusinessAuditLogService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        private string GetAuthServiceUrl()
        {
            return _configuration["Services:AuthService:http:0"] 
                   ?? _configuration["AUTH_SERVICE_URL"] 
                   ?? "http://localhost:5175";
        }

        public async Task<string?> ForwardGetListAsync(JsonElement request)
        {
            try
            {
                var authBase = GetAuthServiceUrl();
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);

                var content = new StringContent(request.GetRawText(), Encoding.UTF8, "application/json");
                var response = await client.PostAsync($"{authBase}/api/System/AuditLog/get-list", content);

                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadAsStringAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Chuyển tiếp yêu cầu AuditLog get-list sang AuthService thất bại.");
            }
            return null;
        }

        public async Task<string?> ForwardGetByIdAsync(string id)
        {
            try
            {
                var authBase = GetAuthServiceUrl();
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);

                var response = await client.GetAsync($"{authBase}/api/System/AuditLog/get-by-id?id={id}");
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadAsStringAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Chuyển tiếp yêu cầu AuditLog get-by-id sang AuthService thất bại.");
            }
            return null;
        }

        public async Task<string?> ForwardGetEntityNamesAsync()
        {
            try
            {
                var authBase = GetAuthServiceUrl();
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);

                var response = await client.GetAsync($"{authBase}/api/System/AuditLog/get-entity-names");
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadAsStringAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Chuyển tiếp yêu cầu AuditLog get-entity-names sang AuthService thất bại.");
            }
            return null;
        }

        public async Task<string?> ForwardGetActionsAsync()
        {
            try
            {
                var authBase = GetAuthServiceUrl();
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);

                var response = await client.GetAsync($"{authBase}/api/System/AuditLog/get-actions");
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadAsStringAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Chuyển tiếp yêu cầu AuditLog get-actions sang AuthService thất bại.");
            }
            return null;
        }
    }
}
