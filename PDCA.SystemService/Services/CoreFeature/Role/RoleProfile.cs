using AUN_QA.SystemService.DTOs.CoreFeature.Permission.Requests;
using AUN_QA.SystemService.DTOs.CoreFeature.Role.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.Role.Requests;
using AutoMapper;

namespace AUN_QA.SystemService.Services.CoreFeature.Role
{
    public class RoleProfile : Profile
    {
        public RoleProfile()
        {
            CreateMap<Entities.Role, ModelRole>().ReverseMap();
            CreateMap<Entities.Role, ModelRoleGetListPaging>().ReverseMap();
            CreateMap<Entities.Role, RoleRequest>().ReverseMap();

            CreateMap<Entities.Permission, PermissionRequest>().ReverseMap();
        }
    }
}
