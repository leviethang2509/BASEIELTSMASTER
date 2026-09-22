using AUN_QA.SystemService.DTOs.CoreFeature.Auth.Dtos;
using AUN_QA.SystemService.DTOs.CoreFeature.RefreshToken.Dtos;
using AutoMapper;

namespace AUN_QA.SystemService.Services.CoreFeature.Auth
{
    public class AuthProfile : Profile
    {
        public AuthProfile()
        {
            CreateMap<Entities.User, LoginResponse>().ReverseMap();
            CreateMap<Entities.RefreshToken, ModelRefreshToken>().ReverseMap();
        }
    }
}
