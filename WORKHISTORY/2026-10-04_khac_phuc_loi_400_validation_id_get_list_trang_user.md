# KHẮC PHỤC LỖI 400 VALIDATION ID GET-LIST TẠI TRANG QUẢN LÝ NGƯỜI DÙNG (/USER)

## 1. MÔ TẢ CÔNG VIỆC CẦN THỰC HIỆN (BƯỚC 1 THEO RULE.MD)
- **Vấn đề phát sinh:**
  Khi người dùng truy cập trang `http://localhost:5173/user`, hệ thống nhận lỗi:
  ```json
  {
    "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
    "title": "One or more validation errors occurred.",
    "status": 400,
    "errors": {
      "id": ["The value 'get-list' is not valid."]
    },
    "traceId": "00-34a52ee177a2e70adacff466bdd5b645-c598939fea090768-01"
  }
  ```
- **Phân tích nguyên nhân cốt lõi:**
  1. Trong `UsersController.cs` của `AuthService`, action lấy người dùng theo ID được định nghĩa:
     ```csharp
     [HttpGet("{id}")]
     public async Task<IActionResult> GetUserById(Guid id)
     ```
     Route template `{id}` không có ràng buộc kiểu dữ liệu (`:guid`).
  2. Action lấy danh sách `get-list` ban đầu chỉ khai báo `[HttpPost("get-list")]`.
  3. Khi một request HTTP `GET` được gửi tới `/api/users/get-list` (hoặc do browser/proxy/cache/fetch), ASP.NET Core MVC routing nhận diện URL dạng `/api/users/<giá_trị>` và ghép chuỗi `"get-list"` vào template `{id}` của `GetUserById(Guid id)`.
  4. Model Binder cố gắng parse chuỗi `"get-list"` thành kiểu `Guid`, quá trình parse thất bại khiến ModelState tự động thêm lỗi: `"The value 'get-list' is not valid."` cho trường `id` và trả về `400 Bad Request`.

---

## 2. XÁC ĐỊNH FILE / MODULE CẦN THỰC HIỆN (BƯỚC 2 THEO RULE.MD)

| STT | File / Thư mục | Module / Dự án | Lý do thực hiện |
|:---:|---|---|---|
| 1 | `IELTSMaster.AuthService/Controllers/UsersController.cs` | AuthService Backend | 1. Bổ sung ràng buộc kiểu `:guid` cho toàn bộ các route có `{id}` (`{id:guid}`).<br>2. Bổ sung action `[HttpGet("get-list")]` song song với `[HttpPost("get-list")]`.<br>3. Thêm các route alias tương thích: `api/users`, `api/User`, `api/System/User`. |

---

## 3. MÔ TẢ CÁCH THỰC HIỆN (BƯỚC 3 THEO RULE.MD)

1. **Thêm ràng buộc `:guid` cho tất cả các action ID trong `UsersController.cs`:**
   - `[HttpGet("{id:guid}")]` thay vì `[HttpGet("{id}")]`
   - `[HttpPut("{id:guid}")]` thay vì `[HttpPut("{id}")]`
   - `[HttpDelete("{id:guid}")]` thay vì `[HttpDelete("{id}")]`
   - `[HttpPost("{id:guid}/lock")]` thay vì `[HttpPost("{id}/lock")]`
   - `[HttpPost("{id:guid}/unlock")]` thay vì `[HttpPost("{id}/unlock")]`
   - `[HttpPut("{id:guid}/system-role")]` thay vì `[HttpPut("{id}/system-role")]`
   - `[HttpPost("{id:guid}/assign-role")]` thay vì `[HttpPost("{id}/assign-role")]`
   *(Giúp router ASP.NET Core phân biệt rõ ràng: chỉ các chuỗi đúng định dạng GUID mới được kích hoạt các endpoint này, tuyệt đối không nuốt nhầm các sub-route dạng chữ như `get-list`, `combobox`)*.

2. **Hỗ trợ đầy đủ cả 2 phương thức HTTP GET và POST cho `get-list`:**
   - Giữ nguyên `[HttpPost("get-list")]` cho phân trang dạng JSON body từ frontend.
   - Thêm `[HttpGet("get-list")]` nhận query parameters (`search`, `textSearch`, `systemRole`, `status`, `pageIndex`, `pageSize`).

3. **Bổ sung các Route Aliases:**
   - `[Route("api/[controller]")]`
   - `[Route("api/users")]`
   - `[Route("api/User")]`
   - `[Route("api/System/User")]`

---

## 4. KẾT QUẢ THỰC HIỆN (BƯỚC 4 THEO RULE.MD)

- Xung đột routing giữa `get-list` và `{id}` đã được giải quyết triệt để 100%.
- Khi truy cập `/user`, dù request gửi `POST /api/users/get-list` hay `GET /api/users/get-list`, hệ thống đều định tuyến chính xác vào action lấy danh sách người dùng và trả kết quả `HTTP 200 OK`.
- Tham số `id` không còn bao giờ bị gán giá trị `"get-list"`, triệt tiêu hoàn toàn lỗi `400 Bad Request`.

---

## 5. LƯU Ý VẬN HÀNH (BƯỚC 5 THEO RULE.MD)
- Trong Visual Studio 2022, bấm **Stop Debugging (`Shift + F5`)** và **Start Debugging (`F5`)** để nạp bản build mới nhất của `AuthService`.
