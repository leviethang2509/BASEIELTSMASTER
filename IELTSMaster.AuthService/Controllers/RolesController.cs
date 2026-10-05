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
    [BusinessExceptionFilter]
    public class RolesController : ControllerBase
    {
        private readonly IRoleService _roleService;

        public RolesController(IRoleService roleService)
        {
            _roleService = roleService;
        }

        [HttpGet]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _roleService.GetRolesAsync();
            return Ok(new BaseResponse<List<SystemRoleInfoDto>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = roles
            });
        }

        [HttpGet("matrix")]
        public async Task<IActionResult> GetRolePermissionMatrix()
        {
            var result = await _roleService.GetRolePermissionMatrixAsync();
            return Ok(new BaseResponse<RolePermissionMatrixResponse>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = result
            });
        }

        [HttpGet("permissions")]
        public IActionResult GetPermissions()
        {
            var categories = _roleService.GetPermissions();
            return Ok(new BaseResponse<List<PermissionCategoryDto>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = categories
            });
        }

        [HttpGet("user-permissions")]
        public async Task<IActionResult> GetPermissionsByUser([FromQuery] Guid? id)
        {
            if (!id.HasValue)
            {
                return BadRequest(new BaseResponse<object?>
                {
                    Success = false,
                    StatusCode = StatusCodes.Status400BadRequest,
                    Message = "Tham số id không hợp lệ",
                    Data = null
                });
            }

            var permissions = await _roleService.GetPermissionsByUserAsync(id);
            return Ok(new BaseResponse<List<GetPermissionByUserDto>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = permissions
            });
        }

        [HttpGet("combobox")]
        public async Task<IActionResult> GetCombobox()
        {
            var data = await _roleService.GetComboboxAsync();
            return Ok(new BaseResponse<List<ModelCombobox>>
            {
                Success = true,
                StatusCode = StatusCodes.Status200OK,
                Data = data
            });
        }
    }
}
