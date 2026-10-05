# GIẢI THÍCH LỖI 404 STATIC CHUNKS VÀ CÁCH KHỞI ĐỘNG LẠI ELEARNING-WEB

## 1. Thời gian thực hiện
- **Thời gian:** 2026-10-04

---

## 2. Mô tả vấn đề (Vấn đề hiện tại)
Khi người dùng truy cập `http://localhost:3100/`, màn hình console trình duyệt báo hàng loạt lỗi 404 Not Found:
```text
Failed to load resource: the server responded with a status of 404 (Not Found) webpack.js:1 
Failed to load resource: the server responded with a status of 404 (Not Found) main-app.js:1 
Failed to load resource: the server responded with a status of 404 (Not Found) app-pages-internals.js:1 
Failed to load resource: the server responded with a status of 404 (Not Found) layout.css:1 
...
```

- **Nguyên nhân cốt lõi:**
  1. Khi tiến hành xóa thư mục cache `.next` để sửa lỗi hydration trước đó, tiến trình máy chủ dev server của Next.js đang chạy ngầm trong Aspire không tự nhận biết để tái tạo lại toàn bộ các file tĩnh `.next/static/chunks/` trên đĩa cứng.
  2. Trình duyệt khi tải lại vẫn giữ HTML chứa các URL tệp chunk có kèm tham số timestamp phiên cũ (`?v=1791081878945`), dẫn đến máy chủ không tìm thấy các file chunk này trên ổ đĩa và trả về lỗi **404 Not Found**.

---

## 3. Các File/Module thực hiện và Lý do thay đổi

| STT | File/Thư mục thay đổi | Module | Lý do thay đổi |
|---|---|---|---|
| 1 | `IELTSMaster.ELearning/apps/lang-app` | ELearning Frontend | Kiểm tra TypeScript typecheck (`tsc --noEmit`), xác nhận mã nguồn không có bất kỳ lỗi cú pháp nào (Exit code 0). |
| 2 | `IELTSMaster.ELearning/apps/lang-app/.next` | ELearning Cache | Cần khởi động lại tiến trình server để Webpack Dev Server biên dịch và phục vụ lại cây static chunks mới. |

---

## 4. Phương án và Cách thức xử lý

1. **Kiểm tra tính toàn vẹn của mã nguồn:**
   - Lệnh `npm run typecheck` (`tsc --noEmit`) hoàn thành với 0 lỗi.
   - Bản vá `globalThis.__NEXT_ACTION_QUEUE__` đã ngăn chặn hoàn toàn lỗi `Missing ActionQueueContext`.

2. **Cách giải quyết dứt điểm lỗi 404 chunk:**
   - Dừng tiến trình cũ và cho phép Next.js khởi động lại hoàn toàn mới.
   - Khi Next.js khởi động lại:
     - Tạo mới cấu trúc `.next/static/chunks`.
     - Xuất mã HTML mới có hash trùng khớp với các file chunk trong bộ nhớ.
     - Phục vụ CSS (`layout.css`) và các tệp JS với mã trạng thái `200 OK`.

---

## 5. Hướng dẫn người dùng thao tác

1. **Trong Visual Studio:**
   - Bấm **Stop Debugging** (`Shift + F5`).
   - Bấm **Start Debugging** (`F5` hoặc `Ctrl + F5`).
   *(Hoặc trên **Aspire Dashboard**, bấm nút **Restart** (biểu tượng mũi tên xoay tròn) ở dòng `ELearning-Web`)*.
2. **Trên trình duyệt:**
   - Nhấn tổ hợp phím **`Ctrl + F5`** (hoặc `Ctrl + Shift + R`) để ép trình duyệt xóa sạch cache cũ và tải mã HTML mới từ máy chủ.
   - Trang web `http://localhost:3100/` sẽ tải toàn bộ CSS, JS và hiển thị trọn vẹn giao diện E-Learning.
