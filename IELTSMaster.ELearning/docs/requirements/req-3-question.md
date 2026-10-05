# Requirement 3 – Câu hỏi làm rõ

> Nguồn: [req-3.md](req-3.md).
> Cách trả lời: ghi ngay dưới dòng **Trả lời:** của từng câu. Mỗi câu đã có **Đề xuất**, nếu đồng ý chỉ cần ghi `OK`.
> Câu đánh dấu 🔴 là câu **chặn** (ảnh hưởng lớn tới thiết kế DB/kiến trúc), cần trả lời trước khi lập plan.

---

## 0. Hiện trạng (để hiểu bối cảnh các câu hỏi)

- **Danh mục → Loại đề (`exam_blueprints`) → Module (`exam_modules`)**: có cả phạm vi hệ thống và tenant. Module có `reference_duration_minutes` (bội số 5, ≤ 180) và **bắt buộc**.
- **Đề thi (`exams`)** tạo từ 1 loại đề; mỗi module thành 1 **section** (snapshot, sửa được), mỗi section 1 editor Plate, bắt buộc `duration_minutes`. Nội dung tách ra `exam_parts`/`exam_questions` (có đáp án) + `content_public` (bỏ đáp án). Có version, `draft → published → archived`.
- **Làm bài**: mọi thành viên tenant thấy **mọi đề đã publish** ở `/t/{slug}` và thi không giới hạn số lượt. Mỗi section có màn hình giới thiệu → bấm bắt đầu → đếm giờ theo server → nộp/hết giờ tự nộp. Học viên **không xem đáp án**, chỉ thấy số câu đúng; Writing/Speaking chờ chấm tay.
- **Chấm tay**: Teacher/Owner/Admin chấm được **bất kỳ** bài nào trong tenant (trừ bài của mình).
- **Editor hiện có**: đoạn văn, định dạng chữ, danh sách, bảng, ảnh/audio/video, và các khối câu hỏi (MC, pick-n, ghép cặp, TFNG/YNNG, điền chỗ trống, sắp xếp, polytomous, speaking, writing). **Chưa có** heading, callout/ghi chú, furigana (ruby).
- Chưa có khoá học, lớp, thời khoá biểu, deadline, điểm danh, thông báo (không có dịch vụ gửi mail).
- DB dùng chung hiện **chưa có dữ liệu đề/bài làm thật** (0 tenant/đề sau nghiệm thu req-1) nên đổi cấu trúc bảng đề ít rủi ro dữ liệu, nhưng vẫn phải tương thích ngược với code đang chạy trên :3001.

Tên gọi dùng trong file này (và đề xuất tên trong code):

| Tiếng Việt | Code |
|---|---|
| Bài học | `lesson` |
| Khoá học | `course` |
| Giáo trình (của khoá học) | `curriculum` |
| Lớp học | `classroom` (`class` là từ khoá JS) |
| Mục trong giáo trình | `curriculum_item` / `class_item` |
| Buổi học (thời khoá biểu) | `class_session` |

---

## A. Bài học (yêu cầu 3.1)

### A1. 🔴 Bài học là thực thể riêng hay chung bảng với đề thi?
Yêu cầu 3.1 nói editor dùng để soạn "bài học, bài tập, bài kiểm tra và bài thi", nhưng mục mô tả chỉ nói về **bài học** (không giờ, không vào giả lập thi). Có 2 cách:

- **(a) Tách riêng:** giữ nguyên `exams` (đề thi/kiểm tra – có giờ, giả lập thi). Thêm `lessons` (+ `lesson_sections`, `lesson_parts`, `lesson_questions` hoặc bảng chung có cột loại) – dùng cùng editor Plate, không có giờ, có màn hình học riêng.
- **(b) Gộp chung:** `exams` thêm cột `kind` (`lesson` | `exam`); `kind = lesson` thì bỏ giờ và mở bằng màn hình học thay cho giả lập thi. Ít bảng hơn nhưng mọi truy vấn/quy tắc hiện tại của đề thi phải lọc theo `kind`, dễ ảnh hưởng hành vi đề thi.

"Bài tập / bài kiểm tra / bài thi" theo tôi hiểu là **cách giáo viên giao** một mục trong lớp (yêu cầu 3.2), không phải loại nội dung khác nhau (xem E4).

**Đề xuất:** (a) Tách riêng, dùng chung editor/exam-core/lưu trữ media; đề thi giữ nguyên 100% logic hiện tại. Nội dung soạn chỉ có 2 loại: **Bài học** (không giờ) và **Đề thi** (có giờ, như hiện tại).
**Trả lời:**

Tôi đồng ý tách hoàn toàn ra, chỉ dùng chung core của editor.

### A2. 🔴 Loại đề/Module cho bài học
"Người dùng vẫn tạo exam-blueprint và exam-module, lúc này exam-blueprint sẽ là định nghĩa bài học". Tôi hiểu là: tạo 1 **mẫu bài học** (vd. "Minna no Nihongo – 1 bài") gồm các module "Từ vựng, Ngữ pháp, Bài tập nhỏ, Nghe, Đọc"; sau đó tạo **từng bài học cụ thể** (Bài 1, Bài 2…) từ mẫu đó, mỗi module thành 1 section (tab) của bài học.

- Loại đề thêm cột `kind` (`exam` | `lesson`): mẫu bài học chỉ dùng để tạo bài học, mẫu đề thi chỉ dùng để tạo đề thi (không lẫn).
- Module của mẫu bài học **không có** `reference_duration_minutes` (cột cho phép NULL khi `kind = lesson`).
- Danh mục (`exam_categories`) dùng chung cho cả hai (vd. danh mục "Tiếng Nhật" chứa cả mẫu đề JLPT N2 và mẫu bài Minna).

**Đề xuất:** Như trên. Hiểu đúng ý bạn chưa? Trang quản lý "Loại đề" có lọc/tab theo loại (Đề thi | Bài học), hay tách 2 menu riêng "Loại đề" và "Mẫu bài học"?
**Trả lời:**

Nếu đã tách riêng thì hãy tạo những bảng có behavior giống với exam-blueprint và exam-module để không nhầm lẫn, chấp nhận duplicate logic bảng. Exam-category nên dùng chung cho cả hai, nếu được và an toàn hãy cân nhắc đổi tên sao cho tổng quát.

### A3. Mẫu bài học ở phạm vi hệ thống
Loại đề hiện có cả phạm vi hệ thống (System Owner/Admin tạo, mọi tenant dùng) và tenant.

**Đề xuất:** Mẫu bài học cũng có 2 phạm vi như loại đề. Nhưng **bài học** (nội dung) chỉ thuộc tenant (không có bài học hệ thống dùng chung).
**Trả lời:**

Đồng ý với đề xuất.

### A4. Bài học có cần section (tab) không?
Với đề thi, section có ý nghĩa vì mỗi section có giờ riêng. Bài học không có giờ.

**Đề xuất:** Vẫn giữ section = tab (từ module), cho thêm/xoá/đổi tên/sắp xếp như đề thi. Bài học có thể chỉ có 1 section. Trong mỗi section vẫn có Part/Subpart như đề thi (tuỳ chọn).
**Trả lời:**

Đồng ý với đề xuất.

### A5. 🔴 Câu hỏi trong bài học ("bài tập nhỏ")
Bài học có thể chứa câu hỏi (vd. module "Bài tập nhỏ", "Bài tập nghe"). Học viên làm câu hỏi trong bài học thì:

1. Có **chấm** không? Chấm ngay từng câu (bấm "Kiểm tra") hay chấm cả section khi bấm "Nộp"?
2. Có **hiện đáp án đúng** / đánh dấu câu sai không? (Đề thi hiện **không** hiện.)
3. Có **lưu câu trả lời** và kết quả lên server không (để giáo viên xem, tính tiến độ)?
4. Được làm lại bao nhiêu lần? Lần nào được tính?
5. Speaking/Writing trong bài học: có ghi âm/nộp và chờ giáo viên chấm tay như đề thi không?

**Đề xuất:** Câu trả lời lưu lên server; học viên bấm "Nộp" theo section thì chấm và **hiện đáp án đúng + đánh dấu đúng/sai** (vì là để học); làm lại không giới hạn, lưu lần gần nhất + đếm số lần. Speaking/Writing trong bài học nộp và chờ chấm tay như đề thi.
**Trả lời:**

Đồng ý với đề xuất.

### A6. Màn hình học bài (học viên)
"Không vào phần giả lập thi". Cần màn hình riêng cho học bài.

**Đề xuất:** Trang đọc bài học dạng tài liệu: tab theo section, nội dung + câu hỏi hiển thị liền mạch (không có lưới câu hỏi, không đồng hồ, không màn hình giới thiệu/chờ). Cuối mỗi section có nút "Nộp phần này" (nếu có câu hỏi). Nút "Đánh dấu đã học xong" cho cả bài học.
**Trả lời:**

Đồng ý với đề xuất.

### A7. Thế nào là "đã học xong" một bài học?
Cần cho tiến độ và độ chuyên cần (E7).

- (a) Học viên tự bấm "Đã học xong".
- (b) Tự động: đã mở mọi section + đã nộp mọi section có câu hỏi.
- (c) (b) + đạt điểm tối thiểu (vd. ≥ 50%).

**Đề xuất:** (b) – bài học không có câu hỏi thì mở hết các section là xong; có câu hỏi thì nộp đủ.
**Trả lời:**

Đồng ý với đề xuất.

### A8. Khối nội dung mới cho editor
Bài học lý thuyết cần định dạng phong phú hơn đề thi. Bạn cần những khối nào (chọn nhiều)?

- Heading (H1–H3)
- Callout / hộp ghi chú (Lưu ý, Ví dụ, Mẹo) có màu
- **Furigana (ruby)** cho tiếng Nhật (vd. 漢字 có chữ nhỏ かんじ bên trên)
- Bảng từ vựng dựng sẵn (Từ – Cách đọc – Nghĩa – Audio phát âm từng dòng)
- Audio có kèm transcript ẩn/hiện
- Khối gập/mở (ẩn đáp án/giải thích, "Xem giải thích")
- Flashcard
- Nhúng link YouTube
- Chữ màu / highlight, căn lề

**Đề xuất:** Heading, callout, furigana, khối gập/mở, highlight. Bảng từ vựng dùng bảng thường + audio trong ô (nếu bảng hiện tại cho chèn audio vào ô). Flashcard/YouTube để sau. Các khối mới dùng được cả trong đề thi (không ảnh hưởng chấm).
**Trả lời:**

Đồng ý với đề xuất.

### A9. Giải thích đáp án
Bài học (và có thể bài tập) thường cần **giải thích** cho từng câu sau khi nộp. Editor hiện không có chỗ nhập giải thích cho câu hỏi.

**Đề xuất:** Thêm trường "Giải thích" (tuỳ chọn) cho mỗi câu hỏi, bị bỏ khỏi `content_public` như đáp án, chỉ trả về sau khi học viên nộp **bài học** (đề thi vẫn không hiện). Có cần không, hay để sau?
**Trả lời:**

Nếu soạn thì có thể thêm 1 indicator tên là `Explanation` không, khi hiển thị ở bài thi hay bài học thì ẩn những text trong indicator đó đi.

### A10. Trạng thái & version của bài học
Đề thi có `draft → published → archived` và version (có bài làm thì lưu tạo version mới).

**Đề xuất:** Bài học có cùng trạng thái và cơ chế version như đề thi. Lớp học luôn dùng **version hiện tại** đã publish; bài làm/tiến độ của học viên gắn với version lúc làm (như đề thi). Chỉ bài học đã publish mới thêm vào giáo trình được (xem C5).
**Trả lời:**

Đồng ý với đề xuất.

### A11. Quyền với bài học
**Đề xuất:** Giống đề thi – Owner/Admin/Teacher tạo; Teacher sửa/publish/xoá bài học mình tạo, Owner/Admin mọi bài học. Mọi Teacher **xem và dùng** (thêm vào giáo trình) được mọi bài học đã publish của tenant. Teacher có được **nhân bản** (copy) bài học của người khác để sửa thành bản của mình không?
**Trả lời:**

Nếu bài học đã publish thì giáo viên có thể clone ra để chỉnh sửa cho nhanh, tài sản thuộc về tenant.

### A12. Xem trước
**Đề xuất:** Có nút "Xem trước" bài học trong editor như đề thi, hiển thị đúng màn hình học viên, chấm ở client, không lưu.
**Trả lời:**

Đồng ý với đề xuất.

### A13. 🔴 Học viên có được tự do học bài/thi đề ngoài lớp không?
Hiện tại **mọi thành viên** thấy mọi đề đã publish ở `/t/{slug}`. Khi có lớp:

- (a) Giữ nguyên: đề thi publish vẫn công khai trong tenant; bài học chỉ xem được qua lớp.
- (b) Thêm tuỳ chọn "Hiển thị" cho từng đề/bài học: **Công khai trong tenant** hoặc **Chỉ qua lớp**.
- (c) Mọi thứ chỉ qua lớp (bỏ danh sách đề công khai).

**Đề xuất:** (b), mặc định "Chỉ qua lớp" cho bài học, "Công khai trong tenant" cho đề thi (giữ hành vi hiện tại).
**Trả lời:**

Đồng ý với đề xuất.

### A14. Menu dashboard
**Đề xuất:** Thêm menu "Bài học" riêng cạnh "Đề thi" (danh sách, lọc danh mục/mẫu/trạng thái/người tạo như đề thi). Thêm nhóm menu mới "Đào tạo": Khoá học, Lớp học (giáo trình nằm trong trang khoá học).
**Trả lời:**

Đồng ý với đề xuất.

### A15. Xác nhận "giữ logic và behavior hiện tại của đề thi"
Hiểu là: loại đề, soạn đề, version, publish, giả lập thi, chấm tự động/chấm tay, kết quả **không đổi**; req-3 chỉ bổ sung (thêm `kind` cho loại đề, khối editor mới dùng chung, liên kết đề với lớp). Đúng không? Có điểm nào của đề thi bạn **muốn** đổi luôn trong req-3 không?
**Trả lời:**

Như đã trả lời những câu trên, hãy tách biệt ra, chấp nhận duplicate logic.

---

## B. Khoá học

### B1. Thông tin khoá học
**Đề xuất:** Tên, mã (unique trong tenant), mô tả, danh mục (tuỳ chọn, dùng `exam_categories`), ảnh bìa (tuỳ chọn), trình độ/cấp độ (text tự do, vd. "N5", "A2"), thời lượng dự kiến (số buổi, tuỳ chọn), trạng thái `active` / `archived`. **Không** có học phí.
Cần thêm/bớt trường nào?
**Trả lời:**

Đồng ý với đề xuất.

### B2. Ai quản lý khoá học?
"Người dùng có 1 trang đơn giản quản lý khoá học (CRUD)".

**Đề xuất:** Owner/Admin CRUD; Teacher chỉ xem (để tạo giáo trình theo khoá học). Student/Parent không thấy trang quản lý.
**Trả lời:**

Đồng ý với đề xuất.

### B3. Xoá khoá học
**Đề xuất:** Khoá học đã có lớp → không xoá được, chỉ lưu trữ (`archived`: không tạo lớp mới, lớp cũ vẫn chạy). Chưa có lớp → xoá hẳn (xoá luôn giáo trình của nó).
**Trả lời:**

Đồng ý với đề xuất.

### B4. Khoá học có hiển thị công khai không?
Ví dụ trang `/t/{slug}` giới thiệu các khoá học của trung tâm cho khách/học viên, hoặc học viên tự đăng ký vào lớp.

**Đề xuất:** Không trong req-3 – khoá học chỉ dùng nội bộ; học viên chỉ thấy lớp mình được thêm vào. Tự đăng ký/ghi danh để req sau.
**Trả lời:**

Đồng ý với đề xuất. Phần giới thiệu công khai sẽ làm sau.

---

## C. Giáo trình theo khoá học

### C1. 🔴 Một khoá học nhiều giáo trình – dùng để làm gì?
Sơ đồ ghi `Khoá học 1-m Giáo trình`. Nhiều giáo trình cho 1 khoá học là để: mỗi giáo viên có giáo trình riêng? Các phương án khác nhau (vd. học nhanh / học chậm)? Hay các phiên bản theo năm?

Khi tạo lớp: chọn **1** giáo trình của khoá học làm điểm xuất phát, hay lớp có thể lấy mục từ **nhiều** giáo trình của khoá học?

**Đề xuất:** Khi tạo lớp (hoặc giáo viên làm lần đầu) chọn 1 giáo trình của khoá học → hệ thống **sao chép** danh sách mục sang giáo trình của lớp. Sau đó giáo viên thêm được mục từ bất kỳ giáo trình nào của khoá học (và bài học khác – xem E2).
**Trả lời:**

Thực tế `Khoá học 1-m Giáo trình` là giáo trình tham khảo, khi tạo lớp học thì chọn 1 giáo trình trong khoá học đó, sau đó giáo viên custom lại. Phần giáo viên custom thế nào là tuỳ giáo viên, còn phần lựa chọn là để giúp giáo viên biết được khoá học đó có những nội dung nào dựa trên giáo trình tham khảo.

Tuy nhiên tôi muốn đổi lại là `Khoá học m-m Giáo trình`, giáo trình có thể được tham khảo ở nhiều khoá học.

### C2. 🔴 "Giáo trình theo khoá học là tham khảo" – nghĩa là sao chép?
Hiểu là: giáo trình của khoá học chỉ là **mẫu**; giáo trình của lớp là **bản sao** độc lập. Sửa giáo trình khoá học sau đó **không** ảnh hưởng lớp đã tạo (và ngược lại). Đúng không?

Ngoài ra, có cần nút "Đồng bộ lại từ giáo trình khoá học" (lấy các mục mới thêm) cho lớp không?

**Đề xuất:** Đúng là sao chép; không có đồng bộ tự động; có nút "Thêm mục từ giáo trình khoá học" để lấy thêm thủ công.
**Trả lời:**

Đồng ý với đề xuất, tôi đã trả lời ở câu C1

### C3. Mục trong giáo trình gồm gì?
"Thêm những bài học đã tạo ở 3.1 … có bài kiểm tra xen kẽ những bài học lý thuyết". Mục có thể là:

- Bài học (từ 3.1)
- Đề thi (hiện có, có giờ) – dùng làm "bài kiểm tra"/"bài thi"

**Đề xuất:** Mục trỏ tới **bài học hoặc đề thi**. Mỗi mục có: thứ tự, tên hiển thị (mặc định = tên bài học/đề, sửa được), loại giao mặc định (E4), ghi chú cho giáo viên (tuỳ chọn). Đúng ý bạn chưa? "Bài kiểm tra" xen kẽ là đề thi (có giờ) hay bài học được đánh dấu là kiểm tra?
**Trả lời:**

Đồng ý với đề xuất. Bài kiểm tra xen kẽ là bài thi có giờ (kèm cả deadline)

**Quan trọng** vì bài thi hiện tại sau khi publish là toàn bộ tenant thấy hết, vậy nên tôi nghĩ nên có thêm 1 status là tenant private (yes/no) chỉ dùng cho những bài thi trong khoá học.

### C4. Nhóm mục theo chương/buổi?
Giáo trình thực tế thường chia chương/unit/tuần (vd. "Tuần 1: Bài 1, Bài 2, Kiểm tra 1").

- (a) Danh sách phẳng có thứ tự.
- (b) Có "nhóm" (chương/tuần/unit) chứa các mục, kéo thả được.

**Đề xuất:** (b) một cấp nhóm (tuỳ chọn), vì sẽ cần để gắn với buổi học trong thời khoá biểu (D4).
**Trả lời:**

Tôi nghĩa nên group lại theo 1 cấp. Ví dụ: chương 1 có bài 1, bài 2, bài kiểm tra 1; chương 2 có bài 3, bài 4, bài kiểm tra 2; chương 3 có bài thi cuối khoá.

### C5. Điều kiện thêm vào giáo trình
1. Chỉ bài học/đề **đã publish** mới được thêm? Hay cho thêm bản nháp (học viên chưa thấy tới khi publish)?
2. Một bài học có được xuất hiện **2 lần** trong cùng giáo trình không (vd. ôn lại)?
3. Bài học/đề bị lưu trữ hoặc xoá khi đang nằm trong giáo trình/lớp thì sao?

**Đề xuất:** (1) chỉ đã publish; (2) không; (3) đang ở trong giáo trình khoá học/lớp thì **không cho xoá**, chỉ cho lưu trữ – mục trong giáo trình khoá học hiện cảnh báo "đã lưu trữ", lớp đang dùng vẫn học/làm bình thường.
**Trả lời:**

Đồng ý với đề xuất

### C6. Ai tạo/sửa giáo trình khoá học?
"Tenant owner/admin và giáo viên tạo giáo trình học theo khoá học".

**Đề xuất:** Owner/Admin sửa mọi giáo trình; Teacher tạo được và sửa giáo trình mình tạo, xem mọi giáo trình. Có cần trạng thái nháp/đang dùng cho giáo trình không? (Đề xuất: không, chỉ có tên + mô tả + danh sách mục.)
**Trả lời:**

Đồng ý với đề xuất

---

## D. Lớp học

### D1. Thông tin lớp
**Đề xuất:** Khoá học (bắt buộc, không đổi sau khi tạo), tên, mã (unique trong tenant), mô tả, ngày bắt đầu, ngày kết thúc (tuỳ chọn), sĩ số tối đa (tuỳ chọn, để trống = không giới hạn), phòng học/link online (text, tuỳ chọn), trạng thái.
Cần thêm/bớt trường nào?
**Trả lời:**

Đồng ý với đề xuất

### D2. Trạng thái lớp
**Đề xuất:** `upcoming` (sắp mở) → `ongoing` (đang học) → `finished` (đã kết thúc); thêm `cancelled` (huỷ). Owner/Admin đổi bằng tay (không tự đổi theo ngày). Lớp `finished`/`cancelled`: chỉ xem, không sửa giáo trình, học viên vẫn xem được bài và kết quả; có còn **nộp bài** được không?
**Trả lời:**

Đồng ý với đề xuất. Lớp đã kết thúc thì không nộp bài được nữa.

### D3. 🔴 Thời khoá biểu – mức chi tiết
- (a) Chỉ **mô tả lịch cố định**: các dòng "Thứ – giờ bắt đầu – giờ kết thúc" (vd. T2, T4 18:00–19:30) + ngày bắt đầu/kết thúc. Hiển thị cho học viên/giáo viên, không sinh buổi.
- (b) Lịch cố định **sinh ra từng buổi học** (ngày cụ thể) từ ngày bắt đầu → ngày kết thúc; sửa/huỷ/thêm từng buổi (nghỉ lễ, dạy bù); mỗi buổi có thể gán giáo viên, phòng.
- (c) Nhập từng buổi thủ công.

**Đề xuất:** (b). Hiển thị dạng danh sách + lịch tuần. Có cần **phát hiện trùng lịch** (giáo viên/phòng dạy 2 lớp cùng giờ) không? (Đề xuất: chỉ cảnh báo trùng giáo viên, không chặn.)
**Trả lời:**

Tôi chọn B, setting vòng lặp và sinh ra từng buổi, có thể add giáo viên khác vào dạy thế cũng được.

Khoá học hiển thị toàn bộ các buổi học theo dạng calendar hoặc list

Giáo viên có thể xem lịch dạy tổng quát của mình theo dạng calendar hoặc list.

Học viên có thể xem lịch học tổng quát của mình theo dạng calendar hoặc list.

Giáo viên, học viên có thể add vào lớp cùng giờ cùng ngày nhưng hiển thị cảnh báo đỏ chứ không chặn. Mục đích giúp cho người dùng có tuỳ chọn thêm thoải mái rồi loại trừ sau.

### D4. Buổi học gắn với mục giáo trình?
Ví dụ "Buổi 3 (T4 12/10): học Bài 2, làm Kiểm tra 1".

**Đề xuất:** Có thể gắn tuỳ chọn 1 buổi học cho mỗi mục/nhóm của giáo trình lớp (để học viên thấy "hôm nay học gì"); không bắt buộc. Có cần không?
**Trả lời:**

Có, hãy cho 1 bảng map các buổi với từng bài học, chỉ để tham khảo, người dùng map thủ công, 1 bài học có thể xuất hiện trong 2-3 buổi, một buổi có thể có nhiều bài học.

### D5. 🔴 Điểm danh
"Độ chuyên cần" trong yêu cầu gắn với việc nộp bài đúng hạn. Có cần **điểm danh buổi học** (có mặt / vắng có phép / vắng / đi muộn) không?

**Đề xuất:** Không trong req-3 – độ chuyên cần chỉ tính theo nộp bài (E7). Nếu cần điểm danh thì chỉ cần (b) ở D3 là thêm được về sau.
**Trả lời:**

Đồng ý với đề xuất

### D6. Giáo viên của lớp
1. Chỉ thành viên có role **Teacher** mới được thêm? Owner/Admin có được thêm vào lớp làm giáo viên không?
2. Có phân biệt **giáo viên chính / trợ giảng** (quyền khác nhau) không?
3. Lớp bắt buộc có ≥ 1 giáo viên không?

**Đề xuất:** (1) thành viên có role Teacher (Owner/Admin cũng có Teacher thì thêm được); (2) không phân biệt, mọi giáo viên của lớp quyền như nhau; (3) không bắt buộc lúc tạo, lớp chưa có giáo viên thì hiện cảnh báo.
**Trả lời:**

Đồng ý với đề xuất

### D7. Học viên của lớp
1. Chỉ thành viên có role **Student**?
2. Thêm bằng cách chọn từ danh sách thành viên (tìm kiếm, chọn nhiều). Có cần **tạo tài khoản mới ngay trong lớp** hoặc **nhập từ file Excel/CSV** không?
3. Một học viên có được học **nhiều lớp** cùng lúc không? Nhiều lớp của **cùng khoá học**?
4. Giáo viên có được thêm/xoá học viên không, hay chỉ Owner/Admin?

**Đề xuất:** (1) có role Student; (2) chọn từ thành viên, tạo tài khoản/nhập file để sau; (3) được nhiều lớp, cùng khoá học cũng được nhưng cảnh báo; (4) chỉ Owner/Admin (theo yêu cầu).
**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất
(4) Đồng ý với đề xuất

### D8. Sĩ số tối đa
**Đề xuất:** Đủ sĩ số thì **chặn** thêm học viên (kiểm trong transaction khoá dòng lớp, như giới hạn gói). Giảm sĩ số tối đa xuống dưới số hiện có: cho phép nhưng hiện cảnh báo vượt sĩ số (giống cách xử lý hạ gói). Không có danh sách chờ.
**Trả lời:**

Đồng ý với đề xuất

### D9. Học viên rời lớp / chuyển lớp / bị khoá
1. Xoá học viên khỏi lớp: giữ lại bài làm & thống kê cũ (ẩn khỏi danh sách, xem lại được)?
2. Có chức năng **chuyển lớp** (mang theo bài làm) không?
3. Membership bị deactivate / xoá: xử lý thế nào với lớp?

**Đề xuất:** (1) xoá mềm khỏi lớp, bài làm giữ, thêm lại thì khôi phục; (2) không, chỉ xoá khỏi lớp cũ + thêm vào lớp mới (bài làm cũ vẫn thuộc lớp cũ); (3) deactivate thì vẫn nằm trong lớp nhưng không đăng nhập được, không tính vào thống kê chuyên cần của lớp trong thời gian bị khoá? (hay vẫn tính?) – bạn chọn.
**Trả lời:**

Đồng ý với đề xuất

### D10. Giới hạn theo gói dịch vụ
Gói hiện chỉ giới hạn số thành viên.

**Đề xuất:** Không giới hạn số khoá học/lớp/bài học theo gói trong req-3.
**Trả lời:**

Đồng ý với đề xuất

### D11. Quyền xem lớp
**Đề xuất:** Owner/Admin xem & sửa mọi lớp. Teacher chỉ thấy **lớp mình phụ trách** (trong dashboard: "Lớp của tôi"). Student thấy lớp mình học (ở khu vực chính). Parent: xem D12.
**Trả lời:**

Đồng ý với đề xuất

### D12. Phụ huynh
Req-1 có liên kết Phụ huynh ↔ Học viên nhưng chưa có trang xem kết quả con.

**Đề xuất:** Để req sau. Hay bạn muốn req-3 có luôn trang Phụ huynh xem lớp, thời khoá biểu, tiến độ và độ chuyên cần của con?
**Trả lời:**

Hãy tạo luôn phần cho phụ huynh xem kết quả học tập của con.

---

## E. Giáo trình của lớp, giao bài & deadline

### E1. Giáo viên sửa giáo trình của lớp – phạm vi
"Giáo viên có toàn quyền quyết định giáo trình học của lớp … thêm, xoá phần nào trong phần giáo trình đã định nghĩa sẵn trong khoá học."

1. Giáo viên chỉ được **bỏ** mục có sẵn và **thêm lại** mục từ giáo trình khoá học, hay thêm được **bất kỳ bài học/đề** nào đã publish của tenant (kể cả bài mình vừa soạn riêng cho lớp)?
2. Được **sắp xếp lại** thứ tự không?

**Đề xuất:** (1) thêm được bất kỳ bài học/đề đã publish của tenant; (2) được sắp xếp (kéo thả).
**Trả lời:**

Đồng ý với đề xuất

### E2. "Các giáo viên phụ trách lớp sẽ thoả thuận"
Hiểu là không có quy trình duyệt trong hệ thống: **giáo viên nào của lớp cũng sửa trực tiếp**. Có cần ghi **lịch sử thay đổi** (ai thêm/xoá/đổi deadline lúc nào) để các giáo viên theo dõi không?

**Đề xuất:** Sửa trực tiếp, chống ghi đè bằng `revision` như lưu đề; có nhật ký thay đổi đơn giản (ai, lúc nào, làm gì) xem ở trang lớp. Owner/Admin cũng sửa được giáo trình lớp.
**Trả lời:**

Đồng ý với đề xuất. Lưu ý trong phần buổi học, tôi có ghi chú là có thể đưa giáo viên ngoài (lúc chưa đăng ký với lớp) vào dạy thế và đây chỉ là thông tin trong lịch học chứ giáo viên ngoài không có quyền chỉnh sửa giáo trình của lớp.

### E3. Mục đã có học viên làm thì sao?
Giáo viên xoá mục đã có học viên học/nộp bài.

**Đề xuất:** Cho xoá (ẩn khỏi học viên), bài làm vẫn giữ và không tính vào thống kê nữa; thêm lại thì hiện lại. Có cảnh báo "Đã có N học viên làm".
**Trả lời:**

Đồng ý với đề xuất

### E4. 🔴 Ý nghĩa "bài học / bài tập / bài kiểm tra / bài thi"
"Giáo viên có thể set 'bài học' nào là bài tập, bài kiểm tra hay bài thi". Cần định nghĩa từng loại khác nhau ở điểm nào. Bảng đề xuất (bạn sửa trực tiếp):

| | Bài học (lý thuyết) | Bài tập | Bài kiểm tra | Bài thi |
|---|---|---|---|---|
| Nội dung dùng được | Bài học | Bài học | Bài học hoặc Đề thi | Đề thi |
| Có giờ / giả lập thi | ✘ | ✘ | Theo nội dung (đề thi có giờ, bài học không) | ✔ (như đề thi hiện tại) |
| Bắt buộc nộp | ✘ (chỉ cần học xong) | ✔ | ✔ | ✔ |
| Có deadline | Tuỳ chọn | ✔ | ✔ | ✔ |
| Số lần làm | Không giới hạn | Không giới hạn | 1 lần | 1 lần |
| Hiện đáp án sau khi nộp | ✔ | ✔ | ✘ (hoặc sau deadline?) | ✘ |
| Tính vào bảng điểm lớp | ✘ | ✔ (lần cuối?) | ✔ | ✔ |

Các câu cần bạn chốt:
1. Bài học (không có giờ) có được đặt là **bài thi** không? Nếu có thì giờ lấy ở đâu (giáo viên nhập thời gian làm bài cho mục)?
2. Đề thi (có giờ) có được đặt là **bài tập** (làm không giới hạn giờ) không?
3. Kiểm tra/thi: giới hạn **số lần làm** do giáo viên đặt cho từng mục (1, 2, 3, không giới hạn)? Lần nào được tính (đầu/cuối/cao nhất)?
4. Có cần **khung giờ mở** (vd. kiểm tra chỉ làm được 18:00–19:30 ngày 12/10) ngoài deadline không?
5. Có cần **trọng số** cho từng mục để tính điểm tổng kết lớp không?

**Trả lời:**

1. Do bài học và bài thi tách riêng ra nên không để lẫn lộn
2. Như câu 1
3. Bài kiểm tra/bài thi cho thi 1 lần, nếu có mục thi lại thì giáo viên thêm 1 đề kiểm tra hay thi khác vào lớp học. **Quan trọng** khi thêm vào thì sẽ có các bạn pass từ lần đầu tiên và không thi ở lần sau, nên tôi nghĩ khi group bài học bài thi theo `chương` thì có tuỳ chọn group theo `chương có đề kiểm tra/thi`, học viên khi thực hiện thi trong `chương` này thì chỉ cần 1 lần đậu là đậu.
4. Không, giờ cố định
5. Tôi đang suy nghĩ, liệu có thể làm sau?

### E5. Deadline
1. Deadline đặt cho **từng mục của lớp** (mọi học viên cùng hạn). Có cần **gia hạn riêng** cho từng học viên không?
2. Có cần **ngày mở** (trước ngày này học viên chưa thấy/chưa làm được mục) không?
3. Deadline theo ngày + giờ, múi giờ của tenant/người dùng (`Asia/Ho_Chi_Minh`)?
4. Mục không có deadline thì có tính vào chuyên cần không?
5. Đổi deadline khi đã có học viên nộp muộn theo deadline cũ: tính lại theo deadline mới?

**Đề xuất:** (1) chỉ theo mục, gia hạn riêng để sau; (2) có ngày mở tuỳ chọn; (3) ngày + giờ, theo `Asia/Ho_Chi_Minh`; (4) không tính; (5) luôn tính theo deadline hiện tại (tính lại).
**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đề xuất có vẻ mâu thuẫn với câu (3) của E4, nếu mở ngày khác cho kiểm tra hay thi cùng đề thì có thể duplicate lên không nhỉ (tôi nhớ là có mục không cho duplicate). Câu này chuyển qua round 2

### E6. Nộp quá hạn
"Học viên vẫn có thể nộp bài khi quá hạn nhưng sẽ có thống kê về độ chuyên cần."

**Đề xuất:** Luôn cho nộp muộn (không có hạn chót cứng), bài được đánh dấu **"Nộp muộn"** (kèm trễ bao lâu), **không trừ điểm**. Giáo viên có cần tuỳ chọn "Không nhận bài quá hạn" cho từng mục không?
**Trả lời:**

Có thể tuỳ chỉnh cho nộp quá hạn hoặc không. Hoặc giáo viên dời deadline linh động, tôi nghĩ không có vấn đề gì trong 1 trung tâm, cân nhắc chuyển câu này sang round 2

### E7. 🔴 Cách tính "độ chuyên cần"
Đề xuất cho mỗi học viên trong 1 lớp, chỉ tính các mục **có deadline đã qua** (và mục đã nộp dù chưa tới hạn):

- **Đúng hạn**: nộp/hoàn thành trước deadline.
- **Muộn**: nộp sau deadline.
- **Chưa nộp**: quá deadline mà chưa nộp.
- **Tỉ lệ chuyên cần** = Đúng hạn / (tổng mục đã tới hạn) × 100%.

Câu cần chốt:
1. Công thức trên được không? Nộp muộn có được tính một phần (vd. 0.5) không?
2. "Nộp" nghĩa là gì cho từng loại: bài học = đã học xong (A7); bài tập/kiểm tra/thi = nộp hết các section? Bài có câu chấm tay mà chưa chấm thì vẫn tính là đã nộp?
3. Ai xem: giáo viên của lớp, Owner/Admin, **học viên tự xem** của mình?
4. Hiển thị: bảng học viên × mục (ô màu: đúng hạn / muộn / chưa nộp / chưa tới hạn) + cột tỉ lệ; có cần xuất Excel không?
5. Có ngưỡng cảnh báo (vd. < 70% tô đỏ) không?

**Trả lời:**

1. Tôi nghĩ nộp muộn sẽ được tính 1 phần
2. Miễn là nộp, giáo viên chấm sớm hay muộn thì đó là phần của giáo viên.
3. Owner/admin và giáo viên xem trong thời gian đang diễn ra khoá học. Còn học viên chỉ xem sau khi tổng kết để tránh áp lực.
4. Hãy xuất excel, đồng ý với đề xuất bảng.
5. Hãy cho ngưỡng cảnh bảo dưới X%. Cái này có thể custom không?

### E8. Bảng điểm lớp
Ngoài chuyên cần, giáo viên có cần **bảng điểm** (học viên × mục có điểm: số câu đúng / điểm chấm tay) và **điểm tổng kết** không?

**Đề xuất:** Có bảng điểm dạng xem (không có điểm tổng kết/trọng số trong req-3 trừ khi bạn chọn ở E4.5).
**Trả lời:**

Chuyển qua round 2

### E9. Bài làm trong lớp vs luyện tập tự do
Nếu đề thi vừa công khai trong tenant (A13) vừa được giao trong lớp: học viên thi đề đó ở danh sách công khai thì có tính là nộp bài cho lớp không?

**Đề xuất:** Không. Bài làm lưu kèm `class_item_id` (NULL = luyện tập tự do); chỉ bài làm mở từ trang lớp mới tính cho lớp. Một học viên học 2 lớp cùng giao 1 đề thì tính riêng từng lớp.
**Trả lời:**

Đồng ý với đề xuất

### E10. Chấm tay theo lớp
Hiện mọi Teacher chấm được mọi bài trong tenant.

**Đề xuất:** Giữ nguyên quyền; trang "Chấm bài" thêm bộ lọc theo lớp và mặc định hiện bài của **lớp mình phụ trách**. Có muốn **giới hạn** Teacher chỉ chấm bài của lớp mình (bài làm tự do vẫn ai cũng chấm) không?
**Trả lời:**

Hãy giới hạn giáo viên chỉ chấm bài của chính mình, nhưng có quyền chuyển giao chấm cho giáo viên ngoài. Phần này nếu mơ hồ hãy chuyển qua round 2

### E11. Thông báo
Chưa có dịch vụ gửi mail.

**Đề xuất:** Không gửi email/thông báo trong req-3. Học viên thấy ở trang lớp: mục mới, sắp tới hạn (≤ 2 ngày), quá hạn. Có cần thông báo trong ứng dụng (chuông) không?
**Trả lời:**

Hãy thông báo trong ứng dụng chuông.

---

## F. Giao diện học viên & giáo viên

### F1. Nơi học viên vào lớp
**Đề xuất:** Khu vực chính `/t/{slug}`: thêm mục **"Lớp của tôi"** (trên danh sách đề công khai). Trang lớp `/t/{slug}/classes/{id}`: thông tin lớp, giáo viên, thời khoá biểu (buổi sắp tới), giáo trình theo nhóm với trạng thái từng mục (chưa mở / chưa làm / đã làm / muộn / quá hạn) + deadline, tiến độ & chuyên cần của bản thân.
**Trả lời:**

### F2. Học viên thấy trước các mục chưa tới lượt không?
- (a) Thấy toàn bộ giáo trình, làm tự do theo thứ tự tuỳ ý (trừ mục chưa tới ngày mở).
- (b) Phải hoàn thành mục trước mới mở mục sau (học tuần tự).

**Đề xuất:** (a). Có cần tuỳ chọn (b) cho từng lớp không?
**Trả lời:** Tôi nghĩ cái phần này khó, tôi vừa muốn tự do cho học viên, tuy nhiên có những phần không được mở trước thời hạn. Nếu đồng ý thì chốt, còn không chuyển qua round 2

### F3. Giao diện giáo viên
**Đề xuất:** Dashboard tenant thêm "Lớp học": Owner/Admin thấy mọi lớp, Teacher thấy lớp mình. Trang chi tiết lớp có các tab: **Thông tin** · **Thời khoá biểu** · **Giáo viên & Học viên** · **Giáo trình** (kéo thả, đặt loại + deadline) · **Tiến độ & Chuyên cần** · **Bảng điểm** · **Nhật ký thay đổi**. Teacher chỉ sửa được tab Giáo trình (và xem các tab khác).
**Trả lời:**

Đồng ý với đề xuất

### F4. Giáo viên xem bài làm của học viên
Ngoài chấm tay, giáo viên có cần **xem chi tiết câu trả lời** của học viên cho câu tự chấm (đúng/sai từng câu) không? (Hiện trang chấm chỉ hiện câu chấm tay.)

**Đề xuất:** Có – trong lớp, giáo viên mở được bài làm của học viên và thấy đáp án học viên chọn + đúng/sai từng câu.
**Trả lời:**

Đồng ý với đề xuất

---

## G. Phạm vi & cách làm

### G1. Chia step
**Đề xuất:** 1 plan `req-3-plan.md` chia 2 giai đoạn: (1) Bài học – 3.1 (mẫu bài học, soạn bài, khối editor mới, màn hình học, lưu tiến độ); (2) Khoá học, giáo trình, lớp, thời khoá biểu, giao bài, deadline, chuyên cần – 3.2. Mỗi giai đoạn deploy được riêng.
**Trả lời:**

Đồng ý với đề xuất

### G2. Ngoài phạm vi req-3 (xác nhận)
**Đề xuất để sau:** điểm danh buổi học, học phí/ghi danh, tự đăng ký lớp, email/thông báo đẩy, trang phụ huynh, nhập học viên từ file, gia hạn deadline riêng từng học viên, xuất Excel, nhân bản lớp/khoá học, phân quyền theo khoá học (vd. trưởng bộ môn). Bạn muốn đưa mục nào vào req-3?
**Trả lời:**

Hãy để sau

### G3. Tài liệu `/user-manual`
Theo quy tắc hiện tại, req-3 sẽ cập nhật tài liệu JSON (bài học, khoá học, giáo trình, lớp, chuyên cần, ma trận quyền). **Đề xuất:** OK.
**Trả lời:**

Đồng ý với đề xuất
