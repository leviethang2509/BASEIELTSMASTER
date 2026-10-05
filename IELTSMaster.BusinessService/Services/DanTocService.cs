using AUN_QA.Shared.DTOs.Base;
using AutoMapper;
using IELTSMaster.BusinessService.DTOs.DanhMuc;
using IELTSMaster.BusinessService.Entities;
using IELTSMaster.BusinessService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace IELTSMaster.BusinessService.Services
{
    public class DanTocService : IDanTocService
    {
        private readonly IBusinessUnitOfWork _businessUnitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IDatabaseFunctionResolver _functionResolver;
        private readonly IMapper _mapper;

        public DanTocService(
            IBusinessUnitOfWork businessUnitOfWork,
            IHttpContextAccessor httpContextAccessor,
            IDatabaseFunctionResolver functionResolver,
            IMapper mapper)
        {
            _businessUnitOfWork = businessUnitOfWork;
            _httpContextAccessor = httpContextAccessor;
            _functionResolver = functionResolver;
            _mapper = mapper;
        }

        public async Task<BaseResponse<GetListPagingResponse<DanTocDto>>> GetListAsync(GetListPagingRequest request)
        {
            var response = new BaseResponse<GetListPagingResponse<DanTocDto>>();
            try
            {
                request ??= new GetListPagingRequest();
                var pageIndex = request.PageIndex >= 0 ? request.PageIndex : 0;
                var rowPerPage = request.RowPerPage > 0 ? request.RowPerPage : request.PageSize;
                rowPerPage = rowPerPage > 0 ? rowPerPage : 10;
                var textSearch = request.TextSearch?.Trim() ?? string.Empty;
                var functionName = GetFunctionName("GetList", "business.fn_dantoc_get_list");
                var parameters = new[]
                {
                    new NpgsqlParameter("i_text_search", textSearch),
                    new NpgsqlParameter("i_page_index", pageIndex),
                    new NpgsqlParameter("i_rows_per_page", rowPerPage)
                };

                var rows = await _businessUnitOfWork
                    .GetRepository<DanTocDto>()
                    .ExecuteFunction(functionName, parameters)
                    .AsNoTracking()
                    .ToListAsync();

                response.Data = new GetListPagingResponse<DanTocDto>
                {
                    PageIndex = pageIndex,
                    PageSize = rowPerPage,
                    TotalRow = rows.FirstOrDefault()?.TotalRow ?? 0,
                    Data = rows
                };
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.StatusCode = 500;
                response.Message = ex.Message;
            }

            return response;
        }

        public async Task<BaseResponse<DanTocDto>> GetByIdAsync(GetByIdRequest request)
        {
            var response = new BaseResponse<DanTocDto>();
            try
            {
                if (request == null)
                {
                    throw new ArgumentException("Dữ liệu yêu cầu không hợp lệ.");
                }

                if (!request.Id.HasValue || request.Id.Value == Guid.Empty)
                {
                    throw new ArgumentException("Id không hợp lệ.");
                }
                var entity = await _businessUnitOfWork
                    .GetRepository<EthnicGroup>()
                    .Query()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == request.Id.Value && !x.IsDeleted);

                if (entity == null)
                {
                    throw new InvalidOperationException("Không tìm thấy thông tin.");
                }
                response.Data = _mapper.Map<DanTocDto>(entity);
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.StatusCode = 500;
                response.Message = ex.Message;
            }
            return response;
        }

        public async Task<BaseResponse<PostDanTocRequest>> GetByPostAsync(GetByIdRequest request)
        {
            var response = new BaseResponse<PostDanTocRequest>();
            try
            {
                if (request == null)
                {
                    response.Data = CreateNewPostDanTocRequest();
                    return response;
                }

                if (!request.Id.HasValue || request.Id.Value == Guid.Empty)
                {
                    response.Data = CreateNewPostDanTocRequest();
                    return response;
                }
                var entity = await _businessUnitOfWork
                    .GetRepository<EthnicGroup>()
                    .Query()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == request.Id.Value && !x.IsDeleted);

                if (entity == null)
                {
                    response.Data = CreateNewPostDanTocRequest();
                    return response;
                }

                response.Data = _mapper.Map<PostDanTocRequest>(entity);
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.StatusCode = 500;
                response.Message = ex.Message;
            }

            return response;
        }

        public async Task<BaseResponse<DanTocDto>> InsertAsync(PostDanTocRequest request)
        {
            var response = new BaseResponse<DanTocDto>();
            try
            {
                if (request == null)
                {
                    throw new ArgumentException("Dữ liệu yêu cầu không hợp lệ.");
                }

                var tenGoi = request.TenGoi?.Trim();
                if (string.IsNullOrWhiteSpace(tenGoi))
                {
                    throw new ArgumentException("Tên dân tộc không được để trống.");
                }

                var checkDuplicate = await _businessUnitOfWork
                    .GetRepository<EthnicGroup>()
                    .Query()
                    .AsNoTracking()
                    .AnyAsync(x => !x.IsDeleted && x.TenGoi.ToLower() == tenGoi.ToLower());

                if (checkDuplicate)
                {
                    throw new InvalidOperationException("Dữ liệu bị trùng lặp, vui lòng nhập lại.");
                }

                request.Id = request.Id == Guid.Empty ? Guid.NewGuid() : request.Id;
                request.TenGoi = tenGoi;
                var entity = _mapper.Map<EthnicGroup>(request);
                entity.Id = request.Id;
                entity.CreatedBy = GetCurrentUsername();
                entity.CreatedAt = DateTime.UtcNow;
                entity.UpdatedBy = GetCurrentUsername();
                entity.UpdatedAt = DateTime.UtcNow;
                entity.IsDeleted = false;
                await _businessUnitOfWork.GetRepository<EthnicGroup>().AddAsync(entity);
                await _businessUnitOfWork.CommitAsync();
                response.Data = _mapper.Map<DanTocDto>(entity);
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.StatusCode = 500;
                response.Message = ex.Message;
            }

            return response;
        }

        public async Task<BaseResponse<DanTocDto>> UpdateAsync(PostDanTocRequest request)
        {
            var response = new BaseResponse<DanTocDto>();
            try
            {
                if (request == null)
                {
                    throw new ArgumentException("Dữ liệu yêu cầu không hợp lệ.");
                }

                if (request.Id == Guid.Empty)
                {
                    throw new ArgumentException("Id không hợp lệ.");
                }

                var tenGoi = request.TenGoi?.Trim();
                if (string.IsNullOrWhiteSpace(tenGoi))
                {
                    throw new ArgumentException("Tên dân tộc không được để trống.");
                }

                var repository = _businessUnitOfWork.GetRepository<EthnicGroup>();
                var entity = await repository
                    .Query()
                    .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted);

                if (entity == null)
                {
                    throw new InvalidOperationException("Không tìm thấy dữ liệu.");
                }

                var checkDuplicate = await repository
                    .Query()
                    .AsNoTracking()
                    .AnyAsync(x => !x.IsDeleted
                                   && x.Id != request.Id
                                   && x.TenGoi.ToLower() == tenGoi.ToLower());

                if (checkDuplicate)
                {
                    throw new InvalidOperationException("Dữ liệu cập nhật bị trùng lặp, vui lòng nhập lại.");
                }

                request.TenGoi = tenGoi;
                _mapper.Map(request, entity);
                entity.UpdatedBy = GetCurrentUsername();
                entity.UpdatedAt = DateTime.UtcNow;

                repository.Update(entity);
                await _businessUnitOfWork.CommitAsync();

                response.Data = _mapper.Map<DanTocDto>(entity);
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.StatusCode = 500;
                response.Message = ex.Message;
            }

            return response;
        }

        public async Task<BaseResponse<string>> DeleteAsync(GetByIdRequest request)
        {
            var response = new BaseResponse<string>();
            try
            {
                if (request == null)
                {
                    throw new ArgumentException("Dữ liệu yêu cầu không hợp lệ.");
                }

                if (!request.Id.HasValue || request.Id.Value == Guid.Empty)
                {
                    throw new ArgumentException("Id không hợp lệ.");
                }

                var repository = _businessUnitOfWork.GetRepository<EthnicGroup>();
                var entity = await repository
                    .Query()
                    .FirstOrDefaultAsync(x => x.Id == request.Id.Value && !x.IsDeleted);

                if (entity == null)
                {
                    throw new InvalidOperationException("Không tìm thấy dữ liệu.");
                }

                entity.IsDeleted = true;
                entity.UpdatedBy = GetCurrentUsername();
                entity.UpdatedAt = DateTime.UtcNow;

                repository.Update(entity);
                await _businessUnitOfWork.CommitAsync();

                response.Data = request.Id.Value.ToString();
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.StatusCode = 500;
                response.Message = ex.Message;
            }

            return response;
        }

        public async Task<BaseResponse<string>> DeleteListAsync(DeleteListRequest request)
        {
            var response = new BaseResponse<string>();
            try
            {
                if (request == null)
                {
                    throw new ArgumentException("Dữ liệu yêu cầu không hợp lệ.");
                }

                if (request.Ids == null || request.Ids.Count == 0)
                {
                    throw new ArgumentException("Danh sách dữ liệu không được để trống.");
                }

                var repository = _businessUnitOfWork.GetRepository<EthnicGroup>();
                var items = await repository
                    .Query()
                    .Where(x => request.Ids.Contains(x.Id) && !x.IsDeleted)
                    .ToListAsync();

                if (items.Count != request.Ids.Count)
                {
                    throw new InvalidOperationException("Không tìm thấy một hoặc nhiều dữ liệu cần xóa.");
                }

                var username = GetCurrentUsername();
                var now = DateTime.UtcNow;
                foreach (var item in items)
                {
                    item.IsDeleted = true;
                    item.UpdatedBy = username;
                    item.UpdatedAt = now;
                    repository.Update(item);
                }

                await _businessUnitOfWork.CommitAsync();
                response.Data = string.Join(",", request.Ids);
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.StatusCode = 500;
                response.Message = ex.Message;
            }

            return response;
        }

        public async Task<BaseResponse<List<ModelCombobox>>> GetAllForComboboxAsync()
        {
            var response = new BaseResponse<List<ModelCombobox>>();
            try
            {
                var functionName = GetFunctionName("GetAllCombobox", "business.fn_dantoc_get_all_combobox");
                var rows = await _businessUnitOfWork
                    .GetRepository<DanTocComboboxRow>()
                    .ExecuteFunction(functionName)
                    .AsNoTracking()
                    .ToListAsync();

                response.Data = rows.Cast<ModelCombobox>().ToList();
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.StatusCode = 500;
                response.Message = ex.Message;
            }

            return response;
        }

        private string GetCurrentUsername()
        {
            return _httpContextAccessor.HttpContext?.User.Identity?.Name
                ?? _httpContextAccessor.HttpContext?.User.FindFirst("preferred_username")?.Value
                ?? _httpContextAccessor.HttpContext?.User.FindFirst("email")?.Value
                ?? "system";
        }

        private string GetFunctionName(string key, string fallback)
        {
            return _functionResolver.GetFunctionName("DanToc", key, fallback);
        }

        private static PostDanTocRequest CreateNewPostDanTocRequest()
        {
            return new PostDanTocRequest
            {
                Id = Guid.NewGuid(),
                IsEdit = false,
                IsActived = true
            };
        }
    }
}
