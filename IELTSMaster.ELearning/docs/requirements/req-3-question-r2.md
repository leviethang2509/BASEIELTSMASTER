# Requirement 3 – Câu hỏi làm rõ (vòng 2)

> Nguồn: [req-3.md](req-3.md), câu trả lời vòng 1 ở [req-3-question.md](req-3-question.md).
> Cách trả lời: ghi ngay dưới dòng **Trả lời:** của từng câu. Mỗi câu đã có **Đề xuất**, nếu đồng ý chỉ cần ghi `OK`.
> Câu đánh dấu 🔴 là câu **chặn** (ảnh hưởng lớn tới thiết kế DB/kiến trúc), cần trả lời trước khi lập plan.

---

## 0. Tóm tắt những gì đã chốt ở vòng 1

| Mục | Đã chốt |
|---|---|
| Bài học vs đề thi | **Tách hẳn** (A1, A15): bảng, service, màn hình riêng; chỉ dùng chung core editor (`@lang/exam-core`, plugin Plate). Chấp nhận code lặp. Đề thi giữ nguyên hành vi |
| Mẫu bài học | Bảng riêng, hành vi giống loại đề/module (A2), có phạm vi hệ thống + tenant (A3). Module không có thời lượng. Danh mục **dùng chung** cho cả hai (đổi tên tổng quát nếu an toàn → R1) |
| Bài học | Section = tab, thêm/xoá/sắp xếp được (A4). Câu hỏi lưu server, nộp theo section thì chấm + hiện đáp án/đúng sai, làm lại không giới hạn, Speaking/Writing chờ chấm tay (A5). Màn hình đọc dạng tài liệu (A6). "Học xong" = mở hết section + nộp đủ section có câu hỏi (A7). Trạng thái + version như đề thi (A10). Có xem trước (A12) |
| Editor | Thêm heading, callout, furigana, khối gập/mở, highlight; dùng được cả trong đề thi (A8). Thêm indicator `Explanation` (A9 → R3) |
| Nhân bản | Teacher nhân bản bài học đã publish để sửa, bản sao thuộc tenant (A11 → R4) |
| Hiển thị | Tuỳ chọn "Công khai trong tenant / Chỉ qua lớp" (A13, C3 → R5) |
| Menu | "Bài học" cạnh "Đề thi"; nhóm "Đào tạo": Khoá học, Lớp học (A14) |
| Khoá học | Tên, mã, mô tả, danh mục, ảnh bìa, trình độ, số buổi dự kiến, `active/archived`; Owner/Admin CRUD, Teacher xem; có lớp thì chỉ lưu trữ; không công khai (B1–B4) |
| Giáo trình | Giáo trình tham khảo, **Khoá học m-m Giáo trình** (C1 → R6). Tạo lớp → chọn 1 giáo trình của khoá học → **sao chép** sang lớp, giáo viên tự sửa (C2). Mục = bài học hoặc đề thi (bài kiểm tra xen kẽ là đề thi có giờ + deadline) (C3). Nhóm 1 cấp theo chương (C4). Chỉ mục đã publish; đang được dùng thì chỉ lưu trữ, không xoá (C5). Teacher tạo/sửa giáo trình mình tạo, Owner/Admin sửa tất cả (C6) |
| Lớp học | Trường thông tin theo D1; `upcoming → ongoing → finished` + `cancelled`, đổi tay; lớp kết thúc **không nộp bài được** (D2). Thời khoá biểu phương án (b): lịch lặp sinh từng buổi, có giáo viên dạy thế, cảnh báo trùng lịch (đỏ) nhưng không chặn (D3 → R13–R17). Map buổi học ↔ mục giáo trình, nhiều-nhiều, chỉ tham khảo (D4). Không điểm danh (D5). Giáo viên/học viên, sĩ số, rời lớp, quyền xem theo đề xuất (D6–D11) |
| Phụ huynh | **Làm luôn** trang phụ huynh xem kết quả học tập của con (D12 → R19) |
| Giao bài | Giáo viên của lớp sửa giáo trình lớp trực tiếp, có nhật ký; giáo viên dạy thế không sửa được (E1, E2). Xoá mục đã có bài làm → ẩn, giữ bài làm (E3). Kiểm tra/thi trong lớp làm **1 lần**; thi lại = thêm đề khác (E4.3 → R7). Không có khung giờ mở riêng (E4.4). Trọng số để sau (E4.5) |
| Chuyên cần | Nộp muộn tính 1 phần; "nộp" là đủ, không cần chờ chấm; Owner/Admin/Teacher xem trong khoá, học viên chỉ xem sau tổng kết; xuất Excel; ngưỡng cảnh báo X% (E7 → R11) |
| Khác | Bài làm trong lớp tách khỏi luyện tập tự do (E9). Chuông thông báo trong ứng dụng (E11 → R18). Giáo viên xem được chi tiết bài làm của học viên (F4). Tab trang lớp theo F3. Chia 2 giai đoạn (G1). Mục G2 để sau. Cập nhật `/user-manual` (G3) |

---

## R-A. Danh mục, mẫu bài học, bài học

### R1. 🔴 Đổi tên bảng danh mục khi DB dùng chung với :3001
Bạn muốn danh mục dùng chung và đổi tên tổng quát (vd. `exam_categories` → `categories`, route `/admin/exam-categories` → `/admin/categories`). Vấn đề: dev và container :3001 **dùng chung DB**. Khi tôi chạy migration đổi tên bảng trên máy dev để test, code cũ trên :3001 sẽ lỗi (không tìm thấy bảng `exam_categories`) cho tới khi bạn push & deploy. CLAUDE.md đang có quy tắc "migration phải tương thích ngược với code đang chạy trên :3001".

- **(a)** Đổi tên đầy đủ (bảng, entity, route, component) bằng 2 bước tương thích ngược: bước 1 tạo bảng `categories` + view `exam_categories` trỏ sang (code cũ vẫn đọc/ghi được qua view đơn giản); sau khi deploy, bước 2 xoá view.
- **(b)** Đổi tên đầy đủ trong 1 migration, chấp nhận :3001 lỗi trang danh mục/loại đề/đề thi trong thời gian từ lúc chạy migration tới lúc deploy (chưa có production, DB chưa có dữ liệu thật).
- **(c)** Giữ tên bảng `exam_categories` trong DB, chỉ đổi tên trong code (`Category` entity map tới bảng `exam_categories`), route và UI ("Danh mục").

**Đề xuất:** (b) – đơn giản nhất, chỉ ảnh hưởng môi trường dev. Tôi sẽ làm việc đổi tên ở **step đầu tiên** của req-3 và báo bạn deploy ngay sau step đó. Tên mới: bảng `categories`, entity `Category`, route `/admin/categories`, `/t/:slug/categories`, menu "Danh mục".
**Trả lời:**

Máy test hiện tại chỉ có 1 mình tôi test, hãy chắc chắn là khi push lên và sau khi chạy CI/CD thì trên máy test sẽ hoạt động lại bình thường.

### R2. Tên bảng và tên menu cho mẫu bài học
**Đề xuất:**
- Bảng `lesson_blueprints` (mẫu bài học) + `lesson_modules` (phần của mẫu), cột giống `exam_blueprints`/`exam_modules` trừ thời lượng. Mã (`code`) unique riêng trong bảng mẫu bài học (mã mẫu bài học trùng mã loại đề được).
- Bài học: `lessons`, `lesson_sections`, `lesson_parts`, `lesson_questions`; lượt học: `lesson_attempts`, `lesson_attempt_sections`, `lesson_attempt_answers` (xem R21).
- Menu: "Loại đề" giữ nguyên, thêm "Mẫu bài học" (cả `/admin` và dashboard tenant), UI "phần" thay cho "module".

**Trả lời:**

Đồng ý với đề xuất

### R3. 🔴 Indicator `Explanation` (giải thích)
Bạn muốn thêm indicator `Explanation`, và "khi hiển thị ở bài thi hay bài học thì ẩn". Cần chốt:

1. **Đặt ở đâu:** ngay sau khối câu hỏi và gắn với câu đó (giải thích cho từng câu), hay đặt tự do (giải thích cho cả Part)?
2. **Khi nào hiện:**
   - Bài học: hiện sau khi học viên nộp section (cùng lúc hiện đáp án đúng – A5)?
   - Đề thi: **không bao giờ** hiện cho học viên (đề thi không hiện đáp án)? Người chấm có thấy không?
   - Xem trước trong editor: hiện sau khi bấm nộp như học viên?
3. **Bảo mật:** nội dung `Explanation` phải bị **bỏ khỏi `content_public` ở server** (như đáp án), không chỉ ẩn bằng CSS – nếu không học viên đọc được qua API. Đồng ý?

**Đề xuất:** (1) khối riêng, đặt ở bất kỳ đâu trong section (thường ngay sau câu hỏi), gắn với **dải số câu** ghi trên indicator như indicator câu hỏi (vd. "Giải thích câu 3–5"); (2) bài học hiện sau khi nộp section, đề thi không hiện cho học viên nhưng người chấm thấy, xem trước hiện sau khi nộp; (3) đồng ý bỏ ở server.
**Trả lời:**

(1) Đặt ở sau khối `Question`, nếu "bên trên" không có khối `Question` nào thì không map vào question nào cả, hãy hiển thị hướng dẫn chi tiết khi người dùng chọn indicator này.

(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất

### R4. Nhân bản (clone)
**Đề xuất:**
- Nhân bản bài học đã publish (của bất kỳ ai trong tenant) → bài học **nháp** mới, `created_by` = người nhân bản (người đó sửa được như bài của mình), tên "… (bản sao)", chép nội dung **version hiện tại**, không chép bài làm/lịch sử version.
- Media (ảnh/audio) dùng chung URL với bản gốc (không chép file trên R2). Lưu ý: hiện Thư viện media cho xoá file → xoá file ở bản gốc làm hỏng bản sao; đề xuất giữ nguyên (người dùng tự chịu), quota/đếm tham chiếu để sau.
- **Đề thi** cũng có nhân bản không (vd. để làm đề thi lại cùng cấu trúc – xem R7)? Đề xuất: có, cùng quy tắc.
- Nhân bản giáo trình (tham khảo) có cần không? Đề xuất: có.

**Trả lời:**

Đồng ý với đề xuất

### R5. 🔴 Hiển thị: công khai trong tenant / riêng tư
A13 và C3 cùng nói về một việc. Gộp thành 1 cột `visibility` cho **đề thi** và **bài học**:
- `tenant` – công khai trong tenant: hiện ở danh sách `/t/{slug}` cho mọi thành viên, làm tự do (như hiện tại).
- `private` – chỉ làm được qua lớp có giao mục đó.

Câu cần chốt:
1. Mặc định: đề thi `tenant` (giữ hành vi hiện tại), bài học `private`. Đúng không?
2. Đổi `visibility` lúc nào cũng được (kể cả khi đã có bài làm tự do)? Bài làm tự do cũ vẫn xem lại được?
3. Đề `private` vẫn thêm vào giáo trình/lớp bình thường; đề `tenant` cũng thêm được (khi đó học viên vừa làm tự do vừa làm trong lớp, tính riêng – E9). Đúng không?
4. Ai đổi: người có quyền sửa đề/bài học (Teacher đề mình, Owner/Admin mọi đề).

**Đề xuất:** Như trên.
**Trả lời:**

(1) Đúng
(2) Đúng
(3) Đúng
(4) Đúng

---

## R-B. Giáo trình tham khảo

### R6. 🔴 Khoá học m-m Giáo trình
Giáo trình trở thành **thư viện độc lập** của tenant, gắn vào nhiều khoá học.

1. Menu: "Giáo trình" riêng trong nhóm "Đào tạo" (danh sách, tạo, sửa mục). Trang khoá học có tab "Giáo trình tham khảo" để **gắn/bỏ** giáo trình có sẵn.
2. Ai gắn/bỏ giáo trình vào khoá học: chỉ Owner/Admin (người quản lý khoá học), hay Teacher cũng gắn được giáo trình mình tạo?
3. Xoá giáo trình đang gắn với khoá học: chặn, hay tự bỏ gắn? (Lớp đã sao chép thì không ảnh hưởng.)
4. Tạo lớp: bắt buộc chọn 1 giáo trình, hay cho tạo lớp với giáo trình **trống** (giáo viên tự thêm sau)? Lớp lưu lại "tạo từ giáo trình X" để tham khảo.
5. Khoá học có ghi chú riêng cho từng giáo trình gắn vào (vd. "dùng cho lớp buổi tối") không?

**Đề xuất:** (1) như trên; (2) chỉ Owner/Admin; (3) chặn, phải bỏ gắn trước; (4) cho tạo lớp trống, chọn giáo trình là tuỳ chọn; ngoài lúc tạo lớp, giáo viên có thể "Nhập từ giáo trình" (chép thêm vào cuối) bất kỳ lúc nào; (5) không.
**Trả lời:**

Đồng ý với đề xuất
---

## R-C. Kiểm tra/thi trong lớp, chương, thi lại

### R7. 🔴 Chương có đề kiểm tra/thi – "đậu 1 lần là đậu"
Bạn muốn: kiểm tra/thi trong lớp chỉ làm 1 lần; thi lại = giáo viên thêm 1 đề khác; học viên đã đậu thì không phải thi đề sau. Đề xuất mô hình:

- Mỗi mục đề thi trong giáo trình lớp có thể gắn **"Thi lại cho: [mục đề thi X]"**. Các mục gắn với nhau tạo thành **một nhóm thi** (lần 1, lần 2, lần 3…). Không gắn thì là bài kiểm tra độc lập.
- Học viên đậu ở một lần bất kỳ → **đậu nhóm thi**, các lần sau hiện "Không cần làm" (và không tính vào chuyên cần).
- Học viên chưa đậu (trượt hoặc chưa làm) → lần tiếp theo là bắt buộc.

So với "tuỳ chọn ở cấp chương" (mọi đề thi trong chương coi là các lần thi của nhau): cách gắn từng mục linh hoạt hơn khi 1 chương có cả "kiểm tra giữa chương" và "kiểm tra cuối chương".

Câu cần chốt:
1. Dùng cách gắn "Thi lại cho" ở từng mục (đề xuất) hay tuỳ chọn ở cấp chương như bạn mô tả?
2. Học viên **đã đậu** có được làm lần sau để cải thiện điểm không? (Đề xuất: không, mục hiện "Không cần làm".)
3. Lần thi lại **hiện ra** cho mọi học viên ngay khi giáo viên thêm, hay chỉ hiện với người chưa đậu? (Đề xuất: chỉ hiện với người chưa đậu; người đã đậu thấy dòng "Đã đậu ở lần 1".)
4. Kết quả nhóm thi lấy lần nào: lần đậu đầu tiên / lần cuối cùng / điểm cao nhất? (Đề xuất: lần đậu; nếu chưa đậu thì điểm cao nhất.)

**Trả lời:**
(1) Đồng ý với đề xuất
(2)(3) Tôi nghĩ nên cho những ai đã đậu thi tiếp sẽ hay hơn, vì lỡ người thi lần 2 điểm cao hơn những người đã đậu thì không công bằng vì đã biết trước đề từ trước, khi mở thi ai cũng vào thi được nhưng sẽ lấy điểm cao nhất.
(4) Cứ lấy điểm cao nhất, bất kể đậu hay rớt.

### R8. 🔴 Thế nào là "đậu"?
Hiện đề thi **chưa có điểm tổng**: câu tự chấm tính "x/y câu đúng", câu chấm tay 0–10 điểm, không có ngưỡng đậu.

1. **Cách tính điểm %** của một lượt thi: đề xuất `(số câu tự chấm đúng × 1 + tổng điểm chấm tay) / (số câu tự chấm × 1 + số câu chấm tay × 10) × 100%` – tức mỗi câu chấm tay nặng bằng 10 câu tự chấm. Có hợp lý không, hay mỗi câu (tự chấm hoặc chấm tay) có trọng số bằng nhau (câu chấm tay quy về điểm/10)?
2. **Ngưỡng đậu** đặt ở đâu: trên từng mục của lớp (giáo viên nhập, vd. 60%), trên đề thi (người soạn đặt), hay cả hai (lớp ghi đè đề)? Đề xuất: trên mục của lớp, mặc định 50%.
3. Có cần **điểm liệt theo section** (vd. JLPT: mỗi phần phải ≥ X) không? Đề xuất: không trong req-3.
4. Lượt có câu chấm tay **chưa chấm xong** → trạng thái "Chờ chấm", chưa biết đậu/trượt; lần thi lại vẫn mở cho học viên đó (nếu sau đó đậu lần 1 thì lần 2 tự thành "Không cần làm"). Đồng ý?
5. Học viên có thấy điểm %/đậu-trượt của mình ngay sau khi thi không (khác với chuyên cần chỉ xem sau tổng kết)? Đề xuất: có.

**Trả lời:**

(1) Đồng ý với đề xuất, phần định nghĩa params điểm cho mỗi hình thức kiểm tra hay thi sẽ làm sau.
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất
(4) Cứ cho học viên thi thoải mái, giáo viên nếu không chấm kịp thì lỗi giáo viên, nếu học sinh có 2 bài thì giáo viên có thể tự do chọn bài để chấm, điểm vẫn lấy cao nhất.
(5) Đồng ý với đề xuất

### R9. Mở mục theo thời gian (F2, E5.2)
Bạn muốn học viên tự do nhưng có phần không mở trước thời hạn. Đề xuất kết hợp:

- Học viên học/làm **tự do theo thứ tự tuỳ ý**.
- Mỗi mục (và mỗi chương) có **ngày mở** tuỳ chọn. Trước ngày mở: mục vẫn **hiện** trong giáo trình với nhãn "Mở lúc 18:00 12/10" nhưng không vào được. Có cần tuỳ chọn **ẩn hẳn** trước ngày mở (vd. đề thi cuối khoá) không?
- Không có chế độ "học tuần tự bắt buộc".

Về câu hỏi của bạn ở E5.2 ("mở ngày khác cho cùng đề có phải duplicate không"): ngày mở gắn với **mục của lớp**, không gắn với đề. Thi lại theo R7 là **mục khác** (thường là đề khác). C5 "không cho trùng" là trong **cùng một giáo trình**. Câu hỏi còn lại: có cho **cùng một đề** xuất hiện 2 lần trong giáo trình lớp làm lần thi lại không (học viên đã thấy đề ở lần 1)? Đề xuất: cho phép riêng với đề thi gắn "Thi lại cho", kèm cảnh báo "Học viên đã làm đề này ở lần trước".
**Trả lời:**

Đồng ý với đề xuất, cứ hiển thị mục chưa mở, chỉ là không vào được.

### R10. Nộp quá hạn & tính giờ nộp của đề thi (E6)
1. Mỗi mục có tuỳ chọn **"Nhận bài quá hạn"** (mặc định bật). Tắt thì sau deadline mục bị khoá (học viên đang làm dở đề thi vẫn được làm hết giờ section hiện tại?).
2. Giáo viên đổi deadline bất kỳ lúc nào; trạng thái đúng hạn/muộn tính lại theo deadline hiện tại (E5.5 đã chốt).
3. Với **đề thi có giờ**: đúng hạn/muộn tính theo lúc **bắt đầu** lượt thi hay lúc **nộp xong** section cuối? (Vd. deadline 20:00, bắt đầu 19:50, đề 60 phút.) Đề xuất: theo lúc **bắt đầu**; và không cho bắt đầu nếu còn ít hơn thời lượng đề khi đã tắt "Nhận bài quá hạn"? (hoặc cho bắt đầu và cắt ngang lúc deadline?)
4. Lớp chuyển `finished`: lượt đang làm dở bị chốt ngay (như hết giờ), hay cho làm nốt?
5. Kiểm tra/thi 1 lần: nếu học viên gặp sự cố (mất mạng, máy hỏng), giáo viên có được **cho làm lại** (huỷ lượt cũ) không? Đề xuất: có, giáo viên của lớp bấm "Cho làm lại", lượt cũ vẫn lưu lịch sử, có ghi nhật ký.

**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đồng ý với đề xuất
(3) Tôi nghĩ deadline là thời gian bắt đầu, miễn là học viên bắt đầu trước deadline thì vẫn cho làm cho đến khi hết giờ làm bài.
(4) Tôi nhớ là lớp finished thì không cho nộp bài, vậy thì ngắt luôn bài đang làm dở.
(5) Đồng ý với đề xuất
---

## R-D. Chuyên cần & bảng điểm

### R11. 🔴 Công thức chuyên cần
Tính cho từng học viên trong 1 lớp, trên các mục **có deadline** đã tới hạn (hoặc đã nộp):

| Trạng thái mục | Điểm chuyên cần |
|---|---|
| Đúng hạn | 1 |
| Muộn | **k** (vd. 0.5) |
| Quá hạn chưa nộp | 0 |
| Chưa tới hạn, chưa nộp | không tính |
| "Không cần làm" (đã đậu nhóm thi – R7) | không tính |
| Mục đã xoá khỏi lớp (E3) | không tính |

**Tỉ lệ chuyên cần** = tổng điểm / số mục được tính × 100%.

Câu cần chốt:
1. Hệ số **k** cố định hay tuỳ chỉnh? Muộn nhiều có giảm dần không (vd. muộn > 3 ngày = 0)? Đề xuất: k tuỳ chỉnh ở **cấp lớp** (mặc định 0.5), không giảm dần.
2. **Ngưỡng cảnh báo X%** tuỳ chỉnh ở đâu: cấp tenant (một cài đặt chung), cấp lớp, hay tenant đặt mặc định + lớp ghi đè? Đề xuất: tenant đặt mặc định (70%), lớp ghi đè được. Tenant hiện chưa có trang "Cài đặt" → thêm mục cài đặt đào tạo cho Owner/Admin.
3. "**Sau tổng kết**" học viên mới xem: tổng kết = lớp chuyển `finished`, hay giáo viên/Owner bấm **"Công bố kết quả"** riêng? Đề xuất: lúc lớp `finished`.
4. Trong khoá học, học viên vẫn thấy **trạng thái từng mục của mình** (đã nộp / chưa nộp / deadline) nhưng **không thấy** nhãn "muộn", tỉ lệ % và cảnh báo. Đồng ý?
5. Bài học (lý thuyết) có deadline cũng tính chuyên cần theo "học xong" (A7)?

**Trả lời:**

(1) đến (4) Đồng ý với đề xuất.
(5) Không cần tính chuyên cần. Đôi khi có những bài học mà học viên đã biết nên họ bỏ qua không học.

### R12. Bảng điểm lớp (E8 chuyển sang)
**Đề xuất:**
- Bảng học viên × mục: bài học hiện `% đúng` lần gần nhất (và ✔ nếu học xong), đề thi hiện `điểm %` + Đậu/Trượt/Chờ chấm; nhóm thi (R7) gộp thành 1 cột kết quả nhóm + tooltip các lần.
- Có cột trung bình theo chương, **không** có điểm tổng kết/trọng số (để sau – E4.5).
- Lọc theo chương; xuất Excel (cùng file với chuyên cần, 2 sheet).
- Ai xem: như chuyên cần (Owner/Admin/giáo viên của lớp trong khoá; học viên + phụ huynh sau tổng kết – nhưng kết quả từng bài của mình học viên vẫn xem ngay như hiện nay).

Cần thêm/bớt gì? Có cần giáo viên **nhận xét cuối khoá** cho từng học viên không?
**Trả lời:**

Đồng ý với đề xuất và hãy thêm mục nhận xét cuối khoá từ giáo viên cho từng học viên.

---

## R-E. Thời khoá biểu

### R13. 🔴 Lịch lặp
1. Mỗi lớp có **nhiều dòng lặp**, mỗi dòng: thứ trong tuần, giờ bắt đầu, giờ kết thúc, từ ngày – đến ngày (mặc định theo ngày bắt đầu/kết thúc của lớp). Có cần lặp **cách tuần** (2 tuần/lần) không? Đề xuất: không.
2. Bấm "Sinh buổi học" → tạo các buổi cụ thể. Sửa lịch lặp sau khi đã sinh: đề xuất sinh lại **các buổi tương lai chưa bị sửa tay**; buổi đã sửa tay (đổi giờ, huỷ, dạy thế) và buổi đã qua giữ nguyên.
3. Mỗi buổi: ngày, giờ bắt đầu/kết thúc, phòng/link (mặc định theo lớp), giáo viên dạy (mặc định = mọi giáo viên của lớp), trạng thái `scheduled` / `cancelled`, ghi chú. Thêm buổi lẻ (dạy bù) bằng tay được.
4. **Ngày nghỉ lễ**: có cần danh sách ngày nghỉ của tenant để tự bỏ qua khi sinh buổi không? Đề xuất: không, huỷ buổi bằng tay.
5. Múi giờ: cố định `Asia/Ho_Chi_Minh` cho mọi tenant (tenant chưa có cài đặt múi giờ). Đồng ý?
6. Ai sửa thời khoá biểu: chỉ Owner/Admin (theo yêu cầu "Owner/Admin tạo thời khoá biểu"), hay giáo viên của lớp cũng đổi giờ/huỷ buổi/xếp dạy thế được? Đề xuất: chỉ Owner/Admin.

**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất
(4) Hãy thêm mục holiday trong setting tenant và tự huỷ buổi nếu thời khoá biểu trùng ngày nghỉ.
(5) Đồng ý với đề xuất
(6) Đồng ý với đề xuất

### R14. 🔴 Giáo viên dạy thế
"Có thể đưa giáo viên ngoài (chưa đăng ký với lớp) vào dạy thế, chỉ là thông tin trong lịch học."

1. Giáo viên dạy thế phải là **thành viên tenant có role Teacher** (chọn từ danh sách), hay có thể nhập **tên tự do** (người ngoài hệ thống)? Đề xuất: thành viên có role Teacher.
2. Buổi có dạy thế: giáo viên dạy thế **thay** giáo viên chính hay **thêm vào** danh sách người dạy buổi đó? Đề xuất: danh sách giáo viên của buổi sửa tự do (bỏ người chính, thêm người thế).
3. Giáo viên dạy thế thấy buổi đó trong "Lịch dạy của tôi". Họ có được **xem** trang lớp (thông tin, học viên, giáo trình – chỉ đọc) không? Đề xuất: chỉ xem được chi tiết **buổi học** đó (lớp, giờ, phòng, danh sách học viên, các mục giáo trình map với buổi), không vào trang lớp.

**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất

### R15. Cảnh báo trùng lịch
Cảnh báo đỏ (không chặn) khi:
- Giáo viên có 2 buổi chồng giờ (ở 2 lớp, kể cả khi dạy thế).
- Học viên có 2 buổi chồng giờ (học 2 lớp trùng giờ).

Hiện ở: lúc thêm giáo viên/học viên vào lớp (liệt kê các buổi trùng), lúc sinh/sửa buổi, và nhãn đỏ trên buổi trong lịch. Có cần kiểm **trùng phòng** không? Đề xuất: không (phòng là text tự do).
**Trả lời:**

Đồng ý với đề xuất

### R16. Các màn hình lịch
Bạn mô tả: khoá học xem toàn bộ buổi học, giáo viên xem lịch dạy, học viên xem lịch học, dạng calendar hoặc list.

1. "Khoá học hiển thị toàn bộ các buổi học" = trang khoá học có lịch **gộp mọi lớp** của khoá học đó (tô màu theo lớp)? Hay ý bạn là trang **lớp** hiện mọi buổi của lớp? Đề xuất: cả hai.
2. Owner/Admin có cần **lịch tổng của cả trung tâm** (mọi lớp) không? Đề xuất: có, lọc theo khoá học/giáo viên.
3. "Lịch dạy của tôi" / "Lịch học của tôi" nằm trong từng tenant (`/t/{slug}/…`), hay gộp mọi tenant ở `/me`? Đề xuất: trong từng tenant.
4. Dạng calendar: xem theo **tuần** và **tháng**; list: nhóm theo ngày. Mặc định mở tuần hiện tại.
5. Phụ huynh xem lịch học của con (R19)?

**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất
(4) Đồng ý với đề xuất
(5) Cho phép phụ huynh xem lịch học của con trong tenant, lọc theo "con" nếu phụ huynh có nhiều con.

### R17. Map buổi học ↔ mục giáo trình (D4)
**Đề xuất:** Map trên **giáo trình của lớp** (không phải giáo trình tham khảo). Chọn được cả **chương** (map cả chương vào buổi) hoặc từng **mục**. Giáo viên của lớp và Owner/Admin chỉnh. Học viên thấy ở mỗi buổi "Nội dung buổi này: …" và ở mỗi mục "Học ở buổi: …". Mục bị xoá khỏi lớp thì bỏ map.
**Trả lời:**

Đồng ý với đề xuất

---

## R-F. Chuông thông báo

### R18. 🔴 Thông báo trong ứng dụng
1. **Sự kiện** nào cần thông báo (chọn/bổ sung):
   - Học viên: được thêm vào lớp; mục mới được giao / mục vừa mở (ngày mở); deadline còn 24 giờ; quá hạn; bài đã chấm xong; buổi học bị huỷ/đổi giờ; lần thi lại mới (R7).
   - Giáo viên: được thêm vào lớp / được xếp dạy thế; có bài mới cần chấm; được chuyển giao chấm bài (R20); giáo viên khác sửa giáo trình lớp.
   - Phụ huynh: con quá hạn; con có kết quả bài mới; chuyên cần của con dưới ngưỡng (sau tổng kết hay trong khoá?).
   - Owner/Admin: (hiện có) tenant chờ duyệt…?
2. **Chuông** ở header: gộp **mọi tenant** của người dùng (mỗi thông báo ghi tên trung tâm), hay chỉ tenant đang xem? Đề xuất: gộp mọi tenant.
3. Cập nhật: **gọi lại mỗi 60 giây** + khi quay lại tab (đơn giản, không cần WebSocket/SSE). Đồng ý?
4. Đánh dấu đã đọc từng cái / đọc tất cả; giữ **90 ngày** rồi tự xoá; có trang "Tất cả thông báo". Người dùng có cần **tắt** loại thông báo nào không? Đề xuất: không.
5. Thông báo "sắp hết hạn"/"quá hạn" sinh bằng cron (mỗi 15 phút). Đồng ý?

**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất
(4) Đồng ý với đề xuất
(5) Đồng ý với đề xuất

---

## R-G. Phụ huynh

### R19. 🔴 Trang phụ huynh
Phụ huynh liên kết với học viên qua `student_guardians` (Owner/Admin gắn ở trang Thành viên).

1. Phụ huynh xem được: danh sách lớp của con, lịch học, giáo trình + trạng thái từng mục, kết quả từng bài (như học viên thấy: số câu đúng, điểm, nhận xét chấm tay – không xem đáp án), chuyên cần + bảng điểm (theo quy tắc R11.3: chỉ sau tổng kết?). Cần thêm/bớt?
2. Phụ huynh có xem được **nội dung bài học/đề** không? Đề xuất: không, chỉ tên + kết quả.
3. Có xem **bài làm tự do** (ngoài lớp) của con không? Đề xuất: có (lịch sử lượt làm + kết quả).
4. Vị trí: khu vực chính `/t/{slug}` mục **"Con của tôi"** (chọn con nếu có nhiều) → trang tổng quan con. Người vừa là Student vừa là Parent thấy cả hai mục.
5. Phụ huynh có được nhắn tin/liên hệ giáo viên không? Đề xuất: không (để sau).

**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất
(4) Đồng ý với đề xuất
(5) Đồng ý với đề xuất

---

## R-H. Chấm bài

### R20. 🔴 Quyền chấm tay & chuyển giao
Bạn viết "giới hạn giáo viên chỉ chấm bài của chính mình, nhưng có quyền chuyển giao chấm cho giáo viên ngoài". Tôi hiểu "bài của chính mình" có thể là:
- **(a)** Bài làm trong **lớp mình phụ trách**, hoặc
- **(b)** Bài làm **đề/bài học do mình soạn**.

Đề xuất mô hình:
1. **Bài làm trong lớp** (có `class_item_id`): người chấm = mọi giáo viên của lớp. Giáo viên của lớp có thể **chuyển giao** chấm một mục (hoặc từng bài làm) cho một Teacher khác của tenant (không cần là giáo viên lớp); người được chuyển giao chỉ thấy đúng các bài đó. Chuyển giao xong giáo viên lớp **vẫn** chấm được hay mất quyền? (Đề xuất: vẫn chấm được.)
2. **Bài làm tự do** (ngoài lớp): người chấm = **người soạn đề/bài học** (b); người soạn cũng chuyển giao được.
3. Owner/Admin chấm được mọi bài (như hiện tại). Không ai chấm bài của chính mình (như hiện tại).
4. Câu Speaking/Writing trong **bài học** (A5) chấm ở cùng trang "Chấm bài" (lọc Đề thi | Bài học). Đồng ý?
5. Học viên nộp lại bài học (làm lại không giới hạn – A5): câu chấm tay của lần trước đã chấm thì sao? Đề xuất: mỗi lần nộp lại tạo lượt mới cần chấm lại; trang chấm chỉ hiện **lượt mới nhất** của mỗi học viên cho mỗi bài học, lượt cũ chưa chấm tự bỏ khỏi hàng chờ.

**Trả lời:**

(1) Đồng ý với đề xuất
(2) Đồng ý với đề xuất
(3) Đồng ý với đề xuất
(4) Đồng ý với đề xuất
(5) Đồng ý với đề xuất

---

## R-I. Chi tiết kỹ thuật cần bạn xác nhận

### R21. Lượt học bài học
Bài học làm lại không giới hạn, "lưu lần gần nhất + đếm số lần" (A5). Đề xuất: mỗi học viên có **1 lượt học đang dùng** cho mỗi (bài học, lớp hoặc tự do); nộp section → chấm, lưu kết quả + tăng số lần; "Làm lại" section → xoá câu trả lời section đó, giữ kết quả lần nộp gần nhất cho tới khi nộp lần mới. Không lưu lịch sử từng lần (chỉ số lần + lần gần nhất). Có cần lưu **lần đầu tiên** (để biết học viên hiểu bài ngay từ đầu không) không?
**Trả lời:**

Không cần lưu lần đầu tiên

### R22. F1 – Nơi học viên vào lớp (chưa có câu trả lời ở vòng 1)
**Đề xuất (nhắc lại):** Khu vực chính `/t/{slug}`: thêm mục **"Lớp của tôi"** phía trên danh sách đề công khai. Trang lớp `/t/{slug}/classes/{id}`: thông tin lớp, giáo viên, buổi học sắp tới, giáo trình theo chương với trạng thái từng mục + deadline + ngày mở, kết quả của mình; chuyên cần/bảng điểm chỉ hiện sau tổng kết (R11). Thêm "Lịch học của tôi" (R16).
**Trả lời:**

Đồng ý với đề xuất

### R23. Thứ tự giai đoạn (cập nhật G1)
Phạm vi đã lớn hơn vòng 1 (phụ huynh, chuông thông báo, lịch, chấm theo lớp). **Đề xuất** chia 3 giai đoạn, mỗi giai đoạn deploy riêng:
1. **Bài học:** đổi tên danh mục (R1), mẫu bài học, soạn bài học + khối editor mới + `Explanation`, nhân bản, `visibility`, màn hình học, lượt học, chấm tay bài học.
2. **Khoá học & lớp:** khoá học, giáo trình tham khảo (m-m), lớp, học viên/giáo viên, giáo trình lớp (chương, ngày mở, deadline, thi lại, nhận bài quá hạn), thời khoá biểu + dạy thế + trùng lịch + map buổi, trang học viên, quyền chấm theo lớp + chuyển giao.
3. **Theo dõi:** chuyên cần, bảng điểm, xuất Excel, cài đặt ngưỡng, chuông thông báo, trang phụ huynh.

**Trả lời:**

Đồng ý với đề xuất
