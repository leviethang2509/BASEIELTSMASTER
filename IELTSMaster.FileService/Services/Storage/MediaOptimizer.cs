using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace AUN_QA.FileService.Services.Storage
{
    public static class MediaOptimizer
    {
        private const int WebpQuality = 82;

        private static readonly Dictionary<string, string> MimeExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            { "image/jpeg", "jpg" },
            { "image/png", "png" },
            { "image/webp", "webp" },
            { "image/gif", "gif" },
            { "image/svg+xml", "svg" },
            { "audio/mpeg", "mp3" },
            { "audio/mp3", "mp3" },
            { "audio/webm", "webm" },
            { "audio/ogg", "ogg" },
            { "audio/wav", "wav" },
            { "audio/x-wav", "wav" },
            { "audio/x-m4a", "m4a" },
            { "video/mp4", "mp4" },
            { "video/webm", "webm" },
            { "application/pdf", "pdf" }
        };

        public static MediaKind DetectMediaKind(string contentType, string fileName)
        {
            var mime = (contentType ?? string.Empty).Split(';')[0].Trim().ToLowerInvariant();
            if (mime.StartsWith("image/")) return MediaKind.Image;
            if (mime.StartsWith("audio/")) return MediaKind.Audio;
            if (mime.StartsWith("video/")) return MediaKind.Video;
            if (mime.Contains("pdf") || mime.Contains("document") || mime.Contains("sheet") || mime.Contains("word"))
                return MediaKind.Document;

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            if (ext is ".jpg" or ".jpeg" or ".png" or ".webp" or ".gif" or ".bmp" or ".svg") return MediaKind.Image;
            if (ext is ".mp3" or ".wav" or ".m4a" or ".ogg" or ".webm" or ".aac") return MediaKind.Audio;
            if (ext is ".mp4" or ".mov" or ".avi" or ".mkv") return MediaKind.Video;
            if (ext is ".pdf" or ".doc" or ".docx" or ".xls" or ".xlsx") return MediaKind.Document;

            return MediaKind.Other;
        }

        public static string ResolveExtension(string contentType, string originalFileName)
        {
            var mime = (contentType ?? string.Empty).Split(';')[0].Trim().ToLowerInvariant();
            if (MimeExtensions.TryGetValue(mime, out var ext))
            {
                return ext;
            }

            var fileExt = Path.GetExtension(originalFileName);
            if (!string.IsNullOrWhiteSpace(fileExt))
            {
                return fileExt.TrimStart('.').ToLowerInvariant();
            }

            return "bin";
        }

        public static string GenerateObjectKey(string prefix, string extension)
        {
            var cleanPrefix = (prefix ?? string.Empty).Trim().Trim('/', '\\');
            if (!string.IsNullOrEmpty(cleanPrefix))
            {
                cleanPrefix += "/";
            }

            return $"{cleanPrefix}{Guid.NewGuid():N}.{extension}";
        }

        /// <summary>
        /// Tự động nén và chuyển đổi hình ảnh sang định dạng WebP (chất lượng 82%, xoay theo EXIF)
        /// tương tự như thư viện sharp của lang-simulator.
        /// </summary>
        public static async Task<(Stream Stream, string ContentType, string Extension)> OptimizeIfImageAsync(
            Stream inputStream,
            string contentType,
            string originalFileName,
            CancellationToken cancellationToken = default)
        {
            var kind = DetectMediaKind(contentType, originalFileName);
            var ext = ResolveExtension(contentType, originalFileName);

            // Bỏ qua nếu là SVG (vector) hoặc GIF (ảnh động) hoặc không phải ảnh
            if (kind != MediaKind.Image || ext is "svg" or "gif")
            {
                return (inputStream, contentType, ext);
            }

            try
            {
                var memoryStream = new MemoryStream();
                if (inputStream.CanSeek)
                {
                    inputStream.Position = 0;
                }

                using var image = await Image.LoadAsync(inputStream, cancellationToken);
                image.Mutate(x => x.AutoOrient());

                var encoder = new WebpEncoder
                {
                    Quality = WebpQuality
                };

                await image.SaveAsWebpAsync(memoryStream, encoder, cancellationToken);
                memoryStream.Position = 0;

                return (memoryStream, "image/webp", "webp");
            }
            catch
            {
                // Nếu lỗi đọc ảnh thì fallback giữ nguyên stream ban đầu
                if (inputStream.CanSeek)
                {
                    inputStream.Position = 0;
                }
                return (inputStream, contentType, ext);
            }
        }
    }
}
