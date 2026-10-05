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
    [Route("api/Menu")]
    [Route("api/System/Menu")]
    [BusinessExceptionFilter]
    public class MenusController : ControllerBase
    {
        private readonly IMenuService _menuService;

        public MenusController(IMenuService menuService)
        {
            _menuService = menuService;
        }

        [HttpGet("get-list-by-user")]
        public async Task<IActionResult> GetListByUser([FromQuery] string? id)
        {
            var list = await _menuService.GetListByUserAsync(id);
            return Ok(new BaseResponse<List<MenuGetListPagingDto>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = list
            });
        }

        [HttpPost("get-list")]
        public async Task<IActionResult> GetList([FromBody] GetListPagingRequest request)
        {
            var result = await _menuService.GetListAsync(request);
            return Ok(new BaseResponse<GetListPagingResponse<MenuGetListPagingDto>>
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
            if (!Guid.TryParse(targetId, out var menuId))
            {
                return BadRequest(new BaseResponse<MenuDto> { Success = false, StatusCode = 400, Message = "ID menu không hợp lệ" });
            }

            var menu = await _menuService.GetByIdAsync(menuId);
            if (menu == null)
            {
                return NotFound(new BaseResponse<MenuDto> { Success = false, StatusCode = 404, Message = "Không tìm thấy menu" });
            }

            return Ok(new BaseResponse<MenuDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = menu
            });
        }

        [HttpPost]
        [HttpPost("insert")]
        public async Task<IActionResult> Insert([FromBody] MenuDto dto)
        {
            var result = await _menuService.InsertAsync(dto);
            return Ok(new BaseResponse<MenuDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status201Created,
                Message = "Thêm menu thành công",
                Data = result
            });
        }

        [HttpPut]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] MenuDto dto)
        {
            var result = await _menuService.UpdateAsync(dto);
            return Ok(new BaseResponse<MenuDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật menu thành công",
                Data = result
            });
        }

        [HttpDelete("delete-list")]
        public async Task<IActionResult> DeleteList([FromBody] DeleteItemsRequest request)
        {
            var items = await _menuService.DeleteListAsync(request.Ids);
            return Ok(new BaseResponse<List<MenuDto>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = $"Đã xóa {items.Count} menu thành công",
                Data = items
            });
        }
    }
}
