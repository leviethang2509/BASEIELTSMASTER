using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AUN_QA.Shared.DTOs.Base;
using IELTSMaster.AuthService.DTOs;
using IELTSMaster.AuthService.Filters;
using IELTSMaster.AuthService.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace IELTSMaster.AuthService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/SystemGroup")]
    [Route("api/System/SystemGroup")]
    [BusinessExceptionFilter]
    public class SystemGroupsController : ControllerBase
    {
        private readonly ISystemGroupService _systemGroupService;

        public SystemGroupsController(ISystemGroupService systemGroupService)
        {
            _systemGroupService = systemGroupService;
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll()
        {
            var list = await _systemGroupService.GetAllAsync();
            return Ok(new BaseResponse<List<SystemGroupDto>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = list
            });
        }

        [HttpGet("get-all-combobox")]
        public async Task<IActionResult> GetAllCombobox()
        {
            var list = await _systemGroupService.GetAllComboboxAsync();
            return Ok(new BaseResponse<List<ModelComboboxDto>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = list
            });
        }

        [HttpGet("get-all-not-parent-combobox")]
        public async Task<IActionResult> GetAllNotParentCombobox()
        {
            var list = await _systemGroupService.GetAllNotParentComboboxAsync();
            return Ok(new BaseResponse<List<ModelComboboxDto>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = list
            });
        }

        [HttpPost("get-list")]
        public async Task<IActionResult> GetList([FromBody] GetListPagingRequest request)
        {
            var result = await _systemGroupService.GetListAsync(request);
            return Ok(new BaseResponse<GetListPagingResponse<SystemGroupDto>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = result
            });
        }

        [HttpGet("{id}")]
        [HttpGet("get-by-id")]
        public async Task<IActionResult> GetById([FromRoute] string? id, [FromQuery] string? queryId)
        {
            var targetId = !string.IsNullOrWhiteSpace(id) ? id : queryId;
            if (!Guid.TryParse(targetId, out var groupId))
            {
                return BadRequest(new BaseResponse<SystemGroupDto> { Success = false, StatusCode = 400, Message = "ID nhóm hệ thống không hợp lệ" });
            }

            var item = await _systemGroupService.GetByIdAsync(groupId);
            if (item == null)
            {
                return NotFound(new BaseResponse<SystemGroupDto> { Success = false, StatusCode = 404, Message = "Không tìm thấy nhóm hệ thống" });
            }

            return Ok(new BaseResponse<SystemGroupDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = item
            });
        }

        [HttpPost]
        [HttpPost("insert")]
        public async Task<IActionResult> Insert([FromBody] SystemGroupDto dto)
        {
            var result = await _systemGroupService.InsertAsync(dto);
            return Ok(new BaseResponse<SystemGroupDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status201Created,
                Message = "Thêm nhóm hệ thống thành công",
                Data = result
            });
        }

        [HttpPut]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] SystemGroupDto dto)
        {
            var result = await _systemGroupService.UpdateAsync(dto);
            return Ok(new BaseResponse<SystemGroupDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật nhóm hệ thống thành công",
                Data = result
            });
        }

        [HttpDelete("delete-list")]
        public async Task<IActionResult> DeleteList([FromBody] DeleteItemsRequest request)
        {
            var items = await _systemGroupService.DeleteListAsync(request.Ids);
            return Ok(new BaseResponse<List<SystemGroupDto>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = $"Đã xóa {items.Count} nhóm hệ thống thành công",
                Data = items
            });
        }
    }
}
