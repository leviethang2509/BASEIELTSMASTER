namespace IELTSMaster.AuthService.DTOs
{
    public class AuditLogDto
    {
        public string Id { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string EntityName { get; set; } = string.Empty;
        public string? EntityId { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string IpAddress { get; set; } = string.Empty;
        public string ServiceName { get; set; } = string.Empty;
        public bool IsSuccess { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AuditLogGetListRequest
    {
        public string? TextSearch { get; set; }
        public string? Action { get; set; }
        public string? EntityName { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public bool? IsSuccess { get; set; }
        public int PageIndex { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class AuditLogPagingResponse<T>
    {
        public List<T> Data { get; set; } = new();
        public int TotalRow { get; set; }
        public int PageIndex { get; set; }
        public int PageSize { get; set; }
    }
}
