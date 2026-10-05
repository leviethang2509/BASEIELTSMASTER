using AUN_QA.Shared.DTOs.Base;
using FluentValidation.Results;
using IELTSMaster.BusinessService.DTOs.DanhMuc;
using IELTSMaster.BusinessService.Services;
using IELTSMaster.BusinessService.Validators.DanhMuc;
using Microsoft.AspNetCore.Mvc;

namespace IELTSMaster.BusinessService.Controllers
{
    [Route("api/dantoc")]
    public class DanTocController : BaseBusinessController
    {
        private readonly IDanTocService _service;
        private readonly PostDanTocRequestValidator _postValidator;
        private readonly UpdateDanTocRequestValidator _updateValidator;
        private readonly DanTocGetByIdRequestValidator _getByIdValidator;
        private readonly DanTocDeleteListRequestValidator _deleteListValidator;

        public DanTocController(
            IDanTocService service,
            PostDanTocRequestValidator postValidator,
            UpdateDanTocRequestValidator updateValidator,
            DanTocGetByIdRequestValidator getByIdValidator,
            DanTocDeleteListRequestValidator deleteListValidator)
        {
            _service = service;
            _postValidator = postValidator;
            _updateValidator = updateValidator;
            _getByIdValidator = getByIdValidator;
            _deleteListValidator = deleteListValidator;
        }

        [HttpPost("get-list")]
        public async Task<IActionResult> GetList([FromBody] GetListPagingRequest request)
        {
            try
            {
                var result = await _service.GetListAsync(request);
                return result.Success ? OkResponse(result.Data) : ErrorResponse(result.Message ?? "Lỗi lấy danh sách dân tộc.", result.StatusCode);
            }
            catch (Exception ex)
            {
                return ErrorResponse(ex.Message, 500);
            }
        }

        [HttpGet("get-list")]
        public Task<IActionResult> GetListByQuery([FromQuery] GetListPagingRequest request)
        {
            return GetList(request);
        }

        [HttpPost("get-by-id")]
        public async Task<IActionResult> GetById([FromBody] GetByIdRequest request)
        {
            try
            {
                var validation = await _getByIdValidator.ValidateAsync(request);
                if (!validation.IsValid)
                {
                    return ValidationErrorResponse(validation);
                }

                var result = await _service.GetByIdAsync(request);
                return result.Success ? OkResponse(result.Data) : ErrorResponse(result.Message ?? "Lỗi lấy thông tin dân tộc.", result.StatusCode);
            }
            catch (Exception ex)
            {
                return ErrorResponse(ex.Message, 500);
            }
        }

        [HttpPost("get-by-post")]
        public async Task<IActionResult> GetByPost([FromBody] GetByIdRequest request)
        {
            try
            {
                var result = await _service.GetByPostAsync(request);
                return result.Success ? OkResponse(result.Data) : ErrorResponse(result.Message ?? "Lỗi lấy dữ liệu biểu mẫu dân tộc.", result.StatusCode);
            }
            catch (Exception ex)
            {
                return ErrorResponse(ex.Message, 500);
            }
        }

        [HttpPost("insert")]
        public async Task<IActionResult> Insert([FromBody] PostDanTocRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return ErrorResponse("Dữ liệu yêu cầu không hợp lệ.");
                }

                var validation = await _postValidator.ValidateAsync(request);
                if (!validation.IsValid)
                {
                    return ValidationErrorResponse(validation);
                }

                var result = await _service.InsertAsync(request);
                return result.Success ? OkResponse(result.Data, "Thêm dân tộc thành công.") : ErrorResponse(result.Message ?? "Lỗi thêm dân tộc.", result.StatusCode);
            }
            catch (Exception ex)
            {
                return ErrorResponse(ex.Message, 500);
            }
        }

        [HttpPost("update")]
        public async Task<IActionResult> Update([FromBody] PostDanTocRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return ErrorResponse("Dữ liệu yêu cầu không hợp lệ.");
                }

                var validation = await _updateValidator.ValidateAsync(request);
                if (!validation.IsValid)
                {
                    return ValidationErrorResponse(validation);
                }

                var result = await _service.UpdateAsync(request);
                return result.Success ? OkResponse(result.Data, "Cập nhật dân tộc thành công.") : ErrorResponse(result.Message ?? "Lỗi cập nhật dân tộc.", result.StatusCode);
            }
            catch (Exception ex)
            {
                return ErrorResponse(ex.Message, 500);
            }
        }

        [HttpPost("delete")]
        public async Task<IActionResult> Delete([FromBody] GetByIdRequest request)
        {
            try
            {
                var validation = await _getByIdValidator.ValidateAsync(request);
                if (!validation.IsValid)
                {
                    return ValidationErrorResponse(validation);
                }

                var result = await _service.DeleteAsync(request);
                return result.Success ? OkResponse(result.Data, "Xóa dân tộc thành công.") : ErrorResponse(result.Message ?? "Lỗi xóa dân tộc.", result.StatusCode);
            }
            catch (Exception ex)
            {
                return ErrorResponse(ex.Message, 500);
            }
        }

        [HttpPost("delete-list")]
        public async Task<IActionResult> DeleteList([FromBody] DeleteListRequest request)
        {
            try
            {
                var validation = await _deleteListValidator.ValidateAsync(request);
                if (!validation.IsValid)
                {
                    return ValidationErrorResponse(validation);
                }

                var result = await _service.DeleteListAsync(request);
                return result.Success ? OkResponse(result.Data, "Xóa danh sách dân tộc thành công.") : ErrorResponse(result.Message ?? "Lỗi xóa danh sách dân tộc.", result.StatusCode);
            }
            catch (Exception ex)
            {
                return ErrorResponse(ex.Message, 500);
            }
        }

        [HttpPost("get-all-combobox")]
        public async Task<IActionResult> GetAllForCombobox()
        {
            try
            {
                var result = await _service.GetAllForComboboxAsync();
                return result.Success ? OkResponse(result.Data) : ErrorResponse(result.Message ?? "Lỗi lấy danh sách chọn dân tộc.", result.StatusCode);
            }
            catch (Exception ex)
            {
                return ErrorResponse(ex.Message, 500);
            }
        }

        private IActionResult ValidationErrorResponse(ValidationResult validation)
        {
            var message = string.Join(" ", validation.Errors.Select(x => x.ErrorMessage).Distinct());
            return ErrorResponse(message, 400);
        }
    }
}
