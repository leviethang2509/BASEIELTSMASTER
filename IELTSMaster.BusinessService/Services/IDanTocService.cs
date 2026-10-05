using AUN_QA.Shared.DTOs.Base;
using IELTSMaster.BusinessService.DTOs.DanhMuc;

namespace IELTSMaster.BusinessService.Services
{
    public interface IDanTocService
    {
        Task<BaseResponse<GetListPagingResponse<DanTocDto>>> GetListAsync(GetListPagingRequest request);
        Task<BaseResponse<DanTocDto>> GetByIdAsync(GetByIdRequest request);
        Task<BaseResponse<PostDanTocRequest>> GetByPostAsync(GetByIdRequest request);
        Task<BaseResponse<DanTocDto>> InsertAsync(PostDanTocRequest request);
        Task<BaseResponse<DanTocDto>> UpdateAsync(PostDanTocRequest request);
        Task<BaseResponse<string>> DeleteAsync(GetByIdRequest request);
        Task<BaseResponse<string>> DeleteListAsync(DeleteListRequest request);
        Task<BaseResponse<List<ModelCombobox>>> GetAllForComboboxAsync();
    }
}
