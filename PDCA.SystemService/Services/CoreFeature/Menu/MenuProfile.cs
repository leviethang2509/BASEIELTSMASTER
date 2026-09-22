using AUN_QA.SystemService.DTOs.CoreFeature.Menu.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.Menu.Requests;
using AutoMapper;

namespace AUN_QA.SystemService.Services.CoreFeature.Menu
{
    public class MenuProfile : Profile
    {
        public MenuProfile()
        {
            CreateMap<Entities.Menu, ModelMenu>().ReverseMap();
            CreateMap<Entities.Menu, MenuRequest>().ReverseMap();
        }
    }
}
