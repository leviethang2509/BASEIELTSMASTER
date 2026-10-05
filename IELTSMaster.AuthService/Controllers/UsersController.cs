using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AUN_QA.Shared.DTOs.Base;
using AUN_QA.Shared.Exceptions;
using IELTSMaster.AuthService.DTOs;
using IELTSMaster.AuthService.Filters;
using IELTSMaster.AuthService.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace IELTSMaster.AuthService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/User")]
    [Route("api/System/User")]
    [BusinessExceptionFilter]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? search = null, 
            [FromQuery] string? textSearch = null,
            [FromQuery] string? systemRole = null, 
            [FromQuery] string? status = null,
            [FromQuery] int pageIndex = 1, 
            [FromQuery] int pageSize = 20)
        {
            var searchTerm = !string.IsNullOrWhiteSpace(textSearch) ? textSearch : search;
            var (users, total) = await _userService.GetUsersAsync(searchTerm, systemRole, status, pageIndex, pageSize);

            return Ok(new BaseResponse<object>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = new
                {
                    Data = users,
                    TotalRow = total,
                    PageIndex = pageIndex,
                    PageSize = pageSize
                }
            });
        }

        [HttpGet("get-list")]
        public async Task<IActionResult> GetUsersListGet(
            [FromQuery] string? search = null, 
            [FromQuery] string? textSearch = null,
            [FromQuery] string? systemRole = null, 
            [FromQuery] string? status = null,
            [FromQuery] int pageIndex = 1, 
            [FromQuery] int pageSize = 10)
        {
            var searchTerm = !string.IsNullOrWhiteSpace(textSearch) ? textSearch : search;
            var (users, total) = await _userService.GetUsersAsync(searchTerm, systemRole, status, pageIndex, pageSize);

            return Ok(new BaseResponse<object>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = new
                {
                    Data = users,
                    TotalRow = total,
                    PageIndex = pageIndex,
                    PageSize = pageSize
                }
            });
        }

        [HttpPost("get-list")]
        public async Task<IActionResult> GetUsersList([FromBody] GetUserListRequest request)
        {
            var searchTerm = !string.IsNullOrWhiteSpace(request.TextSearch) ? request.TextSearch : request.Search;
            var (users, total) = await _userService.GetUsersAsync(searchTerm, request.SystemRole, request.Status, request.PageIndex, request.PageSize);

            return Ok(new BaseResponse<object>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = new
                {
                    Data = users,
                    TotalRow = total,
                    PageIndex = request.PageIndex,
                    PageSize = request.PageSize
                }
            });
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetUserById(Guid id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
            {
                return NotFound(new BaseResponse<object?>
                {
                    Success = false,
                    StatusCode = StatusCodes.Status404NotFound,
                    Message = "Không tìm thấy người dùng",
                    Data = null
                });
            }

            return Ok(new BaseResponse<UserManagementDto>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = user
            });
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            try
            {
                var result = await _userService.CreateUserAsync(request);
                return Ok(new BaseResponse<UserManagementDto>
                {
                    Success = true,
                    StatusCode = StatusCodes.Status200OK,
                    Message = "Tạo tài khoản người dùng thành công",
                    Data = result
                });
            }
            catch (ConflictException ex)
            {
                return Conflict(new BaseResponse<object?>
                {
                    Success = false,
                    StatusCode = StatusCodes.Status409Conflict,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (BusinessException ex)
            {
                return BadRequest(new BaseResponse<object?>
                {
                    Success = false,
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = ex.Message,
                    Data = null
                });
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
        {
            try
            {
                var result = await _userService.UpdateUserAsync(id, request);
                return Ok(new BaseResponse<UserManagementDto>
                {
                    Success = true,
                    StatusCode = StatusCodes.Status200OK,
                    Message = "Cập nhật thông tin người dùng thành công",
                    Data = result
                });
            }
            catch (BusinessException ex) when (ex.StatusCode == StatusCodes.Status404NotFound)
            {
                return NotFound(new BaseResponse<object?>
                {
                    Success = false,
                    StatusCode = StatusCodes.Status404NotFound,
                    Message = ex.Message,
                    Data = null
                });
            }
        }

        [HttpDelete]
        [HttpDelete("delete-list")]
        public async Task<IActionResult> DeleteUsers([FromBody] DeleteUsersRequest request)
        {
            var count = await _userService.DeleteUsersAsync(request.Ids);
            return Ok(new BaseResponse<object>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = $"Đã xóa {count} người dùng thành công",
                Data = new { DeletedCount = count }
            });
        }

        [HttpPost("{id:guid}/lock")]
        public async Task<IActionResult> LockUser(Guid id)
        {
            await _userService.LockUserAsync(id);
            return Ok(new BaseResponse<object>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Đã khóa tài khoản thành công"
            });
        }

        [HttpPost("{id:guid}/unlock")]
        public async Task<IActionResult> UnlockUser(Guid id)
        {
            await _userService.UnlockUserAsync(id);
            return Ok(new BaseResponse<object>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Đã mở khóa tài khoản thành công"
            });
        }

        [HttpPost("{id:guid}/roles")]
        public async Task<IActionResult> AssignTenantRole(Guid id, [FromBody] AssignTenantRoleRequest request)
        {
            await _userService.AssignTenantRoleAsync(id, request);
            return Ok(new BaseResponse<object>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Gán vai trò thành công"
            });
        }

        [HttpDelete("{id:guid}/roles/{tenantId:guid}/{role}")]
        public async Task<IActionResult> RemoveTenantRole(Guid id, Guid tenantId, string role)
        {
            await _userService.RemoveTenantRoleAsync(id, tenantId, role);
            return Ok(new BaseResponse<object>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Xóa vai trò thành công"
            });
        }

        [HttpPatch("{id:guid}/system-role")]
        public async Task<IActionResult> UpdateSystemRole(Guid id, [FromBody] UpdateUserSystemRoleRequest request)
        {
            await _userService.UpdateSystemRoleAsync(id, request);
            return Ok(new BaseResponse<object>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Message = "Cập nhật vai trò hệ thống thành công"
            });
        }

        [HttpGet("combobox")]
        public async Task<IActionResult> GetCombobox()
        {
            var data = await _userService.GetComboboxAsync();
            return Ok(new BaseResponse<List<ModelCombobox>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = data
            });
        }
    }
}
