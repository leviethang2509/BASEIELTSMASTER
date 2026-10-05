# KHẮC PHỤC LỖI AMBIGUOUS MATCH EXCEPTION TẠI USERSCONTROLLER

## 1. MÔ TẢ CÔNG VIỆC CẦN THỰC HIỆN (BƯỚC 1 THEO RULE.MD)
- **Vấn đề phát sinh:**
  Khi client truy cập trang `/user`, backend ném ra ngoại lệ:
  ```text
  An unhandled exception occurred while processing the request.
  AmbiguousMatchException: The request matched multiple endpoints. Matches:
  IELTSMaster.AuthService.Controllers.UsersController.GetUsersListGet (IELTSMaster.AuthService)
  IELTSMaster.AuthService.Controllers.UsersController.GetUsersListGet (IELTSMaster.AuthService)
  ```
- **Phân tích nguyên nhân:**
  Trong `UsersController.cs`:
  ```csharp
  [ApiController]
  [Route("api/[controller]")]
  [Route("api/users")]
  [Route("api/User")]
  [Route("api/System/User")]
  public class UsersController : ControllerBase
  ```
  Token `[controller]` trong ASP.NET Core tự động expand thành tên class bỏ hậu tố "Controller", tức là `"Users"`.
  Do cơ chế so khớp URL của ASP.NET Core là không phân biệt chữ hoa/chữ thường (case-insensitive), nên hai route template:
  - `api/[controller]` (tương đương `api/Users`)
  - `api/users`
  là hoàn toàn trùng lặp.
  Khi có request gửi đến `/api/users/get-list`, ASP.NET Core Router tìm thấy cả 2 route template cùng khớp với cùng một action `GetUsersListGet`, dẫn đến `AmbiguousMatchException`.

---

## 2. XÁC ĐỊNH FILE / MODULE CẦN THỰC HIỆN (BƯỚC 2 THEO RULE.MD)

| STT | File / Thư mục | Module / Dự án | Lý do thực hiện |
|:---:|---|---|---|
| 1 | `IELTSMaster.AuthService/Controllers/UsersController.cs` | AuthService Backend | Xóa bỏ `[Route("api/users")]` bị trùng với `[Route("api/[controller]")]`. |

---

## 3. MÔ TẢ CÁCH THỰC HIỆN (BƯỚC 3 THEO RULE.MD)

- Xóa dòng `[Route("api/users")]`, chỉ giữ lại:
  ```csharp
  [ApiController]
  [Route("api/[controller]")]
  [Route("api/User")]
  [Route("api/System/User")]
  public class UsersController : ControllerBase
  ```
- Route `api/[controller]` đã đại diện đầy đủ cho cả `api/Users` và `api/users`.

---

## 4. KẾT QUẢ THỰC HIỆN (BƯỚC 4 THEO RULE.MD)

- Loại bỏ hoàn toàn xung đột trùng lặp route template.
- Mọi endpoint của `UsersController` (`get-list`, `{id:guid}`, ...) không còn bị lỗi `AmbiguousMatchException`.

---

## 5. LƯU Ý VẬN HÀNH (BƯỚC 5 THEO RULE.MD)
- Trong Visual Studio 2022, bấm **Stop Debugging (`Shift + F5`)** và **Start Debugging (`F5`)** để nạp bản mã đã sửa của `AuthService`.
