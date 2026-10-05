# ĐÁNH GIÁ KHẢ NĂNG TRIỂN KHAI HỆ THỐNG IELTS MASTER TRÊN VPS 2GB RAM

## 1. Thông tin đánh giá
- **Nhiệm vụ:** Đánh giá tính khả thi, phân tích dung lượng bộ nhớ (RAM) tiêu thụ và đưa ra giải pháp kỹ thuật khi triển khai toàn bộ hệ thống IELTS Master lên một VPS có cấu hình **2 GB RAM**.
- **Thời gian thực hiện:** Ngày 04/10/2026.
- **Người thực hiện:** AI Assistant (theo quy chuẩn `rule.md`).

---

## 2. Bảng phân tích chi tiết mức tiêu thụ RAM của hệ thống

Hệ thống IELTS Master hiện tại bao gồm các thành phần sau khi đưa lên máy chủ Linux:

| Thành phần | Công nghệ | RAM lúc nghỉ (Idle) | RAM lúc có tải (Active/Peak) |
| :--- | :--- | :--- | :--- |
| **Hệ điều hành máy chủ** | Ubuntu Server 22.04 / 24.04 (SSH, systemd, logs) | ~200 MB | ~300 MB |
| **Cơ sở dữ liệu** | PostgreSQL 16 (chạy 2 schema `auth` và `business`) | ~150 MB | ~250 MB |
| **ApiGateway** | YARP .NET 8 (Reverse Proxy & Routing) | ~70 MB | ~110 MB |
| **AuthService** | ASP.NET Core 8 Web API + EF Core + JWT | ~90 MB | ~140 MB |
| **BusinessService** | ASP.NET Core 8 Web API + EF Core (Đề thi & Chấm điểm) | ~110 MB | ~180 MB |
| **FileService** | ASP.NET Core 8 Web API + ImageSharp + Local/R2 | ~80 MB | ~130 MB |
| **Frontend Web** | Nginx phục vụ thư mục tĩnh `dist/` (React Vite) | ~25 MB | ~40 MB |
| **Docker Engine** | dockerd + containerd (nếu chạy Docker Compose) | ~150 MB | ~200 MB |
| **TỔNG CỘNG** | **Không dùng Docker (Systemd Service)** | **~725 MB** | **~1.15 GB - 1.4 GB** |
| **TỔNG CỘNG** | **Dùng Docker Compose** | **~875 MB** | **~1.3 GB - 1.6 GB** |

---

## 3. Kết luận: Có deploy nổi trên VPS 2 GB RAM không?

### ⚠️ CÂU TRẢ LỜI NGẮN GỌN:
> **CÓ THỂ DEPLOY ĐƯỢC, NHƯNG Ở MỨC "VỪA KHÍT" VÀ RẤT DỄ SẬP NẾU KHÔNG CẤU HÌNH TỐI ƯU ĐÚNG CÁCH!**

* **Nếu để mặc định**: Hệ thống **CHẮC CHẮN SẼ BỊ CRASH (OOM Killer)** sau vài giờ hoặc khi có 10-20 học viên đồng thời nộp bài thi. Vì .NET mặc định kích hoạt chế độ `Server Garbage Collection` (sẽ giữ bộ nhớ RAM càng nhiều càng tốt để tăng hiệu năng).
* **Nếu áp dụng các kỹ thuật tối ưu bắt buộc**: Hệ thống sẽ chạy ổn định, phục vụ tốt 30 - 50 thí sinh thi cùng lúc.

---

## 4. Ba "Cạm bẫy" chí mạng gây sập VPS 2GB RAM

1. **Cạm bẫy 1: Biên dịch (Build) trực tiếp trên VPS**:
   - Nếu bạn SSH vào VPS rồi gõ `dotnet build`, `dotnet publish` hoặc `npm run build`: **VPS sẽ bị treo cứng 100%**. Trình biên dịch TypeScript và .NET ngốn đột ngột từ 1.2 GB - 2 GB RAM chỉ trong 30 giây biên dịch $\rightarrow$ Hết RAM $\rightarrow$ Crash.
2. **Cạm bẫy 2: Out-Of-Memory (OOM) Killer của Linux**:
   - Khi RAM vật lý chạm mốc 1.95 GB / 2 GB, Linux Kernel sẽ tự động chọn một tiến trình ngốn nhiều RAM nhất để "bắn hạ" (thường là PostgreSQL hoặc BusinessService) $\rightarrow$ Website hiện lỗi `502 Bad Gateway`.
3. **Cạm bẫy 3: Cơ chế Server GC mặc định của ASP.NET Core**:
   - Mặc định .NET 8 coi máy chủ là server tài nguyên dồi dào, nên mỗi microservice có thể tự nhiên chiếm 150MB - 250MB trước khi thực hiện dọn rác (GC Collect). 4 service .NET cộng lại có thể ngốn hơn 800MB RAM.

---

## 5. Bốn kỹ thuật "Sống còn" để chạy mượt mà trên VPS 2GB RAM

### ① BẮT BUỘC: Tạo 2GB - 4GB SWAP (RAM ảo trên ổ cứng SSD)
Đây là "phao cứu sinh" quan trọng nhất. Khi RAM vật lý đầy, Linux sẽ chuyển dữ liệu tạm sang ổ SSD thay vì kích hoạt OOM Killer để sập máy.
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### ② Chuyển .NET 8 sang chế độ Workstation GC & Giới hạn Heap RAM
Thêm cấu hình biến môi trường cho các container hoặc service .NET trong `docker-compose.yml` hoặc `systemd`:
```yaml
environment:
  - DOTNET_gcServer=0                 # Bật Workstation GC (thu hồi RAM ngay lập tức)
  - DOTNET_GCHeapHardLimit=0xC000000   # Giới hạn trần mỗi service chỉ ăn tối đa 192MB RAM
```
*Hiệu quả: Giảm 40% - 50% lượng RAM tiêu thụ của 4 microservice .NET.*

### ③ Build sẵn trên máy Local hoặc GitHub Actions (Tuyệt đối không build trên VPS)
- Chạy `npm run build` ở máy dev hoặc CI/CD, chỉ upload thư mục `dist/` lên VPS.
- Build sẵn image Docker hoặc chạy `dotnet publish -c Release` ở máy dev rồi đẩy sang VPS. VPS chỉ làm nhiệm vụ chạy (`run`), không làm nhiệm vụ biên dịch (`build`).

### ④ Tinh giản PostgreSQL & Phục vụ Frontend bằng Nginx tĩnh
- Cấu hình file `postgresql.conf`:
  ```ini
  shared_buffers = 128MB
  work_mem = 4MB
  max_connections = 50
  ```
- Frontend React Vite: Phục vụ trực tiếp bằng **Nginx** (chỉ tốn ~25MB RAM). Tuyệt đối **không chạy `node server.js`** để tránh lãng phí thêm 100MB RAM của tiến trình Node.js.

---

## 6. Lời khuyên & Đề xuất

| Cấu hình VPS | Chi phí trung bình | Đánh giá thực tế |
| :--- | :--- | :--- |
| **VPS 2 GB RAM (Hiện tại)** | ~100k - 150k/tháng | **Chạy được nếu cấu hình Swap + Workstation GC**. Phù hợp giai đoạn thử nghiệm (Beta), demo, học tập, quy mô dưới 30 học viên. |
| **VPS 4 GB RAM (Khuyến nghị)** | ~200k - 250k/tháng | **Điểm ngọt ngào (Sweet Spot)**: Hệ thống chạy cực kỳ thoải mái, Docker Compose mượt mà, chịu tải 100 - 200 thí sinh làm bài thi IELTS cùng lúc mà không lo giật lag. |
