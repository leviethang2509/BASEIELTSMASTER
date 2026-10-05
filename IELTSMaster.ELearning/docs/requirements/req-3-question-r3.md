# Requirement 3 – Câu hỏi làm rõ (vòng 3)

> Nguồn: [req-3.md](req-3.md), [vòng 1](req-3-question.md), [vòng 2](req-3-question-r2.md).
> Cách trả lời: ghi ngay dưới dòng **Trả lời:** của từng câu. Mỗi câu đã có **Đề xuất**, nếu đồng ý chỉ cần ghi `OK`.
> Vòng này chỉ còn các điểm **mâu thuẫn hoặc chưa khớp** giữa các câu trả lời trước. Trả lời xong là lập plan.

---

## T1. 🔴 Nhãn "bài tập / bài kiểm tra / bài thi" của mục trong lớp

Yêu cầu gốc: *"Giáo viên có thể set 'bài học' nào là bài tập, bài kiểm tra hay bài thi và có set deadline hoàn thành"*. Sau vòng 1 (E4.1) bài học và đề thi đã tách riêng, vòng 2 (R11.5) chốt **bài học không tính chuyên cần**. Vậy nhãn còn ý nghĩa gì?

**Đề xuất:**
- Mục **bài học** có nhãn `Bài học` (mặc định) hoặc `Bài tập`. Mục **đề thi** có nhãn `Bài kiểm tra` (mặc định) hoặc `Bài thi`. Nhãn chỉ để **hiển thị và lọc** (học viên thấy "Bài tập về nhà", "Bài thi cuối khoá"), **không đổi cách làm hay cách chấm**.
- Mục bài học (cả `Bài học` lẫn `Bài tập`) có **ngày mở** và **deadline tuỳ chọn**, deadline chỉ để nhắc (hiện trên trang lớp + chuông "sắp hết hạn"), **không tính chuyên cần**, không khoá sau deadline.
- **Chỉ mục đề thi** tính chuyên cần và có tuỳ chọn "Nhận bài quá hạn" (R10).

Câu hỏi: mục có nhãn `Bài tập` (bài học giao về nhà) có cần **tính chuyên cần** không? Đề xuất: không, theo R11.5.
**Trả lời:**

Đồng ý với đề xuất

## T2. 🔴 Nhóm thi lại: ai bắt buộc thi, chuyên cần tính thế nào?

R7 vòng 2 đã chốt: mọi học viên (kể cả đã đậu) đều vào thi được mọi lần trong nhóm thi, kết quả nhóm = **điểm cao nhất**, bất kể đậu hay trượt. Còn lại:

1. Học viên **đã đậu** ở lần trước mà **không thi** lần sau: lần sau với họ là **không bắt buộc**, tức không tính chuyên cần và không hiện "quá hạn". Đồng ý?
2. Học viên **đã đậu** vẫn **thi** lần sau: tính chuyên cần cho lần đó như bình thường (đúng hạn/muộn), hay chỉ tính khi có lợi (đúng hạn)? Đề xuất: không tính (lần không bắt buộc thì không tính chuyên cần), chỉ lấy điểm.
3. Học viên **chưa đậu** (trượt hoặc chưa làm lần trước): lần sau là **bắt buộc**, tính chuyên cần như bình thường. Đồng ý?
4. Nhãn cho học viên: mục thi lại hiện "Thi lại – không bắt buộc (bạn đã đậu lần 1)" hoặc "Thi lại – bắt buộc". Đồng ý?

**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất
(4) Đồng ý với đề xuất

## T3. 🔴 "Cho học viên thi thoải mái" (R8.4)

Câu trả lời R8.4 *"Cứ cho học viên thi thoải mái"* có thể hiểu theo 2 cách:
- **(a)** Lượt thi lại vẫn **mở** cho học viên dù lượt trước còn câu chưa chấm (không phải chờ kết quả). **Mỗi mục đề thi trong lớp vẫn chỉ làm 1 lần** (E4.3), muốn thi thêm thì giáo viên thêm mục thi lại.
- **(b)** Mỗi mục đề thi trong lớp làm **không giới hạn** số lần, lấy điểm cao nhất.

**Đề xuất:** (a), vì (b) mâu thuẫn với E4.3 và R10.5 ("Cho làm lại" khi gặp sự cố).

Các ý đi kèm (theo (a)):
1. Điểm cao nhất của nhóm tính trên các lượt **đã chấm xong**. Lượt còn câu chưa chấm hiện "Chờ chấm". Kết quả nhóm tạm thời = cao nhất trong các lượt đã chấm, kèm dấu "còn lượt chờ chấm".
2. "Giáo viên tự chọn bài để chấm": trang Chấm bài liệt kê **mọi lượt** (lọc theo lớp, mục, học viên). Giáo viên chấm lượt nào tuỳ ý, không bắt buộc chấm hết. Lượt không bao giờ được chấm thì **không tính** vào điểm cao nhất.
3. Đậu/trượt của nhóm = điểm cao nhất ≥ ngưỡng của **mục có ngưỡng cao nhất** trong nhóm, hay theo ngưỡng của **từng lượt**? Đề xuất: mỗi mục có ngưỡng riêng (R8.2), học viên đậu nhóm nếu **có ít nhất 1 lượt** đạt ngưỡng của mục đó. Điểm hiển thị vẫn là điểm cao nhất.

**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất

## T4. Ngày nghỉ (holiday) của tenant

R13.4: thêm ngày nghỉ trong cài đặt tenant, buổi học trùng ngày nghỉ thì tự huỷ.

**Đề xuất:**
1. Owner/Admin quản lý danh sách ngày nghỉ ở trang **Cài đặt** tenant (cùng chỗ ngưỡng chuyên cần mặc định, R11.2). Mỗi dòng: tên (vd. "Tết Nguyên đán"), từ ngày – đến ngày. **Không lặp hằng năm** (Tết âm lịch mỗi năm một ngày khác), mỗi năm nhập lại.
2. Sinh buổi học: bỏ qua ngày nghỉ, tạo buổi ở trạng thái `cancelled` với ghi chú "Nghỉ: Tết Nguyên đán" (để thấy trên lịch là có nghỉ).
3. **Thêm ngày nghỉ** sau khi đã sinh buổi: tự huỷ các buổi **tương lai** trùng ngày nghỉ (kể cả buổi đã sửa tay), buổi đã qua giữ nguyên. Gửi thông báo "buổi học bị huỷ" cho học viên/giáo viên (R18).
4. **Xoá/sửa ngày nghỉ**: buổi bị huỷ **do ngày nghỉ đó** được tự khôi phục về `scheduled` (buổi huỷ tay vì lý do khác giữ nguyên).
5. Không có ngày nghỉ ở phạm vi hệ thống (mỗi trung tâm tự nhập).

**Trả lời:**

(1) Đồng ý với đề xuất, mỗi năm nhập lại.
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất
(4) Đồng ý với đề xuất
(5) Đồng ý với đề xuất

**Quan trọng** Vì mỗi lớp học có bài học map với buổi học theo thứ tự buổi, khi thêm hoặc xoá ngày nghỉ thì sẽ ảnh hưởng để buổi học.

Vậy khi thêm ngày nghỉ thì hãy đẩy các buổi học dịch tới tương lai.

Nếu xoá ngày nghỉ thì dịch chuyển lại các buổi học theo thời khoá biểu.

Nếu chưa rõ hãy hỏi thêm round 4.

## T5. Nhận xét cuối khoá (R12)

**Đề xuất:**
1. Mỗi học viên trong lớp có **1 nhận xét cuối khoá** (text), giáo viên nào của lớp cũng viết/sửa được, lưu người sửa cuối + thời điểm. Owner/Admin cũng sửa được.
2. Viết được bất kỳ lúc nào khi lớp `ongoing` hoặc `finished` (lớp kết thúc vẫn cho viết/sửa nhận xét, dù học viên không nộp bài được nữa).
3. Học viên và phụ huynh **chỉ thấy khi lớp `finished`** (cùng lúc với chuyên cần/bảng điểm, R11.3). Có thông báo chuông khi nhận xét được công bố (lớp chuyển `finished`) hoặc được sửa sau đó.
4. Có trong file Excel xuất bảng điểm (cột "Nhận xét").

**Trả lời:**

Đồng ý với đề xuất

## T6. Lớp chuyển `finished` giữa chừng (R10.4)

Lớp chuyển `finished` thì các lượt đang làm dở bị **chốt ngay**: câu đã trả lời được chấm như hết giờ, section chưa bắt đầu tính 0. **Đề xuất thêm:**
1. Trước khi chuyển, hộp xác nhận báo "Có N học viên đang làm bài, lượt làm sẽ bị chốt ngay".
2. Chuyển ngược `finished → ongoing` được (vd. bấm nhầm, hoặc muốn mở lại cho nộp bài). Lượt đã bị chốt **không** mở lại.
3. Lượt học **bài học** dở dang không bị ảnh hưởng (bài học không có "nộp muộn"), nhưng học viên không nộp section được nữa khi lớp `finished`.

**Trả lời:**

Đồng ý với đề xuất
