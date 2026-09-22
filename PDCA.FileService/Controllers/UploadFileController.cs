using AUN_QA.Shared.DTOs.Base;
using AUN_QA.FileService.DTOs.Base;
using AUN_QA.FileService.Services.CoreFeature.UploadFile;
using Microsoft.AspNetCore.Mvc;

namespace AUN_QA.FileService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UploadFileController : BaseController<UploadFileController>
    {
        IUploadFileService _service;

        public UploadFileController(IUploadFileService service)
        {
            _service = service;
        }

        [HttpPost]
        [RequestSizeLimit(52428800)] // 50MB limit
        [RequestFormLimits(MultipartBodyLengthLimit = 52428800)]
        public async Task<IActionResult> Post(List<IFormFile> files, [FromForm] string FolderName)
        {
            await _service.Insert(files, FolderName);
            return Ok(new BaseResponse(true, 200));
        }

    }
}
