using AUN_QA.Shared.DTOs.Base;
using AUN_QA.FileService.DTOs.Base;

namespace AUN_QA.FileService.Services.CoreFeature.UploadFile
{
    public interface IUploadFileService
    {
        Task Insert(List<IFormFile> files, string FolderName);
        List<ModelAttachment> UploadData(object lienKetId, string servicePath, string folderName, string tempFolder);
        bool DeleteData(IEnumerable<string> filePaths);
        string UploadAvatar(string folderUploadId, string oldImage);
        Task<ModelFilePreview> PreviewFileAsync(
            string fileUrl,
            Guid? fileId = null,
            string? watermarkText = null,
            int watermarkOpacity = 25,
            int watermarkPosition = 0);
    }
}
