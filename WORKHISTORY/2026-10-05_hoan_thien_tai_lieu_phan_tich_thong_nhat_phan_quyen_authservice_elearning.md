# Hoàn Thiện Tài Liệu Phân Tích Thống Nhất Phân Quyền AuthService Và ELearning

## 1. Nội dung công việc
* Tiếp tục hoàn thiện phần còn thiếu trong tài liệu kiến trúc và phân tích phân quyền: `Document/PHAN_TICH_THONG_NHAT_PHAN_QUYEN_AUTHSERVICE_ELEARNING.md`.
* Chuẩn hóa đặc tả Hợp đồng Phân quyền Độc lập Nguồn (Single Source of Truth - SSOT) giữa .NET Backend (`IELTSMaster.AuthService`, `IELTSMaster.Shared`) và TypeScript NestJS/Next.js (`IELTSMaster.ELearning`).
* Xây dựng công cụ sinh mã tự động (Code Generator) để ngăn chặn việc lệch cấu hình quyền (Permission Drift) giữa hai nền tảng.

## 2. Thời gian thực hiện
* Ngày: 05/10/2026

## 3. Danh sách File đã thay đổi / tạo mới
* `Document/PHAN_TICH_THONG_NHAT_PHAN_QUYEN_AUTHSERVICE_ELEARNING.md`: Bổ sung toàn bộ các phần kỹ thuật chi tiết còn thiếu.
* `IELTSMaster.Shared/Security/permissions-contract.json`: File JSON contract chuẩn hóa SSOT chứa toàn bộ định nghĩa Roles, Permissions, Role-Permission Matrix và Role Groups.
* `scripts/generate-permissions.mjs`: Script CLI đọc contract JSON và sinh mã tự động cho cả C# và TypeScript.
* `IELTSMaster.Shared/Security/GeneratedPermissionKey.g.cs`: File C# sinh tự động từ contract JSON.
* `IELTSMaster.ELearning/packages/shared/src/roles.generated.ts`: File TypeScript sinh tự động từ contract JSON.

## 4. Lý do thay đổi
* Tài liệu trước đó mới dừng lại ở việc tổng kết các bước ban đầu (Introspection, decorator, test pass) và nêu 4 đầu mục rủi ro còn lại một cách sơ sài ("Điểm Còn Lại Cần Xử Lý Tiếp") mà chưa có thiết kế kiến trúc chi tiết, ma trận đầy đủ cho tất cả các role, giải pháp adapter cho write path, chiến lược kiểm thử tự động, và lộ trình triển khai.
* Cần một tài liệu chi tiết, mang tính thực thi cao (production-ready specification) để định hướng cho các giai đoạn tiếp theo (Phase 2 -> Phase 4).

## 5. Cách xử lý
1. **Phân tích hiện trạng mã nguồn**:
   - Khảo sát các role và claim types trong `IELTSMaster.Shared/Security/AuthConstants.cs` và `PermissionPolicy.cs`.
   - Khảo sát các role, permission keys và route test trong `IELTSMaster.ELearning/packages/shared/src/roles.ts` và `apps/lang-api/src/access-control.e2e.spec.ts`.
2. **Khởi tạo Single Source of Truth (SSOT)**:
   - Tạo file `permissions-contract.json` tại `IELTSMaster.Shared/Security/` chuẩn hóa 13 Permission Keys, 3 System Roles, 5 Tenant Roles, và bảng phân bổ quyền.
3. **Xây dựng Pipeline Code Generator**:
   - Viết script `scripts/generate-permissions.mjs` đọc `permissions-contract.json` và sinh ra:
     - C# static class `GeneratedPermissionKey.g.cs` trong namespace `AUN_QA.Shared.Security`.
     - TypeScript object `GeneratedPermissionKey` và array `ALL_PERMISSIONS` trong `packages/shared/src/roles.generated.ts`.
4. **Mở rộng tài liệu `PHAN_TICH_THONG_NHAT_PHAN_QUYEN_AUTHSERVICE_ELEARNING.md`**:
   - **Mục 1 - Ma trận phân quyền hợp nhất**: Danh mục 13 permissions, bảng ma trận 8 roles, bảng ánh xạ route controllers của ELearning.
   - **Mục 2 - Đặc tả hợp đồng SSOT**: Sơ đồ Mermaid pipeline sinh mã, quy trình kiểm tra CI/CD chống sửa tay.
   - **Mục 3 - Thiết kế kiến trúc Adapter**: Sơ đồ Sequence write path, bảng ánh xạ các endpoint `admin/users` và `memberships` sang AuthService, chiến lược Read Model Projection.
   - **Mục 4 - Cơ chế kiểm thử tự động**: 3 tầng kiểm thử (Cross-language Unit Test, Route Access E2E Test, Security Edge Case Tests).
   - **Mục 5 - Phân định Route Authorization vs Domain Authorization**: Sơ đồ Mermaid phòng thủ 2 lớp, danh mục 4 business rules bắt buộc giữ ở domain service của ELearning.
   - **Mục 6 - Lộ trình triển khai 4 giai đoạn**: Sơ đồ Gantt và bảng chi tiết công việc từ Phase 1 đến Phase 4.
   - **Mục 7 - Chiến lược dự phòng & chịu lỗi**: Introspection caching (TTL 30-60s), Fast-path JWT offline validation, Event-driven cache eviction.
   - **Mục 8 - Danh mục kiểm tra sẵn sàng production**: 10 checklist tiêu chuẩn nghiệm thu.
   - **Kết luận vận hành & khuyến nghị chốt**: 5 nguyên tắc vận hành cốt lõi ("AuthService là trung tâm xác thực", "Hợp đồng phân quyền là SSOT", "Route Guard chặn bằng Permission", "Domain Rule nằm tại ELearning", "Ghi tập trung, Đọc cục bộ").

## 6. Kết quả sau khi thực hiện
* Biên dịch dự án `IELTSMaster.Shared` thành công 100% (0 Errors).
* Chạy script `node scripts/generate-permissions.mjs` thành công, sinh mã tự động cho cả 2 ngôn ngữ C# và TypeScript đồng bộ 100%.
* Tài liệu `PHAN_TICH_THONG_NHAT_PHAN_QUYEN_AUTHSERVICE_ELEARNING.md` được bổ sung hoàn chỉnh, trở thành bản thiết kế chi tiết (Architecture Blueprint) toàn diện.

## 7. Các lưu ý & Bước tiếp theo
* Trong Phase 3 sắp tới, cần tiến hành bổ sung các endpoint quản lý Tenant và Membership trên `IELTSMaster.AuthService/Controllers/` theo thiết kế adapter đã nêu trong tài liệu.
* Khi thêm role hoặc permission mới, tuyệt đối không chỉnh sửa thủ công file code sinh ra mà phải cập nhật vào `permissions-contract.json` và chạy script `node scripts/generate-permissions.mjs`.
