using System;

namespace AUN_QA.FileService.Services.Storage
{
    public enum StorageScope
    {
        Public,
        Private
    }

    public enum MediaKind
    {
        Image,
        Audio,
        Video,
        Document,
        Other
    }

    public class StorageItemDto
    {
        public string Key { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long Size { get; set; }
        public MediaKind Kind { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }

    public class StorageStatusDto
    {
        public string ActiveProvider { get; set; } = string.Empty;
        public bool Configured { get; set; }
        public string? Reason { get; set; }
        public bool R2Available { get; set; }
        public bool LocalAvailable { get; set; } = true;
    }
}
