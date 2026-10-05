import api, { type ApiResponse } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/constants";
import type {
  UploadFileRequest,
  Attachment,
  PreviewFileResult,
} from "../types/uploadfile.types";

export const fileService = {
  uploadFile: async (
    request: UploadFileRequest,
  ): Promise<ApiResponse<Attachment[]>> => {
    const formData = new FormData();

    request.files.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("FolderName", request.folderUpload);

    return api.post<Attachment[]>(
      API_ENDPOINTS.File.UploadFile.POST,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 300000,
      },
    );
  },
  downloadFile: (url: string) => {
    return api.downloadFile(API_ENDPOINTS.File.UploadFile.GET + url);
  },
  previewFile: async (
    attachmentId: string,
    mode: "internal" | "external" = "internal",
  ): Promise<PreviewFileResult> => {
    void mode;
    const response = await api.downloadFile(
      API_ENDPOINTS.File.UploadFile.GET + attachmentId,
    );

    return {
      blob: response.data,
      contentType:
        response.headers["content-type"] ??
        response.data?.type ??
        "application/octet-stream",
      originalContentType:
        response.headers["x-original-content-type"] || undefined,
      convertedContentType:
        response.headers["x-converted-content-type"] || undefined,
    };
  },
};
