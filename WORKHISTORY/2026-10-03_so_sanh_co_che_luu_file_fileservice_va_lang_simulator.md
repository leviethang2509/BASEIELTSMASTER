# LỊCH SỬ CÔNG VIỆC: KHẢO SÁT & SO SÁNH CƠ CHẾ LƯU TRỮ FILE GIỮA IELTSMASTER.FILESERVICE VÀ LANG-SIMULATOR

## 1. Thông tin công việc
- **Nhiệm vụ:** Phân tích, so sánh chi tiết phương thức lưu trữ file giữa `IELTSMaster.FileService` (lưu trữ cục bộ - Local Storage) và `C:\A_TRUNGTAMTIENGANH\SOURCE_CODE\lang-simulator` (lưu trữ Cloudflare R2 / S3 Object Storage). Chỉ phân tích, không thực hiện thay đổi mã nguồn. Tuân thủ nghiêm ngặt quy tắc tại `rule.md`.
- **Thời gian thực hiện:** 23:48, Ngày 03/10/2026.
- **Người thực hiện:** AI Assistant.

---

## 2. Các file & module khảo sát
### A. IELTSMaster.FileService (Hệ thống C# / .NET 8)
1. `IELTSMaster.FileService/Services/CoreFeature/UploadFile/UploadFileService.cs`: Logic lưu file tạm vào `wwwroot/Files/Temp/`, đồng bộ sang thư mục chính `{servicePath}/{folderName}/{lienKetId}`.
2. `IELTSMaster.FileService/Services/CoreFeature/UploadFile/IUploadFileService.cs`: Interface upload, di chuyển và xóa file.
3. `IELTSMaster.FileService/Controllers/UploadFileController.cs`: Controller nhận file qua multipart form `IFormFile`, giới hạn kích thước 50MB.
4. `IELTSMaster.FileService/Program.cs`: Cấu hình static files (`app.UseStaticFiles()`) phục vụ trực tiếp từ ổ đĩa máy chủ.
5. `IELTSMaster.FileService/Services/CoreFeature/Watermark/DynamicWatermarkingService.cs`: Đóng dấu watermark bản quyền lên tài liệu/ảnh.

### B. lang-simulator (Hệ thống NestJS / TypeScript Monorepo)
1. `lang-simulator/apps/lang-api/src/storage/r2.service.ts`: Service giao tiếp với **Cloudflare R2** sử dụng AWS SDK v3 (`@aws-sdk/client-s3`), hỗ trợ 2 bucket (`public` và `private`) cùng presigned URL.
2. `lang-simulator/apps/lang-api/src/storage/media.service.ts`: Nghiệp vụ upload media cho đề thi (ảnh, audio, video), tự động nén ảnh WebP bằng thư viện `sharp`.
3. `lang-simulator/apps/lang-api/src/storage/media-file.ts`: Định nghĩa hạn mức dung lượng, mime-type whitelist và quy tắc đặt key theo tenant.
4. `lang-simulator/apps/lang-api/src/storage/storage.module.ts`: NestJS Module đóng gói và export dịch vụ lưu trữ.
5. `lang-simulator/docs/dev/module-notes.md` & `docs/requirements/req-1-progress.md`: Tài liệu đặc tả cơ chế Cloudflare R2 trong `lang-simulator`.

---

## 3. Kết quả phân tích & so sánh chi tiết

### 3.1. Bản chất cơ chế lưu trữ
* **`IELTSMaster.FileService`**:
  - Dạng **Local Block/Disk Storage**: File được ghi trực tiếp vào ổ đĩa cứng của máy chủ web (`wwwroot/Files/...`).
  - Đường dẫn vật lý phụ thuộc vào thư mục gốc của ứng dụng (`_webHostEnvironment.WebRootPath`).
* **`lang-simulator`**:
  - Dạng **Cloud Object Storage (Cloudflare R2)**: Tương thích hoàn toàn chuẩn AWS S3.
  - Máy chủ Backend **Stateless** (không lưu bất kỳ file nào trên ổ đĩa máy chủ). Mọi file được đẩy thẳng lên mạng đám mây toàn cầu của Cloudflare.

### 3.2. Bảo mật & Kiểm soát quyền truy cập (Access Control)
* **`IELTSMaster.FileService`**:
  - Toàn bộ file lưu trong `wwwroot` được phục vụ công khai thông qua middleware `app.UseStaticFiles()`.
  - Bảo vệ nội dung bằng cơ chế **Watermark động** (đóng dấu thông tin người dùng lên ảnh/tài liệu).
* **`lang-simulator`**:
  - Thiết kế phân cấp chặt chẽ với **2 Bucket độc lập**:
    1. **Bucket `public`**: Dùng cho tài nguyên đề thi (audio bài nghe IELTS Listening, hình ảnh minh họa bài đọc Reading, logo trung tâm). Truy cập công khai qua Public URL tích hợp CDN Cloudflare với chi phí băng thông (egress) miễn phí.
    2. **Bucket `private`**: Dành riêng cho dữ liệu nhạy cảm của thí sinh (bài ghi âm Speaking `.webm`). Tuyệt đối không có URL công khai; chỉ cấp quyền nghe qua **Presigned URL** (chữ ký số tạm thời có hiệu lực đúng 600 giây / 10 phút rồi tự hủy).

### 3.3. Tối ưu hóa xử lý đa phương tiện (Media Processing)
* **`IELTSMaster.FileService`**:
  - Giữ nguyên định dạng file gốc của người dùng (.png, .jpg, .mp3, .pdf, .docx, .xlsx...).
  - Đóng dấu Watermark bản quyền.
* **`lang-simulator`**:
  - Sử dụng thư viện `sharp` tự động chuyển đổi toàn bộ ảnh sang định dạng chuẩn **WebP** với chất lượng 82% và tự động xoay theo EXIF (`rotate()`), giúp giảm 70-80% dung lượng ảnh tải về.
  - File audio/video được giữ nguyên chất lượng gốc.

### 3.4. Định danh và Quản lý vòng đời (Key Partitioning)
* **`IELTSMaster.FileService`**:
  - Quy trình 2 bước: Upload vào thư mục tạm `Files/Temp/{tempFolder}`, sau đó khi bấm lưu form nghiệp vụ thì chuyển sang `{servicePath}/{folderName}/{lienKetId}`.
* **`lang-simulator`**:
  - Upload trực tiếp một lần lên Cloud R2, đặt key phân cấp theo mô hình Multi-tenant:
    + Đề thi: `tenants/{tenantId}/exam-media/{nanoid}.{ext}`
    + Bài thi nói của học viên: `tenants/{tenantId}/attempts/{attemptId}/recordings/{nanoid}.webm`
    + Logo trung tâm: `users/{userId}/branding/{nanoid}.webp`
  - Chống xóa nhầm/xóa chéo dữ liệu bằng cách kiểm tra tiền tố: `key.startsWith(examMediaPrefix(tenantId))`.

---

## 4. Bảng tổng hợp Ưu - Nhược điểm

| Tiêu chí | IELTSMaster.FileService (Local Disk) | lang-simulator (Cloudflare R2 / S3) |
| :--- | :--- | :--- |
| **Công nghệ** | C# .NET 8, `System.IO`, StaticFiles | Node.js NestJS, `@aws-sdk/client-s3`, Cloudflare R2 |
| **Hạ tầng lưu** | Ổ cứng máy chủ / Thư mục container `wwwroot` | Cloudflare Object Storage đám mây |
| **Phân quyền** | Dùng chung 1 không gian, phục vụ tĩnh | Tách bạch 2 bucket: Public (Đề thi) & Private (Ghi âm Presigned URL 10 phút) |
| **Tối ưu ảnh** | Giữ nguyên gốc + Watermark | Tự động nén WebP (giảm 80% dung lượng) |
| **Chi phí** | 0đ (tận dụng ổ cứng máy chủ) | Rất rẻ (Cloudflare R2 miễn phí băng thông egress, 10GB lưu trữ đầu miễn phí) |
| **Scale nhiều máy chủ** | Khó (cần ổ đĩa mạng chia sẻ NAS/NFS) | Cực kỳ dễ dàng (Backend hoàn toàn Stateless) |
| **Phụ thuộc mạng** | Chạy offline / mạng nội bộ hoàn toàn tốt | Cần kết nối Internet ra Cloudflare API |

---

## 5. Kết luận & Đề xuất kiến trúc
- Cả hai phương pháp đều có ưu thế riêng:
  - **Local Storage** (`IELTSMaster.FileService`) phù hợp giai đoạn phát triển cục bộ (Development) hoặc triển khai máy chủ On-Premise không có kết nối ra Internet.
  - **Cloud Object Storage** (`lang-simulator` với Cloudflare R2) là tiêu chuẩn vàng cho môi trường Production của các hệ thống thi trực tuyến như IELTS Master (vừa tải audio/ảnh đề thi cực nhanh qua CDN, vừa bảo mật bài thi nói Speaking của học viên qua Presigned URL).
