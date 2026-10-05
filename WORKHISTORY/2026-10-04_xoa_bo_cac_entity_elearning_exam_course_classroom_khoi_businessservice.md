# LỊCH SỬ CÔNG VIỆC: GỠ BỎ TOÀN BỘ CÁC ENTITY E-LEARNING (EXAM, COURSE, CLASSROOM) KHỎI IELTSMASTER.BUSINESSSERVICE

## 1. Thông tin công việc
- **Nhiệm vụ:** Xoá bỏ hoàn toàn các Entity và file cấu hình thuộc nghiệp vụ đào tạo E-learning (`Exam`, `Course`, `Classroom`) ra khỏi `IELTSMaster.BusinessService` để chuyển giao hoàn toàn quyền sở hữu cho dự án E-learning `lang-simulator`. Giữ lại các Entity thuần tuý về quản trị vận hành trung tâm (`Branch`, `Student`, `ClassItem`).
- **Thời gian thực hiện:** 01:32 - 01:35, Ngày 04/10/2026.
- **Người thực hiện:** AI Assistant (tuân thủ `rule.md`).

---

## 2. Lý do thực hiện
1. **Phân định ranh giới trách nhiệm (Separation of Concerns)**:
   - Các bảng `exams` (đề thi), `courses` (khóa học elearning), `classrooms` (lớp học elearning) là các thực thể lõi của hệ thống đào tạo E-learning `lang-simulator` (quản lý phần thi, câu hỏi, nộp bài, chấm thi).
   - `IELTSMaster.BusinessService` không nên can thiệp hoặc sở hữu trùng lặp các bảng này trong C# để tránh xung đột Migration và quyền hạn.
2. **Bảo toàn dữ liệu cho `lang-simulator`**:
   - Gỡ bỏ ánh xạ trong C# nhưng **không chạy lệnh drop table trên PostgreSQL**, giúp `lang-simulator` tiếp tục sử dụng các bảng này bình thường.

---

## 3. Các file đã xoá & chỉnh sửa

### A. Các file Entity & Configuration đã xoá:
1. `IELTSMaster.BusinessService/Entities/Exam.cs`
2. `IELTSMaster.BusinessService/Entities/Course.cs`
3. `IELTSMaster.BusinessService/Entities/Classroom.cs`
4. `IELTSMaster.BusinessService/Entities/Configurations/ExamConfiguration.cs`
5. `IELTSMaster.BusinessService/Entities/Configurations/CourseConfiguration.cs`
6. `IELTSMaster.BusinessService/Entities/Configurations/ClassroomConfiguration.cs`

### B. Các Entity còn giữ lại (Vận hành trung tâm IELTSMaster):
1. `IELTSMaster.BusinessService/Entities/Branch.cs` (Chi nhánh cơ sở trung tâm)
2. `IELTSMaster.BusinessService/Entities/Student.cs` (Hồ sơ học viên, thông tin phụ huynh, biên lai học phí)
3. `IELTSMaster.BusinessService/Entities/ClassItem.cs` (Lớp học thực tế mở tại cơ sở)

### C. File Controller đã cập nhật:
* `IELTSMaster.BusinessService/Controllers/TrainingController.cs`:
  - Dọn sạch các API gọi vào `Exam`, `Course`, `Classroom`.
  - Cập nhật endpoint `overview` trả về thông tin trung tâm vận hành.

---

## 4. Kết quả kiểm thử
1. `dotnet build IELTSMaster.BusinessService\IELTSMaster.BusinessService.csproj`: **Build succeeded (0 Errors)**.
   - Nhờ kiến trúc Clean DbContext (`ApplyConfigurationsFromAssembly`) đã cấu hình ở bước trước, `BusinessDbContext.cs` tự động loại bỏ các entity đã xoá mà không cần sửa một dòng code nào trong DbContext.
2. `dotnet build IELTSMaster.sln`: **Build succeeded (0 Errors)** trên toàn bộ 7 projects.
3. Database PostgreSQL: Các bảng `exams`, `courses`, `classrooms` vẫn nguyên vẹn 100% cho `lang-simulator`.
