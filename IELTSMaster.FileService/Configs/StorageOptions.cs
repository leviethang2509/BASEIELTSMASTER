namespace AUN_QA.FileService.Configs
{
    public class StorageSettings
    {
        public const string SectionName = "Storage";

        /// <summary>
        /// Storage Provider: "Local" hoặc "R2"
        /// </summary>
        public string Provider { get; set; } = "Local";

        public LocalStorageSettings Local { get; set; } = new();

        public R2StorageSettings R2 { get; set; } = new();
    }

    public class LocalStorageSettings
    {
        public string BaseFolder { get; set; } = "Files";
        public string? PublicBaseUrl { get; set; }
    }

    public class R2StorageSettings
    {
        public string AccountId { get; set; } = string.Empty;
        public string AccessKeyId { get; set; } = string.Empty;
        public string SecretAccessKey { get; set; } = string.Empty;
        public string PublicBucket { get; set; } = string.Empty;
        public string PublicBaseUrl { get; set; } = string.Empty;
        public string PrivateBucket { get; set; } = string.Empty;
        public int PresignedUrlTtlSeconds { get; set; } = 600;

        public bool IsValid()
        {
            return !string.IsNullOrWhiteSpace(AccountId) &&
                   !string.IsNullOrWhiteSpace(AccessKeyId) &&
                   !string.IsNullOrWhiteSpace(SecretAccessKey) &&
                   !string.IsNullOrWhiteSpace(PublicBucket) &&
                   !string.IsNullOrWhiteSpace(PrivateBucket);
        }
    }
}
