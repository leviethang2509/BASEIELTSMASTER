using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using AUN_QA.FileService.Configs;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AUN_QA.FileService.Services.Storage
{
    public class R2StorageService : IStorageService
    {
        private readonly StorageSettings _settings;
        private readonly ILogger<R2StorageService> _logger;
        private readonly IAmazonS3? _s3Client;

        public string ProviderName => "R2";

        public R2StorageService(
            IOptions<StorageSettings> options,
            ILogger<R2StorageService> logger)
        {
            _settings = options.Value;
            _logger = logger;

            if (_settings.R2.IsValid())
            {
                var credentials = new BasicAWSCredentials(_settings.R2.AccessKeyId, _settings.R2.SecretAccessKey);
                var config = new AmazonS3Config
                {
                    ServiceURL = $"https://{_settings.R2.AccountId}.r2.cloudflarestorage.com",
                    AuthenticationRegion = "auto",
                    ForcePathStyle = true
                };

                _s3Client = new AmazonS3Client(credentials, config);
                _logger.LogInformation("Cloudflare R2 Storage client initialized successfully for account {AccountId}", _settings.R2.AccountId);
            }
            else
            {
                _logger.LogWarning("Cloudflare R2 Storage is not configured. Missing required R2 credentials in Storage:R2 settings.");
            }
        }

        private IAmazonS3 RequireClient()
        {
            if (_s3Client == null)
            {
                throw new InvalidOperationException("Cloudflare R2 chưa được cấu hình (thiếu R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY hoặc tên Bucket).");
            }
            return _s3Client;
        }

        private string GetBucket(StorageScope scope)
        {
            return scope == StorageScope.Public
                ? _settings.R2.PublicBucket
                : _settings.R2.PrivateBucket;
        }

        public StorageStatusDto GetStatus()
        {
            var isConfigured = _s3Client != null;
            return new StorageStatusDto
            {
                ActiveProvider = ProviderName,
                Configured = isConfigured,
                Reason = isConfigured ? null : "Chưa cấu hình biến môi trường hoặc credentials R2",
                R2Available = isConfigured,
                LocalAvailable = true
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
            var client = RequireClient();
            var bucket = GetBucket(scope);

            var (processedStream, finalContentType, ext) = await MediaOptimizer.OptimizeIfImageAsync(
                stream, contentType, fileName, cancellationToken);

            var key = MediaOptimizer.GenerateObjectKey(prefix, ext);

            var putRequest = new PutObjectRequest
            {
                BucketName = bucket,
                Key = key,
                InputStream = processedStream,
                ContentType = finalContentType,
                DisablePayloadSigning = true
            };

            await client.PutObjectAsync(putRequest, cancellationToken);

            var url = await GetUrlAsync(key, scope);
            var size = processedStream.CanSeek ? processedStream.Length : 0;

            _logger.LogInformation("Uploaded object to R2: Bucket={Bucket}, Key={Key}, Scope={Scope}", bucket, key, scope);

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
            if (scope == StorageScope.Public)
            {
                var baseUrl = _settings.R2.PublicBaseUrl?.TrimEnd('/');
                return Task.FromResult($"{baseUrl}/{key.TrimStart('/')}");
            }

            // Private scope: Generate presigned URL with expiration
            var client = RequireClient();
            var bucket = GetBucket(scope);
            var ttl = expiresInSeconds ?? _settings.R2.PresignedUrlTtlSeconds;

            var request = new GetPreSignedUrlRequest
            {
                BucketName = bucket,
                Key = key,
                Expires = DateTime.UtcNow.AddSeconds(ttl)
            };

            var presignedUrl = client.GetPreSignedURL(request);
            return Task.FromResult(presignedUrl);
        }

        public async Task<bool> DeleteAsync(string key, StorageScope scope, CancellationToken cancellationToken = default)
        {
            var client = RequireClient();
            var bucket = GetBucket(scope);

            try
            {
                var deleteRequest = new DeleteObjectRequest
                {
                    BucketName = bucket,
                    Key = key
                };

                await client.DeleteObjectAsync(deleteRequest, cancellationToken);
                _logger.LogInformation("Deleted object from R2: Bucket={Bucket}, Key={Key}", bucket, key);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete object from R2: Bucket={Bucket}, Key={Key}", bucket, key);
                return false;
            }
        }

        public async Task<List<StorageItemDto>> ListAsync(StorageScope scope, string prefix, CancellationToken cancellationToken = default)
        {
            var client = RequireClient();
            var bucket = GetBucket(scope);
            var result = new List<StorageItemDto>();

            var listRequest = new ListObjectsV2Request
            {
                BucketName = bucket,
                Prefix = prefix ?? string.Empty,
                MaxKeys = 1000
            };

            var response = await client.ListObjectsV2Async(listRequest, cancellationToken);
            foreach (var item in response.S3Objects)
            {
                var url = await GetUrlAsync(item.Key, scope);
                result.Add(new StorageItemDto
                {
                    Key = item.Key,
                    Url = url,
                    FileName = Path.GetFileName(item.Key),
                    Size = item.Size,
                    Kind = MediaOptimizer.DetectMediaKind(string.Empty, item.Key),
                    UploadedAt = item.LastModified.ToUniversalTime()
                });
            }

            return result.OrderByDescending(x => x.UploadedAt).ToList();
        }
    }
}
