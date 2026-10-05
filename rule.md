# QUY TẮC THỰC HIỆN VÀ LƯU LỊCH SỬ CÔNG VIỆC

## 1. Quy tắc trước khi thực hiện công việc

Trước khi bắt đầu bất kỳ công việc nào, cần thực hiện đầy đủ các bước sau:

### Bước 1. Mô tả công việc cần thực hiện

* Nêu rõ **công việc cần làm**.
* Xác định **mục tiêu và kết quả mong muốn**.
* Nếu công việc liên quan đến lỗi hoặc thay đổi nghiệp vụ, cần mô tả rõ **vấn đề hiện tại** và **yêu cầu cần thay đổi**.

### Bước 2. Xác định File/Module cần thực hiện

Phải xác định rõ:

* **File nào** cần chỉnh sửa.
* **Module/Chức năng nào** bị ảnh hưởng.
* **Lý do** cần chỉnh sửa file đó.
* Nếu có nhiều file liên quan, phải liệt kê đầy đủ các file.

### Bước 3. Mô tả cách thực hiện

Trước khi code/chỉnh sửa, cần mô tả:

* Hướng xử lý.
* Các bước thực hiện.
* Logic nghiệp vụ liên quan.
* Các thành phần có thể bị ảnh hưởng.
* Nếu có thay đổi Database/API/Frontend/Backend thì phải ghi rõ.

### Bước 4. Thực hiện công việc

Sau khi đã xác định đầy đủ các nội dung trên mới tiến hành:

* Code/chỉnh sửa.
* Test chức năng.
* Kiểm tra các chức năng liên quan để tránh phát sinh lỗi ngoài phạm vi.

### Bước 5. Lưu lịch sử công việc

Sau khi hoàn thành, phải lưu lại toàn bộ thông tin vào **folder `WORKHISTORY`**.

Mỗi công việc cần lưu tối thiểu:

* Nội dung công việc.
* Thời gian thực hiện.
* File đã thay đổi.
* Lý do thay đổi.
* Cách xử lý.
* Kết quả sau khi thực hiện.
* Các lưu ý hoặc vấn đề phát sinh nếu có.

## 2. Nguyên tắc bắt buộc

> **Không thực hiện chỉnh sửa trực tiếp khi chưa xác định rõ: Làm gì → Làm trên file nào → Vì sao làm → Làm như thế nào.**

> **Mọi thay đổi sau khi hoàn thành đều phải có lịch sử được lưu trong `WORKHISTORY`.**

### Luồng thực hiện

**Mô tả việc cần làm**
↓
**Xác định File/Module + Lý do**
↓
**Mô tả phương án xử lý**
↓
**Thực hiện Code/Chỉnh sửa**
↓
**Test & Kiểm tra ảnh hưởng**
↓
**Lưu lịch sử vào `WORKHISTORY`**


Lưu ý không tự chạy dự án =>thiếu thư viện =>cài linh tinh, mà hãy yêu cầu tôi chạy và kiểm tra