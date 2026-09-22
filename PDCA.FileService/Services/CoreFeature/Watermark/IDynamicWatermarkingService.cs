using AUN_QA.FileService.DTOs.Base;

namespace AUN_QA.FileService.Services.CoreFeature.Watermark
{
    public interface IDynamicWatermarkingService
    {
        Task<(byte[] Content, string ContentType, bool HasWatermark)> ApplyAsync(
            byte[] fileContent,
            string fileExtension,
            Guid? fileId,
            string absoluteFilePath,
            WatermarkConfig config,
            CancellationToken cancellationToken = default);
    }
}
