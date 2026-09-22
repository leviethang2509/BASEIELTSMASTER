using AUN_QA.SystemService.DTOs.CoreFeature.SystemGroup.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.SystemGroup.Requests;
using AutoMapper;

namespace AUN_QA.SystemService.Services.CoreFeature.SystemGroup
{
    public class SystemGroupProfile : Profile
    {
        public SystemGroupProfile()
        {
            CreateMap<Entities.SystemGroup, ModelSystemGroup>().ReverseMap();
            CreateMap<Entities.SystemGroup, SystemGroupRequest>().ReverseMap();
        }
    }
}
