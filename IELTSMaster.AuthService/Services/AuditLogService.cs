using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using IELTSMaster.AuthService.DTOs;
using IELTSMaster.AuthService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IELTSMaster.AuthService.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly AuthDbContext _context;
        private readonly ILogger<AuditLogService> _logger;

        public AuditLogService(AuthDbContext context, ILogger<AuditLogService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<AuditLogPagingResponse<AuditLogDto>> GetListAsync(AuditLogGetListRequest request)
        {
            var query = _context.AuditLogs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.TextSearch))
            {
                var search = request.TextSearch.Trim().ToLower();
                query = query.Where(x =>
                    x.UserName.ToLower().Contains(search) ||
                    x.Action.ToLower().Contains(search) ||
                    x.EntityName.ToLower().Contains(search) ||
                    (x.EntityId != null && x.EntityId.ToLower().Contains(search)) ||
                    (x.ErrorMessage != null && x.ErrorMessage.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(request.Action))
            {
                query = query.Where(x => x.Action == request.Action);
            }

            if (!string.IsNullOrWhiteSpace(request.EntityName))
            {
                query = query.Where(x => x.EntityName == request.EntityName);
            }

            if (request.IsSuccess.HasValue)
            {
                query = query.Where(x => x.IsSuccess == request.IsSuccess.Value);
            }

            if (request.FromDate.HasValue)
            {
                var fromUtc = DateTime.SpecifyKind(request.FromDate.Value.Date, DateTimeKind.Utc);
                query = query.Where(x => x.CreatedAt >= fromUtc);
            }

            if (request.ToDate.HasValue)
            {
                var toUtc = DateTime.SpecifyKind(request.ToDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                query = query.Where(x => x.CreatedAt <= toUtc);
            }

            var totalRow = await query.CountAsync();

            var items = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((request.PageIndex - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(x => new AuditLogDto
                {
                    Id = x.Id.ToString(),
                    UserId = x.UserId.HasValue ? x.UserId.Value.ToString() : null,
                    UserName = x.UserName,
                    Action = x.Action,
                    EntityName = x.EntityName,
                    EntityId = x.EntityId,
                    OldValues = x.OldValues,
                    NewValues = x.NewValues,
                    IpAddress = x.IpAddress,
                    ServiceName = x.ServiceName,
                    CreatedAt = x.CreatedAt,
                    IsSuccess = x.IsSuccess,
                    ErrorMessage = x.ErrorMessage
                })
                .ToListAsync();

            return new AuditLogPagingResponse<AuditLogDto>
            {
                Data = items,
                TotalRow = totalRow,
                PageIndex = request.PageIndex,
                PageSize = request.PageSize
            };
        }

        public async Task<AuditLogDto?> GetByIdAsync(Guid id)
        {
            var x = await _context.AuditLogs.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (x == null) return null;

            return new AuditLogDto
            {
                Id = x.Id.ToString(),
                UserId = x.UserId.HasValue ? x.UserId.Value.ToString() : null,
                UserName = x.UserName,
                Action = x.Action,
                EntityName = x.EntityName,
                EntityId = x.EntityId,
                OldValues = x.OldValues,
                NewValues = x.NewValues,
                IpAddress = x.IpAddress,
                ServiceName = x.ServiceName,
                CreatedAt = x.CreatedAt,
                IsSuccess = x.IsSuccess,
                ErrorMessage = x.ErrorMessage
            };
        }

        public async Task<List<string>> GetEntityNamesAsync()
        {
            return await _context.AuditLogs
                .AsNoTracking()
                .Select(x => x.EntityName)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();
        }

        public async Task<List<string>> GetActionsAsync()
        {
            return await _context.AuditLogs
                .AsNoTracking()
                .Select(x => x.Action)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();
        }
    }
}
