using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace AUN_QA.FileService.Services.Storage
{
    public interface IStorageService
    {
        string ProviderName { get; }
        StorageStatusDto GetStatus();

        Task<StorageItemDto> UploadAsync(
            Stream stream,
            string fileName,
            string contentType,
            StorageScope scope,
            string prefix,
            CancellationToken cancellationToken = default);

        Task<string> GetUrlAsync(
            string key,
            StorageScope scope,
            int? expiresInSeconds = null);

        Task<bool> DeleteAsync(
            string key,
            StorageScope scope,
            CancellationToken cancellationToken = default);

        Task<List<StorageItemDto>> ListAsync(
            StorageScope scope,
            string prefix,
            CancellationToken cancellationToken = default);
    }
}
