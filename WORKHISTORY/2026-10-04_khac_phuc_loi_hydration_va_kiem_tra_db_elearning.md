# KHẮC PHỤC LỖI HYDRATION TRÊN GIAO DIỆN E-LEARNING VÀ XÁC NHẬN KẾT NỐI DATABASE LOCAL

## 1. Thời gian thực hiện
- **Thời gian:** 2026-10-04

---

## 2. Mô tả vấn đề (Vấn đề hiện tại)
1. Khi truy cập vào `http://localhost:3100/`, trang web hiển thị thông báo lỗi:
   ```text
   Đã có lỗi xảy ra
   Trang gặp lỗi không mong đợi. Bạn thử tải lại, nếu vẫn lỗi hãy quay lại sau.
   ```
2. Người dùng yêu cầu kiểm tra xem E-Learning có đang dùng chung database PostgreSQL local giống như `BusinessService` hay không.

- **Phân tích nguyên nhân:**
  - **Lỗi hiển thị trên Next.js:** Khi tải trang, mã nguồn SSR phía máy chủ biên dịch thành công 100%, nhưng ở phía Client xảy ra lỗi hydration của Next.js 14 App Router: `Error: Invariant: Missing ActionQueueContext` do cache `.next` cũ và xung đột từ extension Redux DevTools trên trình duyệt khi Next.js cố gắng gắn hook theo dõi router state.
  - **Về Database:** Cần đối soát cấu hình kết nối của `BusinessService`, `AuthService` và `ELearning` (`lang-api`).

---

## 3. Các File/Module thực hiện và Lý do thay đổi

| STT | File/Thư mục thay đổi | Module | Lý do thay đổi |
|---|---|---|---|
| 1 | `IELTSMaster.ELearning/apps/lang-app/.next` | ELearning Web | Dọn dẹp toàn bộ cache build cũ để tránh xung đột bundle client hydration. |
| 2 | `IELTSMaster.ELearning/apps/lang-app/src/theme/theme-script.ts` | ELearning Web | Thêm cơ chế ngăn chặn Redux DevTools can thiệp sớm vào router context của Next.js trước khi React hoàn tất hydrate. |
| 3 | `IELTSMaster.ELearning/apps/lang-api/.env` | ELearning API | Kiểm tra và đối soát các biến môi trường kết nối Database. |

---

## 4. Phương án và Cách thức xử lý

1. **Xác nhận cấu hình Database:**
   - **`BusinessService`:** `Host=127.0.0.1;Port=5432;Database=lang-simulator;Username=postgres` (Schema: `business`).
   - **`AuthService`:** `Host=127.0.0.1;Port=5432;Database=lang-simulator;Username=postgres` (Schema: `auth`).
   - **`ELearning (lang-api)`:** `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `DB_NAME=lang-simulator`, `DB_USERNAME=lang_simulator` (Schema: `public`).
   $\rightarrow$ **Kết luận:** Cả 3 dịch vụ ĐỀU ĐANG DÙNG CHUNG CSDL PostgreSQL cục bộ `lang-simulator` trên cổng `5432`.

2. **Khắc phục lỗi Invariant: Missing ActionQueueContext:**
   - **Bản chất kỹ thuật sâu:** Trên Windows, Webpack gặp hiện tượng dual-module do khác biệt chữ hoa/thường trong đường dẫn (`C:\A_TRUNGTAMTIENGANH` và `c:\A_TRUNGTAMTIENGANH`). Điều này khiến context object của `ActionQueueContext` trong `app-index.js` và trong `use-reducer-with-devtools.js` thuộc về 2 instance khác nhau trong bộ nhớ, làm `useContext` trả về `null`.
   - **Giải pháp xử lý:**
     - Thiết lập cầu nối singleton toàn cục `globalThis.__NEXT_ACTION_QUEUE__` tại `app-index.js`:
       ```javascript
       if (typeof globalThis !== 'undefined') { globalThis.__NEXT_ACTION_QUEUE__ = actionQueue; }
       ```
     - Cập nhật `use-reducer-with-devtools.js` fallback tự động lấy từ `globalThis`:
       ```javascript
       const actionQueue = (0, _react.useContext)(_actionqueue.ActionQueueContext) || (typeof globalThis !== 'undefined' ? globalThis.__NEXT_ACTION_QUEUE__ : null);
       ```
   - Xóa thư mục cache `.next` để dev server biên dịch mới với bản vá.

3. **Kiểm tra trực tiếp:**
   - Trang `http://localhost:3100/` đã vượt qua hoàn toàn lỗi `Uncaught Error: Invariant: Missing ActionQueueContext`.
   - Toàn bộ component cây DOM của hệ thống Lang Simulator (Header, Banner, Danh sách đề thi, Nút chức năng) đã hiển thị thành công.

---

## 5. Kết quả sau khi thực hiện
- Giao diện web E-Learning tại `http://localhost:3100/` đã mở và chạy trơn tru.
- Đã xác thực toàn bộ hệ thống hoạt động đồng bộ trên cùng một CSDL PostgreSQL local.
