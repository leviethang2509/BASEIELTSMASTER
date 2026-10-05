# KHẮC PHỤC LỖI EPERM SCANDIR STANDALONE ESBUILD TRÊN E-LEARNING WEB (LANG-APP)

## 1. MÔ TẢ CÔNG VIỆC CẦN THỰC HIỆN (BƯỚC 1 THEO RULE.MD)
- **Vấn đề phát sinh:**
  Khi Next.js (`lang-app`) khởi động dev server hoặc dọn dẹp thư mục `.next`, hệ thống gặp lỗi:
  ```text
  errno: -4048,
  code: 'EPERM',
  syscall: 'scandir',
  path: 'C:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ELearning\apps\lang-app\.next\standalone\node_modules\.pnpm\node_modules\esbuild'
  ```
- **Nguyên nhân cốt lõi:**
  1. File `next.config.mjs` đang cấu hình cứng `output: 'standalone'`.
  2. Khi chạy trên môi trường Windows kết hợp với trình quản lý gói `pnpm` (dùng symlink / NTFS junction), Next.js copy cấu trúc `node_modules` vào `.next/standalone`.
  3. Cây thư mục symlink quá sâu (vượt MAX_PATH 260 ký tự) hoặc các file binary của `esbuild` bị tiến trình khác giữ lock khiến hàm `recursiveDelete` của Next.js không có quyền quét/xóa (`EPERM`), làm tiến trình build/dev bị crash hoàn toàn.

---

## 2. XÁC ĐỊNH FILE / MODULE CẦN THỰC HIỆN (BƯỚC 2 THEO RULE.MD)

| STT | File / Thư mục | Module | Lý do thực hiện |
|:---:|---|---|---|
| 1 | `IELTSMaster.ELearning/apps/lang-app/next.config.mjs` | E-Learning Web | Chuyển `output: 'standalone'` thành có điều kiện (chỉ kích hoạt khi build Docker container hoặc có biến `BUILD_STANDALONE=true`), môi trường dev Windows local không tạo standalone. |
| 2 | `IELTSMaster.ELearning/apps/lang-app/.next` | E-Learning Web | Dọn dẹp sạch sẽ cây thư mục `.next` cũ bị lỗi symlink/permission bằng lệnh cấp hệ điều hành. |

---

## 3. MÔ TẢ CÁCH THỰC HIỆN (BƯỚC 3 THEO RULE.MD)

1. Dừng các tiến trình `node.exe` cũ đang giữ file lock trong thư mục `apps/lang-app/.next`.
2. Dùng lệnh `cmd /c "rmdir /s /q IELTSMaster.ELearning\apps\lang-app\.next"` để cưỡng chế xóa sạch toàn bộ thư mục `.next` cũ (bao gồm cả các đường dẫn MAX_PATH và junction).
3. Chỉnh sửa [next.config.mjs](file:///C:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.ELearning/apps/lang-app/next.config.mjs):
   ```javascript
   const isStandalone = process.env.BUILD_STANDALONE === 'true' || process.env.DOCKER_BUILD === 'true';

   /** @type {import('next').NextConfig} */
   const nextConfig = {
     reactStrictMode: true,
     // Chỉ build bản tự chứa (standalone) khi đóng gói Docker production.
     // Môi trường dev / Windows local không bật standalone để tránh lỗi EPERM / symlink pnpm MAX_PATH.
     ...(isStandalone
       ? {
           output: 'standalone',
           experimental: {
             outputFileTracingRoot: join(appDir, '../..'),
           },
         }
       : {}),
     transpilePackages: ['@lang/shared', '@lang/exam-core'],
     ...
   ```
4. Kiểm tra lại toàn diện bằng lệnh `pnpm --filter lang-app build`.

---

## 4. KẾT QUẢ THỰC HIỆN (BƯỚC 4 THEO RULE.MD)

- Lệnh `cmd /c "rmdir /s /q ..."` đã xóa sạch 100% thư mục `.next` bị kẹt.
- Lệnh `pnpm --filter lang-app build` đã biên dịch thành công xuất sắc:
  - `Compiled successfully`
  - `Generating static pages (17/17)`
  - Hoàn tất toàn bộ các route (admin, t/[slug], dashboard, auth, exam...) với mã thoát `Exit Code 0`.
- Không còn tạo thư mục `standalone` khi chạy dev/build nội bộ, loại bỏ triệt để 100% nguy cơ lỗi `EPERM: scandir` trên Windows.

---

## 5. LƯU Ý VẬN HÀNH (BƯỚC 5 THEO RULE.MD)
- Khi build Docker production trên máy chủ Linux / CI-CD, chỉ cần truyền biến môi trường `BUILD_STANDALONE=true` (hoặc `DOCKER_BUILD=true`) trong Dockerfile thì Next.js vẫn tự động kích hoạt chế độ `standalone` tối ưu kích thước image đúng theo kiến trúc chuẩn.
