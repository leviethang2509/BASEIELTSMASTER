using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using AUN_QA.FileService.Configs;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AUN_QA.FileService.Services.Storage
{
    public class HybridStorageService : IStorageService
    {
        private readonly LocalStorageService _localStorage;
        private readonly R2StorageService _r2Storage;
        private readonly StorageSettings _settings;
        private readonly ILogger<HybridStorageService> _logger;

        public HybridStorageService(
            LocalStorageService localStorage,
            R2StorageService r2Storage,
            IOptions<StorageSettings> options,
            ILogger<HybridStorageService> logger)
        {
            _localStorage = localStorage;
            _r2Storage = r2Storage;
            _settings = options.Value;
            _logger = logger;
        }

        private IStorageService ResolveActiveProvider()
        {
            if (string.Equals(_settings.Provider, "R2", StringComparison.OrdinalIgnoreCase))
            {
                var r2Status = _r2Storage.GetStatus();
                if (r2Status.Configured)
                {
                    return _r2Storage;
                }

                _logger.LogWarning("Storage Provider được chọn là R2 nhưng chưa cấu hình đủ biến môi trường. Tự động fallback sang Local Storage.");
            }

            return _localStorage;
        }

        public string ProviderName => ResolveActiveProvider().ProviderName;

        public StorageStatusDto GetStatus()
        {
            var active = ResolveActiveProvider();
            var status = active.GetStatus();
            status.ActiveProvider = active.ProviderName;
            status.R2Available = _r2Storage.GetStatus().Configured;
            status.LocalAvailable = true;
            return status;
        }

        public Task<StorageItemDto> UploadAsync(
            Stream stream,
            string fileName,
            string contentType,
            StorageScope scope,
            string prefix,
            CancellationToken cancellationToken = default)
        {
            return ResolveActiveProvider().UploadAsync(stream, fileName, contentType, scope, prefix, cancellationToken);
        }

        public Task<string> GetUrlAsync(string key, StorageScope scope, int? expiresInSeconds = null)
        {
            return ResolveActiveProvider().GetUrlAsync(key, scope, expiresInSeconds);
        }

        public Task<bool> DeleteAsync(string key, StorageScope scope, CancellationToken cancellationToken = default)
        {
            return ResolveActiveProvider().DeleteAsync(key, scope, cancellationToken);
        }

        public Task<List<StorageItemDto>> ListAsync(StorageScope scope, string prefix, CancellationToken cancellationToken = default)
        {
            return ResolveActiveProvider().ListAsync(scope, prefix, cancellationToken);
        }
    }
}
