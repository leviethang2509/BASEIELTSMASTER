using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AUN_QA.FileService.Configs;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AUN_QA.FileService.Services.Storage
{
    public class LocalStorageService : IStorageService
    {
        private readonly IWebHostEnvironment _env;
        private readonly StorageSettings _settings;
        private readonly ILogger<LocalStorageService> _logger;

        public string ProviderName => "Local";

        public LocalStorageService(
            IWebHostEnvironment env,
            IOptions<StorageSettings> options,
            ILogger<LocalStorageService> logger)
        {
            _env = env;
            _settings = options.Value;
            _logger = logger;
        }

        public StorageStatusDto GetStatus()
        {
            return new StorageStatusDto
            {
                ActiveProvider = ProviderName,
                Configured = true,
                LocalAvailable = true,
                R2Available = _settings.R2.IsValid()
            };
        }

        public async Task<StorageItemDto> UploadAsync(
            Stream stream,
            string fileName,
            string contentType,
            StorageScope scope,
            string prefix,
            CancellationToken cancellationToken = default)
        {
            var (processedStream, finalContentType, ext) = await MediaOptimizer.OptimizeIfImageAsync(
                stream, contentType, fileName, cancellationToken);

            var key = MediaOptimizer.GenerateObjectKey(prefix, ext);
            var scopeFolder = scope == StorageScope.Public ? "public" : "private";
            var baseFolder = _settings.Local.BaseFolder ?? "Files";
            
            var fullDirectory = Path.Combine(_env.WebRootPath, baseFolder, scopeFolder, Path.GetDirectoryName(key) ?? string.Empty);
            if (!Directory.Exists(fullDirectory))
            {
                Directory.CreateDirectory(fullDirectory);
            }

            var fullPath = Path.Combine(_env.WebRootPath, baseFolder, scopeFolder, key);
            using (var fileStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                await processedStream.CopyToAsync(fileStream, cancellationToken);
            }

            var size = new FileInfo(fullPath).Length;
            var url = await GetUrlAsync(key, scope);

            _logger.LogInformation("Saved local file: {Key} (Scope: {Scope}, Size: {Size} bytes)", key, scope, size);

            return new StorageItemDto
            {
                Key = key,
                Url = url,
                FileName = Path.GetFileName(key),
                ContentType = finalContentType,
                Size = size,
                Kind = MediaOptimizer.DetectMediaKind(finalContentType, key),
                UploadedAt = DateTime.UtcNow
            };
        }

        public Task<string> GetUrlAsync(string key, StorageScope scope, int? expiresInSeconds = null)
        {
            var scopeFolder = scope == StorageScope.Public ? "public" : "private";
            var baseFolder = _settings.Local.BaseFolder ?? "Files";

            if (scope == StorageScope.Public)
            {
                var baseUrl = _settings.Local.PublicBaseUrl?.TrimEnd('/');
                var relativePath = $"/{baseFolder}/{scopeFolder}/{key.TrimStart('/')}";
                return Task.FromResult(string.IsNullOrEmpty(baseUrl) ? relativePath : $"{baseUrl}{relativePath}");
            }

            // Private file: access through authorized storage API endpoint
            var privateUrl = $"/api/storage/file?key={Uri.EscapeDataString(key)}&scope=private";
            return Task.FromResult(privateUrl);
        }

        public Task<bool> DeleteAsync(string key, StorageScope scope, CancellationToken cancellationToken = default)
        {
            try
            {
                var scopeFolder = scope == StorageScope.Public ? "public" : "private";
                var baseFolder = _settings.Local.BaseFolder ?? "Files";
                var fullPath = Path.Combine(_env.WebRootPath, baseFolder, scopeFolder, key);

                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                    _logger.LogInformation("Deleted local file: {FullPath}", fullPath);
                    return Task.FromResult(true);
                }

                return Task.FromResult(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting local file: {Key}", key);
                return Task.FromResult(false);
            }
        }

        public Task<List<StorageItemDto>> ListAsync(StorageScope scope, string prefix, CancellationToken cancellationToken = default)
        {
            var result = new List<StorageItemDto>();
            var scopeFolder = scope == StorageScope.Public ? "public" : "private";
            var baseFolder = _settings.Local.BaseFolder ?? "Files";
            var targetDir = Path.Combine(_env.WebRootPath, baseFolder, scopeFolder, (prefix ?? string.Empty).Trim('/', '\\'));

            if (!Directory.Exists(targetDir))
            {
                return Task.FromResult(result);
            }

            var rootScopePath = Path.Combine(_env.WebRootPath, baseFolder, scopeFolder);
            var files = Directory.GetFiles(targetDir, "*.*", SearchOption.AllDirectories);

            foreach (var filePath in files)
            {
                var fileInfo = new FileInfo(filePath);
                var relativeKey = Path.GetRelativePath(rootScopePath, filePath).Replace('\\', '/');
                var url = GetUrlAsync(relativeKey, scope).GetAwaiter().GetResult();

                result.Add(new StorageItemDto
                {
                    Key = relativeKey,
                    Url = url,
                    FileName = fileInfo.Name,
                    Size = fileInfo.Length,
                    Kind = MediaOptimizer.DetectMediaKind(string.Empty, fileInfo.Name),
                    UploadedAt = fileInfo.CreationTimeUtc
                });
            }

            return Task.FromResult(result.OrderByDescending(x => x.UploadedAt).ToList());
        }
    }
}
