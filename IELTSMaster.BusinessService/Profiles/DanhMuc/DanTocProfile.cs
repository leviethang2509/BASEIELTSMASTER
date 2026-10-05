using AutoMapper;
using IELTSMaster.BusinessService.DTOs.DanhMuc;
using IELTSMaster.BusinessService.Entities;

namespace IELTSMaster.BusinessService.Profiles.DanhMuc
{
    public class DanTocProfile : Profile
    {
        public DanTocProfile()
        {
            CreateMap<EthnicGroup, DanTocDto>()
                .ForMember(dest => dest.Sort, opt => opt.MapFrom(src => src.ThuTuUuTien))
                .ForMember(dest => dest.IsEdit, opt => opt.MapFrom(_ => true))
                .ForMember(dest => dest.TotalRow, opt => opt.Ignore());

            CreateMap<PostDanTocRequest, EthnicGroup>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedBy, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedBy, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.Ignore());

            CreateMap<DanTocDto, PostDanTocRequest>()
                .ForMember(dest => dest.IsEdit, opt => opt.MapFrom(_ => true));

            CreateMap<PostDanTocRequest, DanTocDto>();
        }
    }
}
