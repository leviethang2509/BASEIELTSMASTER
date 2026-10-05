using AUN_QA.Shared.DTOs.Base;
using FluentValidation;
using IELTSMaster.BusinessService.DTOs.DanhMuc;

namespace IELTSMaster.BusinessService.Validators.DanhMuc
{
    public class PostDanTocRequestValidator : AbstractValidator<PostDanTocRequest>
    {
        public PostDanTocRequestValidator()
        {
            RuleFor(x => x.TenGoi)
                .Cascade(CascadeMode.Stop)
                .NotEmpty().WithMessage("Tên dân tộc không được để trống.")
                .MaximumLength(255).WithMessage("Tên dân tộc không được vượt quá 255 ký tự.");

            RuleFor(x => x.GhiChu)
                .MaximumLength(1000).WithMessage("Ghi chú không được vượt quá 1000 ký tự.")
                .When(x => !string.IsNullOrWhiteSpace(x.GhiChu));

            RuleFor(x => x.MoTa)
                .MaximumLength(4000).WithMessage("Mô tả không được vượt quá 4000 ký tự.")
                .When(x => !string.IsNullOrWhiteSpace(x.MoTa));

            RuleFor(x => x.ThuTuUuTien)
                .GreaterThanOrEqualTo(0).WithMessage("Thứ tự ưu tiên phải lớn hơn hoặc bằng 0.")
                .When(x => x.ThuTuUuTien.HasValue);
        }
    }

    public class UpdateDanTocRequestValidator : PostDanTocRequestValidator
    {
        public UpdateDanTocRequestValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty().WithMessage("Id dân tộc không hợp lệ.");
        }
    }

    public class DanTocGetByIdRequestValidator : AbstractValidator<GetByIdRequest>
    {
        public DanTocGetByIdRequestValidator()
        {
            RuleFor(x => x.Id)
                .NotNull().WithMessage("Id không được để trống.")
                .NotEqual(Guid.Empty).WithMessage("Id không hợp lệ.");
        }
    }

    public class DanTocDeleteListRequestValidator : AbstractValidator<DeleteListRequest>
    {
        public DanTocDeleteListRequestValidator()
        {
            RuleFor(x => x.Ids)
                .NotEmpty().WithMessage("Danh sách Id không được để trống.");

            RuleForEach(x => x.Ids)
                .NotEqual(Guid.Empty).WithMessage("Danh sách Id chứa giá trị không hợp lệ.");
        }
    }
}
