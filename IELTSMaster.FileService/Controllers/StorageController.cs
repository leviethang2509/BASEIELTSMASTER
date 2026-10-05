using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using AUN_QA.FileService.Configs;
using AUN_QA.FileService.DTOs.Base;
using AUN_QA.FileService.Services.Storage;
using AUN_QA.Shared.DTOs.Base;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AUN_QA.FileService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StorageController : BaseController<StorageController>
    {
        private readonly IStorageService _storageService;
        private readonly IWebHostEnvironment _env;
        private readonly StorageSettings _settings;
        private readonly ILogger<StorageController> _logger;

        public StorageController(
            IStorageService storageService,
            IWebHostEnvironment env,
            IOptions<StorageSettings> options,
            ILogger<StorageController> logger)
        {
            _storageService = storageService;
            _env = env;
            _settings = options.Value;
            _logger = logger;
        }

        /// <summary>
        /// Lấy trạng thái cấu hình của hệ thống lưu trữ (Local / Cloudflare R2).
        /// </summary>
        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            var status = _storageService.GetStatus();
            return Ok(new BaseResponse<StorageStatusDto>(true, 200, status, "Thành công"));
        }

        /// <summary>
        /// Upload file lên hệ thống lưu trữ (hỗ trợ cả Local và Cloudflare R2, tự động nén WebP cho ảnh).
        /// </summary>
        [HttpPost("upload")]
        [RequestSizeLimit(52428800)] // 50MB
        [RequestFormLimits(MultipartBodyLengthLimit = 52428800)]
        public async Task<IActionResult> Upload(
            IFormFile file,
            [FromQuery] string scope = "public",
            [FromQuery] string prefix = "exam-media",
            CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new BaseResponse(false, 400, "Vui lòng chọn file tải lên."));
            }

            var storageScope = string.Equals(scope, "private", StringComparison.OrdinalIgnoreCase)
                ? StorageScope.Private
                : StorageScope.Public;

            using var stream = file.OpenReadStream();
            var result = await _storageService.UploadAsync(
                stream,
                file.FileName,
                file.ContentType,
                storageScope,
                prefix,
                cancellationToken);

            return Ok(new BaseResponse<StorageItemDto>(true, 200, result, "Tải lên thành công"));
        }

        /// <summary>
        /// Lấy URL truy cập file (tự sinh Presigned URL nếu là file private).
        /// </summary>
        [HttpGet("url")]
        public async Task<IActionResult> GetUrl(
            [FromQuery] string key,
            [FromQuery] string scope = "public",
            [FromQuery] int? expiresInSeconds = null)
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                return BadRequest(new BaseResponse(false, 400, "Key không hợp lệ"));
            }

            var storageScope = string.Equals(scope, "private", StringComparison.OrdinalIgnoreCase)
                ? StorageScope.Private
                : StorageScope.Public;

            var url = await _storageService.GetUrlAsync(key, storageScope, expiresInSeconds);
            return Ok(new BaseResponse<object>(true, 200, new { key, url, scope }, "Thành công"));
        }

        /// <summary>
        /// Xóa file khỏi hệ thống lưu trữ theo Key và Scope.
        /// </summary>
        [HttpDelete]
        public async Task<IActionResult> Delete(
            [FromQuery] string key,
            [FromQuery] string scope = "public",
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                return BadRequest(new BaseResponse(false, 400, "Key không hợp lệ"));
            }

            var storageScope = string.Equals(scope, "private", StringComparison.OrdinalIgnoreCase)
                ? StorageScope.Private
                : StorageScope.Public;

            var success = await _storageService.DeleteAsync(key, storageScope, cancellationToken);
            return Ok(new BaseResponse(success, success ? 200 : 404, success ? "Xóa thành công" : "File không tồn tại hoặc lỗi khi xóa"));
        }

        /// <summary>
        /// Liệt kê danh sách file trong một thư mục prefix.
        /// </summary>
        [HttpGet("list")]
        public async Task<IActionResult> List(
            [FromQuery] string scope = "public",
            [FromQuery] string prefix = "",
            CancellationToken cancellationToken = default)
        {
            var storageScope = string.Equals(scope, "private", StringComparison.OrdinalIgnoreCase)
                ? StorageScope.Private
                : StorageScope.Public;

            var list = await _storageService.ListAsync(storageScope, prefix, cancellationToken);
            return Ok(new BaseResponse<object>(true, 200, list, "Thành công"));
        }

        /// <summary>
        /// Endpoint phục vụ file private khi chạy ở chế độ Local (cho kiểm thử bài thi nói Speaking).
        /// </summary>
        [HttpGet("file")]
        public IActionResult GetLocalPrivateFile([FromQuery] string key, [FromQuery] string scope = "private")
        {
            if (string.IsNullOrWhiteSpace(key) || key.Contains(".."))
            {
                return BadRequest("Key không hợp lệ.");
            }

            var scopeFolder = string.Equals(scope, "public", StringComparison.OrdinalIgnoreCase) ? "public" : "private";
            var baseFolder = _settings.Local.BaseFolder ?? "Files";
            var fullPath = Path.Combine(_env.WebRootPath, baseFolder, scopeFolder, key);

            if (!System.IO.File.Exists(fullPath))
            {
                return NotFound("File không tồn tại.");
            }

            var ext = Path.GetExtension(fullPath);
            var mime = ext.ToLowerInvariant() switch
            {
                ".webm" => "audio/webm",
                ".mp3" => "audio/mpeg",
                ".wav" => "audio/wav",
                ".webp" => "image/webp",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".pdf" => "application/pdf",
                _ => "application/octet-stream"
            };

            return PhysicalFile(fullPath, mime, enableRangeProcessing: true);
        }
    }
}
