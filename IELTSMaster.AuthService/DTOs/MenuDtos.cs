using System.Text.Json.Serialization;

namespace IELTSMaster.AuthService.DTOs
{
    public class MenuDto
    {
        [JsonPropertyName("Id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("Controller")]
        public string Controller { get; set; } = string.Empty;

        [JsonPropertyName("Name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("SystemGroupId")]
        public string SystemGroupId { get; set; } = string.Empty;

        [JsonPropertyName("Sort")]
        public int Sort { get; set; }

        [JsonPropertyName("CanView")]
        public bool CanView { get; set; } = true;

        [JsonPropertyName("CanAdd")]
        public bool CanAdd { get; set; } = true;

        [JsonPropertyName("CanUpdate")]
        public bool CanUpdate { get; set; } = true;

        [JsonPropertyName("CanDelete")]
        public bool CanDelete { get; set; } = true;

        [JsonPropertyName("CanApprove")]
        public bool CanApprove { get; set; }

        [JsonPropertyName("CanAnalyze")]
        public bool CanAnalyze { get; set; }

        [JsonPropertyName("IsShowMenu")]
        public bool IsShowMenu { get; set; } = true;

        [JsonPropertyName("IsEdit")]
        public bool IsEdit { get; set; } = true;

        [JsonPropertyName("IsActived")]
        public bool IsActived { get; set; } = true;
    }

    public class MenuGetListPagingDto : MenuDto
    {
        [JsonPropertyName("SystemGroup")]
        public string SystemGroup { get; set; } = string.Empty;
    }

    public class SystemGroupDto
    {
        [JsonPropertyName("Id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("Name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("Sort")]
        public int Sort { get; set; }

        [JsonPropertyName("ParentId")]
        public string? ParentId { get; set; }

        [JsonPropertyName("IsEdit")]
        public bool IsEdit { get; set; } = true;

        [JsonPropertyName("IsActived")]
        public bool IsActived { get; set; } = true;
    }

    public class SystemGroupGetListPagingDto : SystemGroupDto
    {
        [JsonPropertyName("Parent")]
        public string Parent { get; set; } = string.Empty;
    }

    public class ModelComboboxDto
    {
        [JsonPropertyName("Value")]
        public string Value { get; set; } = string.Empty;

        [JsonPropertyName("Text")]
        public string Text { get; set; } = string.Empty;

        [JsonPropertyName("Group")]
        public string? Group { get; set; }
    }

    public class DeleteItemsRequest
    {
        public List<string> Ids { get; set; } = new List<string>();
    }
}
