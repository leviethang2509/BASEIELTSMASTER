# Requirement 3 – Kế hoạch implement

> Nguồn: [req-3.md](req-3.md) và câu trả lời ở [vòng 1](req-3-question.md), [vòng 2](req-3-question-r2.md), [vòng 3](req-3-question-r3.md), [vòng 4](req-3-question-r4.md). Mã câu hỏi (A1, R7, T2, U3, V1…) ghi kèm để tra lý do.
> Tiến độ: [req-3-progress.md](req-3-progress.md).

---

## 1. Quyết định đã chốt

### 1.1 Bài học (3.1)
| Mục | Quyết định |
|---|---|
| Tách bạch | Bài học **tách hẳn** đề thi: bảng, service, controller, màn hình riêng; chỉ dùng chung `@lang/exam-core` + plugin Plate. Chấp nhận code lặp. Hành vi đề thi giữ nguyên (A1, A15) |
| Danh mục | Dùng chung cho đề thi và bài học, **đổi tên** `exam_categories` → `categories` trong 1 migration (A2, R1, U7.2) |
| Mẫu bài học | `lesson_blueprints` + `lesson_modules`, giống loại đề/module nhưng **không có thời lượng**; phạm vi hệ thống + tenant; menu "Mẫu bài học", UI gọi module là "phần" (A2, A3, R2) |
| Cấu trúc | Section = tab (từ phần của mẫu), thêm/xoá/đổi tên/sắp xếp; Part/Subpart như đề thi (A4) |
| Trạng thái/version | `draft → published → archived`, version + `content_revision` như đề thi (A10) |
| Quyền | Như đề thi: Owner/Admin mọi bài, Teacher bài mình tạo; Teacher xem/dùng mọi bài đã publish (A11) |
| Nhân bản | Bài học, **đề thi** và giáo trình đã publish/có sẵn → bản nháp mới của người nhân bản, chép version hiện tại, media dùng chung URL (A11, R4) |
| Hiển thị | Cột `visibility`: `tenant` (danh sách công khai `/t/{slug}`, làm tự do) / `private` (chỉ qua lớp). Mặc định đề thi `tenant`, bài học `private`; đổi lúc nào cũng được; người sửa được đề/bài thì đổi được (A13, C3, R5) |
| Học bài | Màn hình dạng tài liệu, tab section, không đồng hồ/lưới câu. Nộp theo section → chấm, **hiện đáp án đúng + đúng/sai + giải thích**; làm lại không giới hạn, chỉ lưu lần gần nhất + số lần; Speaking/Writing chờ chấm tay (A5, A6, R21) |
| Học xong | Mở hết section + nộp đủ section có câu hỏi (A7) |
| Editor | Thêm heading H1–H3, callout (Lưu ý/Ví dụ/Mẹo), furigana (ruby), khối gập/mở, highlight – dùng cả trong đề thi (A8) |
| Giải thích | Indicator `explanation` đặt sau khối câu hỏi, gắn với câu gần nhất phía trên (không có thì không gắn câu nào). **Bỏ khỏi `content_public` ở server**. Bài học: hiện sau khi nộp section. Đề thi: học viên không bao giờ thấy, người chấm thấy. Xem trước: hiện sau khi nộp. Dialog chọn indicator có hướng dẫn chi tiết (A9, R3) |
| Xem trước | Như đề thi, chấm ở client, không lưu (A12) |

### 1.2 Khoá học, giáo trình, lớp (3.2)
| Mục | Quyết định |
|---|---|
| Khoá học | Tên, mã, mô tả, danh mục, ảnh bìa, trình độ, số buổi dự kiến, `active/archived`. Owner/Admin CRUD, Teacher xem. Có lớp → chỉ lưu trữ. Không công khai (B1–B4) |
| Giáo trình | Thư viện độc lập của tenant, **Khoá học m-m Giáo trình**. Owner/Admin gắn/bỏ giáo trình vào khoá học; xoá giáo trình đang gắn → chặn. Teacher tạo/sửa giáo trình mình tạo, Owner/Admin sửa tất cả (C1, C6, R6) |
| Mục giáo trình | Bài học hoặc đề thi đã publish; nhóm **1 cấp theo chương**; không trùng trong 1 giáo trình; đang được dùng thì bài/đề chỉ lưu trữ, không xoá (C3–C5) |
| Lớp | Tạo từ khoá học, chọn (tuỳ chọn) 1 giáo trình tham khảo → **sao chép**; "Nhập từ giáo trình" bất kỳ lúc nào. Trường: mã, tên, mô tả, ngày bắt đầu, số buổi, ngày kết thúc (tự tính), sĩ số tối đa, phòng/link, trạng thái `upcoming → ongoing → finished` + `cancelled`, đổi tay, `finished → ongoing` được (D1, D2, R6, U1, T6) |
| Thành viên lớp | Giáo viên = thành viên có role Teacher, không phân cấp. Học viên = role Student, chọn từ thành viên. Chỉ Owner/Admin thêm/xoá. Sĩ số đủ → chặn (khoá dòng lớp); xoá học viên = xoá mềm, giữ bài làm; học nhiều lớp được (D6–D9) |
| Quyền xem | Owner/Admin mọi lớp; Teacher lớp mình phụ trách; Student lớp mình học; Parent lớp của con (D11, R19) |
| Giáo trình lớp | Giáo viên của lớp (và Owner/Admin) sửa trực tiếp: thêm bất kỳ bài/đề đã publish, xoá (ẩn, giữ bài làm), sắp xếp; chống ghi đè bằng `revision`; nhật ký thay đổi. Giáo viên dạy thế không sửa (E1–E3) |
| Nhãn mục | Bài học: `Bài học`/`Bài tập`; đề thi: `Bài kiểm tra`/`Bài thi`. Chỉ để hiển thị/lọc (T1) |
| Ngày mở/deadline | Mục và chương có **ngày mở** tuỳ chọn (trước đó hiện nhưng không vào được). Deadline theo mục. Bài học: deadline chỉ để nhắc. Đề thi: deadline = **hạn bắt đầu** (bắt đầu trước hạn thì làm hết giờ), tuỳ chọn "Nhận bài quá hạn" (mặc định bật). Đổi deadline → tính lại (E5, R9, R10, T1) |
| Kiểm tra/thi | Mỗi mục đề thi làm **1 lần**; giáo viên "Cho làm lại" khi sự cố (lượt cũ giữ lịch sử). Thi lại = mục khác gắn "Thi lại cho: X" (được dùng lại cùng đề, có cảnh báo) → **nhóm thi**. Mọi học viên thi được mọi lần, kết quả nhóm = **điểm cao nhất** trong các lượt đã chấm xong. Đậu nhóm = có ≥ 1 lượt đạt ngưỡng của mục đó. Lần thi lại **bắt buộc** với người chưa đậu, **không bắt buộc** với người đã đậu (E4.3, R7, R9, R10.5, T2, T3) |
| Điểm % | `(câu tự chấm đúng + tổng điểm chấm tay) / (số câu tự chấm + số câu chấm tay × 10) × 100`. Ngưỡng đậu trên mục của lớp, mặc định 50%. Lượt có câu chưa chấm → "Chờ chấm", không chặn thi lần sau. Học viên thấy điểm/đậu ngay (R8) |
| Lớp kết thúc | Chốt ngay mọi lượt làm dở (có xác nhận), không nộp bài học/đề thi được nữa; mở lại thì lượt đã chốt không mở lại (D2, R10.4, T6) |
| Bài làm trong lớp | Tách khỏi luyện tập tự do (`class_item_id`), 2 lớp giao cùng đề tính riêng (E9) |

### 1.3 Thời khoá biểu
| Mục | Quyết định |
|---|---|
| Lịch lặp | Ngày bắt đầu + **tổng số buổi** (mặc định số buổi dự kiến của khoá học) + các ô lặp trong tuần (thứ, giờ bắt đầu–kết thúc). Buổi thứ N = ô lặp thứ N bỏ qua ngày nghỉ; lấy giờ của ô; ngày kết thúc lớp tự tính (U1) |
| Dời lịch | Thêm/xoá/sửa ngày nghỉ hoặc sửa lịch lặp → **tính lại ngày các buổi tương lai**. Đi theo buổi: nội dung map, ghi chú, phòng/link, giáo viên dạy thế (kèm cảnh báo + chuông). Giờ sửa tay bị bỏ khi buổi đổi ngày. Buổi đã qua, buổi bù, lớp `finished/cancelled` không dời. Xác nhận liệt kê lớp bị ảnh hưởng, 1 thông báo gộp mỗi lớp (U2, U3, U5) |
| Huỷ buổi | Buổi giữ số, `cancelled` + lý do, các buổi sau không dời; khôi phục được nếu chưa diễn ra. Nội dung map giữ nguyên + cảnh báo. Dạy bù = **buổi bù** thêm tay (ngày cố định, map nội dung được, "Bù cho Buổi N") (U3, V1) |
| Ai sửa | Owner/Admin: lịch lặp, số buổi, ngày bắt đầu. Giáo viên của lớp + Owner/Admin: huỷ/khôi phục buổi, buổi bù, map nội dung, phòng/ghi chú/giáo viên của buổi (R13.6, V1.5) |
| Dạy thế | Chọn thành viên role Teacher; danh sách giáo viên của buổi sửa tự do. Giáo viên dạy thế chỉ xem chi tiết buổi đó (lớp, giờ, phòng, học viên, nội dung map) (R14) |
| Ngày nghỉ | Cài đặt tenant (Owner/Admin): tên, từ ngày–đến ngày, không lặp hằng năm; hiện trên lịch màu xám. Lớp có tuỳ chọn "Áp dụng ngày nghỉ của trung tâm" (mặc định bật) (T4, U5, U6) |
| Trùng lịch | Cảnh báo đỏ, không chặn: giáo viên hoặc học viên có 2 buổi chồng giờ. Hiện khi thêm người vào lớp, khi sinh/sửa buổi, và trên lịch. Không kiểm phòng (D3, R15) |
| Map nội dung | Buổi ↔ mục/chương của giáo trình lớp, nhiều–nhiều, chỉ tham khảo (D4, R17) |
| Lịch | Dạng tuần/tháng + danh sách: lịch lớp, lịch khoá học (gộp lớp), lịch trung tâm (Owner/Admin, lọc khoá học/giáo viên), "Lịch dạy của tôi", "Lịch học của tôi", lịch của con (phụ huynh, lọc theo con). Trong từng tenant (R16) |
| Múi giờ | Cố định `Asia/Ho_Chi_Minh` (R13.5) |
| Điểm danh | Không (D5) |

### 1.4 Theo dõi
| Mục | Quyết định |
|---|---|
| Chuyên cần | Chỉ **mục đề thi có deadline** (bài học không tính). Đúng hạn = 1, muộn = **k**, quá hạn chưa làm = 0; không tính: chưa tới hạn chưa làm, lượt đang làm dở, mục đã xoá, lần thi lại không bắt buộc. Tỉ lệ = tổng / số mục tính. "Đã làm" = đã nộp (không chờ chấm) (R11, T1, T2). **Chốt Step 11:** mốc đúng hạn/muộn tính theo **lúc bắt đầu** lượt (deadline là hạn bắt đầu theo R10.3 nên vào thi trước hạn rồi làm hết giờ không bị tính muộn) |
| Tham số | k (mặc định 0.5) và ngưỡng cảnh báo X% (mặc định 70) đặt ở cài đặt tenant, lớp ghi đè được bằng `classrooms.late_weight`/`warning_threshold` (R11.1–2). **Chốt Step 11:** sửa tham số của lớp ngay trong tab "Tiến độ & Chuyên cần" (lưu qua PATCH lớp, chỉ Owner/Admin; giáo viên chỉ xem) |
| Ai xem | Owner/Admin/giáo viên của lớp: mọi lúc. Học viên, phụ huynh: tỉ lệ chuyên cần, bảng điểm, nhận xét cuối khoá **chỉ khi lớp `finished`**; trong khoá chỉ thấy trạng thái từng mục (đã nộp/chưa/deadline), không thấy nhãn "muộn" (E7.3, R11.3–4) |
| Bảng điểm | Học viên × mục: bài học `% đúng` **chỉ trên câu tự chấm** của lần nộp gần nhất (chốt Step 11: câu chấm tay của bài học thường chưa chấm) + ✔ học xong; đề thi điểm % + Đậu/Trượt/Chờ chấm; nhóm thi gộp 1 cột; trung bình theo chương; lọc chương. Không trọng số/điểm tổng kết (R12, E4.5) |
| Nhận xét cuối khoá | 1 nhận xét/học viên/lớp (cột `classroom_students.final_comment*`, không bảng riêng – theo mục 4.5), giáo viên của lớp hoặc Owner/Admin viết khi lớp `ongoing`/`finished`; học viên/phụ huynh thấy khi `finished` (T5) |
| Excel | 1 file, 2 sheet: Chuyên cần, Bảng điểm (có cột Nhận xét) (E7.4, R12, T5) |
| Chấm tay | Bài trong lớp: giáo viên của lớp. Bài tự do: người soạn đề/bài học. Owner/Admin: mọi bài. Chuyển giao chấm (mục hoặc từng lượt) cho Teacher khác, người giao vẫn chấm được. Không chấm bài của mình. Bài học chấm ở cùng trang "Chấm bài". Bài học nộp lại → chỉ lượt mới nhất cần chấm (R20, T3.2) |
| Thông báo | Chuông ở header, gộp mọi tenant, gọi lại mỗi 60 giây + khi quay lại tab, đọc từng cái/tất cả, trang "Tất cả thông báo", giữ 90 ngày, không tắt được; cron 15 phút cho sắp hết hạn/quá hạn (E11, R18) | **Chốt Step 12:** "có bài mới cần chấm" chỉ gửi cho người có **quyền chấm gốc** (giáo viên của lớp với bài trong lớp, người soạn đề/bài với bài tự do), không gửi Owner/Admin hay người được chuyển giao; **không** làm thông báo cấp hệ thống (tenant chờ duyệt…); 3 loại thông báo cho phụ huynh dời sang Step 13 cùng trang "Con của tôi" |
| Phụ huynh | "Con của tôi" ở `/t/{slug}`: lớp, lịch, giáo trình + trạng thái mục, kết quả từng bài (không đáp án), bài làm tự do; chuyên cần/bảng điểm/nhận xét sau tổng kết. Không xem nội dung bài/đề, không nhắn tin (D12, R19). **Chốt Step 13:** "nhận xét chấm tay" hiện **inline** dưới mỗi lượt (tên phần · số câu · điểm · nhận xét), không có trang chi tiết lượt riêng; route `children/*` chỉ mở cho role **Phụ huynh** (Owner/Admin/Teacher xem học viên ở dashboard lớp); "con có kết quả bài mới" gửi **mọi lúc** lượt thành đã chấm xong (kể cả đề/bài không có câu chấm tay – báo ngay khi nộp); "chuyên cần con dưới ngưỡng" gửi khi lớp chuyển **Đã kết thúc** |

### 1.5 Hạ tầng
| Mục | Quyết định |
|---|---|
| DB dev | Máy dev dùng Postgres local `lang_simulator_dev` (đã làm 2026-09-19); DB VPS chỉ container :3001 dùng, đổi khi deploy → migration đổi tên/xoá làm trong 1 bước (R1, U7) |
| R2 | Giữ chung bucket với :3001 (U7.4) |
| Giai đoạn | 3 giai đoạn deploy riêng: Bài học → Khoá học & lớp → Theo dõi (G1, R23) |
| Ngoài phạm vi | Điểm danh, học phí/ghi danh, tự đăng ký lớp, email/thông báo đẩy, nhập học viên từ file, gia hạn deadline riêng, nhân bản lớp/khoá học, phân quyền theo khoá học, trọng số điểm, tham số điểm theo hình thức thi, điểm liệt theo section, deadline theo buổi (G2, E4.5, R8.1, R8.3, U4b) |

---

## 2. Giả định kỹ thuật (bạn xem lại, không đồng ý thì ghi chú)

1. **Múi giờ** `+07:00` cố định (Việt Nam không có giờ mùa hè): hằng số `TRAINING_UTC_OFFSET` trong `@lang/shared`; ngày/giờ buổi học tính từ đó, lưu `timestamptz`. Không thêm thư viện múi giờ.
2. **Lượt học bài học gắn version**: bài học có version mới thì học viên mở bài bắt đầu lượt mới trên version mới; trạng thái "học xong" của mục lớp lấy từ **bất kỳ** lượt đã học xong (không mất khi bài học đổi version).
3. **Lớp `upcoming`**: học viên thấy lớp, lịch, giáo trình nhưng **chưa vào được** mục nào; chỉ `ongoing` mới học/làm bài. `cancelled`: chỉ xem như `finished`, không có chuyên cần/bảng điểm cho học viên.
4. **Xoá lớp**: chỉ khi chưa có bài làm nào trong lớp (xoá hẳn); có rồi thì chỉ chuyển `cancelled`.
5. **Chương tuỳ chọn**: mục không thuộc chương nào hiện ở đầu giáo trình ("Chưa xếp chương").
6. **Giảm số buổi**: xoá các buổi thường cuối dãy (chưa diễn ra) kèm map nội dung của chúng, hộp xác nhận liệt kê buổi có map; không cho giảm dưới số buổi đã diễn ra.
7. **Thi lại**: mục "Thi lại cho X" phải đứng sau X trong giáo trình lớp; X là mục gốc (không phải mục thi lại khác) – nhóm là gốc + các lần thi lại, thứ tự lần theo vị trí.
8. **"Cho làm lại"** đánh dấu lượt cũ `voided` (không tính điểm, chuyên cần, nhóm thi), học viên làm lượt mới cho cùng mục.
9. **Trung bình chương** = trung bình điểm % các nhóm thi (đã có điểm) trong chương; bài học không tính.
10. **Chấm bài tự do đã có** (req-1): sau Step 10, Teacher chỉ thấy bài tự do của đề/bài học **mình soạn** (hoặc được chuyển giao) – đổi hành vi hiện tại theo R20.2.
11. **Nội dung thông báo** lưu `type` + `params`, chữ dựng ở client từ `vi.notifications` (đổi câu chữ không cần migration).
12. **Lịch** tự viết bằng CSS grid (tuần/tháng/danh sách), không thêm thư viện calendar.
13. **Excel** dùng `exceljs` (thư viện thuần JS, không build script), tạo file ở server (`GET …/export.xlsx`).
14. **Giải thích** lưu ở cột `explanations jsonb` của section (`[{ nodeId, numbers, blocks }]`); `content_public` giữ indicator `explanation` rỗng làm chỗ chèn.
15. **Nhận xét cuối khoá, chuyên cần của học viên đã xoá khỏi lớp**: không hiện ở bảng (có bộ lọc "Hiện học viên đã rời lớp").
16. **Học viên có membership bị deactivate** vẫn nằm trong lớp và vẫn tính chuyên cần (D9.3 để người dùng chọn nhưng chưa trả lời riêng → mặc định vẫn tính; bảng có nhãn "Đã ngừng").

---

## 3. Việc bạn cần chuẩn bị

| # | Việc | Cần trước |
|---|---|---|
| P1 | ✅ DB local `lang_simulator_dev` + seed System Owner (2026-09-19) | Step 1 |
| P2 | Deploy ngay sau Step 1 (đổi tên danh mục) để :3001 chạy code mới | Step 2 |
| P3 | Không có env mới dự kiến. Nếu phát sinh, tôi báo để cập nhật `/opt/lang-simulator/.env` | — |

---

## 4. Thiết kế dữ liệu

> Quy ước như req-1: PK uuid, snake_case, `created_at/updated_at`, enum = `varchar` + `@Check`, FK tên tường minh. Chỉ ghi cột chính.

### 4.1 Danh mục (đổi tên – Step 1)
```
exam_categories → categories   (đổi tên bảng, PK/FK/index/check/unique đổi tên theo)
exam_blueprints.category_id    FK → categories
```

### 4.2 Mẫu bài học & bài học
```
lesson_blueprints   tenant_id NULL, category_id FK categories, name, code, description, is_active, created_by, updated_by
                    UNIQUE(code) where tenant_id is null; UNIQUE(tenant_id, code) where tenant_id is not null
lesson_modules      blueprint_id FK CASCADE, name, code, sort_order, description

lessons             tenant_id, blueprint_id FK (NO ACTION), title, description,
                    status (draft/published/archived), visibility (tenant/private, default private),
                    current_version, content_revision, published_at, cloned_from_id NULL,
                    created_by, updated_by, deleted_at
lesson_sections     lesson_id, version, status (active/deactivated), module_id NULL (không FK), name, sort_order,
                    raw_data, content_public, explanations jsonb, question_count, created_by
lesson_parts        section_id CASCADE, parent_part_id, kind, node_id, sort_order, first_number, last_number
lesson_questions    section_id CASCADE, part_id, number, node_id, sub_index, qtype, grading, answer_key,
                    options, params, max_score      UNIQUE(section_id, number)

exams               + visibility (default tenant), + cloned_from_id NULL
exam_sections       + explanations jsonb NULL
```

### 4.3 Lượt học bài học
```
lesson_attempts          tenant_id, lesson_id, lesson_version, user_id, membership_id,
                         class_item_id NULL, status (in_progress/completed), started_at, completed_at NULL
                         UNIQUE(lesson_id, lesson_version, user_id) where class_item_id is null
                         UNIQUE(lesson_id, lesson_version, user_id, class_item_id) where class_item_id is not null
lesson_attempt_sections  attempt_id CASCADE, section_id, sort_order, viewed_at NULL, responses jsonb,
                         submitted_at NULL, submit_count, correct NULL, total NULL,
                         manual_count, manual_graded_count
lesson_attempt_answers   attempt_id, attempt_section_id CASCADE, question_id, response, is_correct, score,
                         comment, recording_key, graded_by, graded_at   UNIQUE(attempt_section_id, question_id)
```
- Nộp section: chấm bằng `gradeSection` (dùng chung logic `attempt-grading.ts`, chép sang `lessons/`), **xoá và tạo lại** `lesson_attempt_answers` của section (bản chấm tay cũ bỏ – R20.5), `submit_count + 1`.
- `completed_at` đặt khi mọi section đã `viewed_at` và section có câu hỏi đã `submitted_at` (A7).
- Ghi âm: bucket private, prefix `tenants/{tenantId}/lesson-attempts/{attemptId}/`.

### 4.4 Khoá học & giáo trình
```
courses             tenant_id, code, name, description, category_id NULL, cover_url, level varchar(50),
                    planned_sessions int NULL, status (active/archived), created_by, updated_by
                    UNIQUE(tenant_id, code)   (mã in hoa theo CATALOG_CODE_PATTERN, CHECK định dạng)
curricula           tenant_id, name, description, revision int (baseRevision của PUT items),
                    cloned_from_id NULL, created_by, updated_by
course_curricula    course_id, curriculum_id, created_by, created_at     PK(course_id, curriculum_id)
curriculum_groups   curriculum_id CASCADE, title, sort_order
curriculum_items    curriculum_id CASCADE, group_id NULL (SET NULL), sort_order,
                    item_type (lesson/exam), lesson_id NULL, exam_id NULL, title NULL (ghi đè tên),
                    label (lesson/homework | quiz/final), note
                    CHECK đúng 1 trong lesson_id/exam_id; UNIQUE(curriculum_id, lesson_id), UNIQUE(curriculum_id, exam_id)
```

### 4.5 Lớp học & giáo trình lớp
```
classrooms          tenant_id, course_id FK, code, name, description, start_date date, planned_sessions int,
                    end_date date NULL (tự tính), max_students NULL, location, status
                    (upcoming/ongoing/finished/cancelled), apply_tenant_holidays bool default true,
                    source_curriculum_id NULL, late_weight numeric(3,2) NULL, warning_threshold int NULL,
                    curriculum_revision int, created_by, updated_by
                    UNIQUE(tenant_id, lower(code))
classroom_teachers  classroom_id CASCADE, membership_id, added_by, created_at     PK(classroom_id, membership_id)
classroom_students  classroom_id CASCADE, membership_id, joined_at, removed_at NULL, added_by,
                    final_comment text NULL, final_comment_by NULL, final_comment_at NULL
                    UNIQUE(classroom_id, membership_id)
class_groups        classroom_id CASCADE, title, sort_order, opens_at NULL
class_items         classroom_id CASCADE, group_id NULL, sort_order, item_type, lesson_id NULL, exam_id NULL,
                    title NULL, label, note, opens_at NULL, deadline_at NULL,
                    accept_late bool default true, pass_threshold int default 50,
                    retake_of_item_id NULL (FK class_items), removed_at NULL
class_change_logs   classroom_id CASCADE, actor_user_id, action, detail jsonb, created_at

exam_attempts       + class_item_id NULL, + voided_at NULL, + voided_by NULL
                    UQ_exam_attempts_in_progress → 2 index một phần: (exam_id, user_id) khi class_item_id null,
                    (class_item_id, user_id) khi not null (status in_progress)
```
- Trùng đề/bài trong 1 lớp: service chặn, trừ mục có `retake_of_item_id` (R9).
- Một mục đề thi: tối đa 1 lượt không `voided` mỗi học viên.

### 4.6 Thời khoá biểu & ngày nghỉ
```
tenants                   + late_weight numeric(3,2) default 0.5, + warning_threshold int default 70
tenant_holidays           tenant_id, name, start_date, end_date, created_by
class_schedule_slots      classroom_id CASCADE, weekday (1=T2..7=CN), start_time, end_time
class_sessions            classroom_id CASCADE, kind (regular/makeup), seq int NULL (regular),
                          starts_at, ends_at, time_overridden bool, location NULL, note,
                          status (scheduled/cancelled), cancel_reason, makeup_for_session_id NULL,
                          custom_teachers bool, moved_warning bool, created_by
                          UNIQUE(classroom_id, seq) where kind = regular
class_session_teachers    session_id CASCADE, membership_id      PK(session_id, membership_id)
class_session_links       session_id CASCADE, class_item_id NULL, class_group_id NULL (đúng 1)
```
**Thuật toán tính lại lịch** (`recomputeSchedule(classroomId)`, trong transaction khoá dòng lớp; chạy khi sửa lịch lặp/số buổi/ngày bắt đầu, khi thêm/sửa/xoá ngày nghỉ, khi bật/tắt "Áp dụng ngày nghỉ"):
```
nếu lớp finished/cancelled → bỏ qua
cutoff = now; buổi thường đã bắt đầu (starts_at <= cutoff) giữ nguyên, p = số buổi đó
ô trống = dãy ô lặp từ max(start_date, cutoff) theo thứ tự thời gian,
          bỏ ô trùng ngày nghỉ (nếu apply_tenant_holidays), bỏ ô trước start_date
buổi thứ p+1..planned_sessions lần lượt nhận các ô trống (buổi cancelled vẫn chiếm ô – V1)
  buổi đổi ngày: starts_at/ends_at = giờ của ô, time_overridden = false,
                 có custom_teachers → moved_warning = true (U2)
thiếu buổi → tạo; thừa → xoá buổi cuối + link (giả định 6)
end_date = ngày của buổi thường cuối
trả về danh sách buổi đổi ngày → thông báo gộp (U5.3)
```
Buổi bù (`makeup`) không bao giờ bị dời.

### 4.7 Chấm & thông báo
```
grading_delegations  tenant_id, delegate_membership_id, scope_type (class_item/exam/lesson/exam_attempt/lesson_attempt),
                     scope_id, created_by, created_at     UNIQUE(delegate_membership_id, scope_type, scope_id)
notifications        user_id, tenant_id NULL, type, params jsonb, link, dedupe_key NULL, read_at NULL, created_at
                     INDEX(user_id, created_at desc); UNIQUE(user_id, dedupe_key) where dedupe_key is not null
```
- Quyền chấm một lượt (`canGrade`): không phải bài của mình VÀ (Owner/Admin HOẶC lượt trong lớp mà mình là giáo viên của lớp HOẶC lượt tự do của đề/bài học mình soạn HOẶC có `grading_delegations` khớp mục/đề/bài/lượt).
- Chốt ở Step 10 (2026-09-20): giữ đúng 5 loại `scope_type` (không có phạm vi "cả lớp"); `scope_type = exam/lesson` **chỉ** áp dụng cho bài làm **tự do** của đề/bài đó (bài trong lớp giao theo `class_item` hoặc theo từng lượt); người **được** chuyển giao **không** chuyển giao tiếp (chỉ người có quyền gốc – giáo viên của lớp, người soạn, Owner/Admin – mới giao và mới gỡ được); lượt thi đã "Cho làm lại" không vào hàng chờ chấm.
- Điểm %, đậu, nhóm thi, chuyên cần: hàm thuần trong `@lang/shared` (`training.ts`) + unit test, service chỉ nạp dữ liệu.

---

## 5. Phân quyền (bổ sung mục 5.2 của req-1)

| Hành động | Owner | Admin | Teacher | Student | Parent |
|---|---|---|---|---|---|
| Danh mục, mẫu bài học của tenant | ✔ | ✔ | xem | ✘ | ✘ |
| Tạo bài học, nhân bản bài học/đề đã publish | ✔ | ✔ | ✔ | ✘ | ✘ |
| Sửa/publish/lưu trữ/xoá/đổi hiển thị bài học | mọi bài | mọi bài | bài mình tạo | ✘ | ✘ |
| Khoá học (CRUD) | ✔ | ✔ | xem | ✘ | ✘ |
| Giáo trình tham khảo | mọi | mọi | tạo, sửa của mình, xem mọi | ✘ | ✘ |
| Gắn/bỏ giáo trình vào khoá học | ✔ | ✔ | ✘ | ✘ | ✘ |
| Lớp: tạo/sửa thông tin/trạng thái, thêm/xoá giáo viên & học viên, lịch lặp | ✔ | ✔ | ✘ | ✘ | ✘ |
| Lớp: giáo trình lớp, cho làm lại, huỷ/khôi phục buổi, buổi bù, giáo viên buổi, map nội dung, nhận xét cuối khoá | ✔ | ✔ | lớp mình | ✘ | ✘ |
| Xem lớp, chuyên cần, bảng điểm (trong khoá), xuất Excel | mọi lớp | mọi lớp | lớp mình | ✘ | ✘ |
| Xem chi tiết buổi dạy thế | ✔ | ✔ | buổi mình dạy | ✘ | ✘ |
| Cài đặt tenant (ngày nghỉ, tham số chuyên cần) | ✔ | ✔ | ✘ | ✘ | ✘ |
| Chấm tay | mọi bài | mọi bài | theo `canGrade` | ✘ | ✘ |
| Chuyển giao chấm | ✔ | ✔ | mục/lượt mình chấm được | ✘ | ✘ |
| Học/làm bài trong lớp, lịch học của tôi | nếu là học viên lớp | ← | ← | lớp mình | ✘ |
| Xem kết quả, lịch, lớp của con | ✘ | ✘ | ✘ | ✘ | con đã liên kết |
| Học bài/thi đề `visibility = tenant` | ✔ | ✔ | ✔ | ✔ | ✔ |

Guard: route mới dưới `/t/:slug/*` dùng `TenantGuard` + `@TenantRoles`; quyền theo lớp (giáo viên của lớp, học viên của lớp, phụ huynh của học viên) kiểm trong service bằng helper `ClassroomAccess` (unit test). Mọi route mới thêm vào `ROUTES` của `access-control.e2e.spec.ts`.

---

## 6. Route

### 6.1 Frontend
```
(dashboard)/admin/categories, admin/exam-blueprints, admin/lesson-blueprints
(dashboard)/t/[slug]/dashboard/
  categories, exam-blueprints, lesson-blueprints
  lessons, lessons/[id]/edit, lessons/[id]/versions
  courses, courses/[id]                 (tab: Thông tin · Giáo trình tham khảo · Lớp · Lịch)
  curricula, curricula/[id]
  classes, classes/[id]                 (tab: Thông tin · Thời khoá biểu · Giáo viên & Học viên · Giáo trình ·
                                         Tiến độ & Chuyên cần · Bảng điểm · Nhật ký thay đổi)
  classes/[id]/students/[membershipId]  bài làm chi tiết của 1 học viên (F4)
  sessions/[sessionId]                  chi tiết buổi (giáo viên dạy thế)
  schedule                              Lịch dạy của tôi / lịch trung tâm (Owner/Admin)
  settings                              ngày nghỉ, tham số chuyên cần
(site)/t/[slug]/
  lessons/[lessonId]                    thông tin bài học tự do
  classes/[classId]                     trang lớp của học viên
  schedule                              Lịch học của tôi
  children, children/[membershipId]     phụ huynh ("Con của tôi")
  children/[membershipId]/classes/[classId]   trang lớp của con (chỉ đọc)
  lesson-attempts/[id]                  màn hình học bài (layout (site), không toàn màn hình)
(site)/me/notifications                 tất cả thông báo
```
Menu dashboard tenant: nhóm **Đề thi & Bài học** (Danh mục, Loại đề, Mẫu bài học, Đề thi, Bài học, Media, Chấm bài), nhóm **Đào tạo** (Khoá học, Giáo trình, Lớp học, Lịch), **Cài đặt** (Owner/Admin).

### 6.2 Backend (`/api`)
```
admin:   categories CRUD · exam-blueprints · lesson-blueprints CRUD (kèm modules)
me:      GET notifications (?unread, phân trang) · GET notifications/unread-count · POST notifications/:id/read · POST notifications/read-all
t/:slug:
  categories, lesson-blueprints: list (hệ thống + tenant) · POST/PATCH/DELETE (tenant)
  exams:   + PATCH visibility (qua metadata) · POST :id/clone
  lessons: list · creators · POST · GET :id · PATCH · PUT :id/content · versions · restore · publish · archive · DELETE · POST :id/clone
  courses: CRUD · POST/DELETE :id/curricula/:curriculumId · GET :id/sessions (lịch gộp)
  curricula: CRUD · GET creators · PUT :id/items (toàn bộ chương + mục, baseRevision) · POST :id/clone
  classes: list · POST · GET :id · PATCH · POST :id/status · DELETE
           teachers/students: GET · POST · DELETE · POST :id/conflicts {membershipIds} (Step 8: POST vì gửi nhiều người)
           curriculum: GET · PUT (baseRevision) · GET logs
             ("Nhập từ giáo trình" gộp ở client rồi PUT, không có route import riêng – Step 7)
           schedule: GET · PUT (slots + planned_sessions, start_date, apply_tenant_holidays) · POST schedule/preview (cùng body với PUT)
           sessions: PATCH :sid (phòng, ghi chú, giờ, giáo viên) · POST :sid/cancel · POST :sid/restore · POST makeup · DELETE :sid (buổi bù) · PUT :sid/links
           attempts: GET items/:itemId/attempts · POST items/:itemId/void/:attemptId
             GET students/:membershipId/attempts · GET …/attempts/:attemptId · GET …/lesson-attempts/:attemptId
             (+ …/recordings/:answerId/url cho cả hai loại – Step 10)
           progress: GET attendance · GET gradebook · GET export.xlsx · PUT students/:membershipId/comment
  sessions: GET :sid (chi tiết, cho giáo viên dạy thế)
  schedule: GET mine (giáo viên) · GET center (Owner/Admin)
  settings: GET · PATCH · holidays CRUD (+ POST holidays/impact {holidayId?, startDate, endDate, remove?} – ngày nghỉ mới chưa có id)
  grading: GET attempts (+ kind exam/lesson, classId, itemId) · GET attempts/:id · PUT answers/:answerId
           GET lesson-attempts · GET lesson-attempts/:id · PUT lesson-answers/:answerId · delegations CRUD
           (+ GET attempts/:id|lesson-attempts/:id/recordings/:answerId/url – ghi âm cho người chấm)
  learner: GET lessons (visibility tenant) · GET lessons/:id · POST lessons/:id/attempts
           GET lesson-attempts/:id · PUT .../sections/:sid/view · PUT .../sections/:sid/responses
           POST .../sections/:sid/submit · POST .../sections/:sid/retry · POST .../recordings
           GET .../sections/:sid/recordings/:number/url · GET .../answers/:answerId/recording-url
           GET classes · GET classes/:id · POST classes/:id/items/:itemId/start · GET schedule
  guardian: GET children · GET children/:membershipId (lớp, kết quả, bài tự do) · GET children/:membershipId/classes/:classId · GET children/:membershipId/schedule
```

---

## 7. Các step

> Mỗi step kết thúc bằng: `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check` pass, chạy thật đạt nghiệm thu, cập nhật tài liệu `/user-manual` (+ `updatedAt`) và [req-3-progress.md](req-3-progress.md). Migration: `migration:generate`, đọc lại, chạy trên DB local, generate lần nữa phải "No changes".

## Giai đoạn 1 – Bài học

### Step 1 – Đổi tên danh mục
- Migration đổi tên `exam_categories` → `categories` (bảng, PK, FK, index, check, unique) – kiểm trên bản sao dữ liệu seed.
- lang-api: `Category` entity, `CategoriesService`, route `admin/categories`, `t/:slug/categories`; cập nhật `ROUTES`.
- `@lang/shared`, lang-app: đổi tên kiểu/hàm, route `/admin/categories`, `/t/{slug}/dashboard/categories`, menu "Danh mục".
- Tài liệu `/user-manual`: đổi tên trang, liên kết.
- **Nghiệm thu:** danh mục/loại đề/đề thi chạy như cũ trên local; deploy lên :3001 (bạn push) → migration chạy lúc khởi động, trang danh mục/loại đề/đề thi hoạt động.

### Step 2 – Mẫu bài học
- Migration `lesson_blueprints`, `lesson_modules`; `LessonCatalogModule` (chép từ exam-catalog, không có thời lượng), controller admin + tenant.
- lang-app: `LessonBlueprintsView` (chép `ExamBlueprintsView`), trang `/admin/lesson-blueprints`, `/t/{slug}/dashboard/lesson-blueprints`, menu.
- Unit test service (phạm vi hệ thống/tenant, mã trùng, danh mục không dùng).
- **Nghiệm thu:** System Admin tạo mẫu "Minna no Nihongo – 1 bài" (5 phần); tenant thấy mẫu hệ thống, tạo mẫu riêng; Teacher chỉ xem.

### Step 3 – Editor: khối mới & giải thích
- `@lang/exam-core`: `IndicatorKind` thêm `explanation`; `buildPlan`/`extractStructure` bỏ qua phạm vi giải thích (không ảnh hưởng đánh số); `extractExplanations(value)` → `[{ nodeId, numbers, blocks }]` (gắn câu hỏi gần nhất phía trên); `stripAnswers` bỏ nội dung giải thích, giữ indicator rỗng; validate (giải thích rỗng → cảnh báo). Test + test đối chiếu LC vẫn pass.
- Plugin Plate: heading H1–H3, callout (3 loại), ruby (furigana), khối gập/mở, highlight; slash menu + toolbar; `IndicatorDialog` có hướng dẫn chi tiết cho `explanation`. Render tương ứng trong `ExamBlocks`/simulator.
- lang-api đề thi: migration `exam_sections.explanations`, `exams.visibility`, `exams.cloned_from_id`; lưu nội dung ghi `explanations`; người chấm nhận giải thích của câu đang chấm; `POST exams/:id/clone`; danh sách học viên chỉ lấy `visibility = tenant`; trang học viên mở đề `private` → 404.
- lang-app: form metadata đề có "Hiển thị"; nút "Nhân bản" ở danh sách đề; xem trước hiện giải thích sau khi nộp.
- **Nghiệm thu:** soạn đề có furigana/callout/giải thích → học viên không thấy giải thích (kiểm cả response API), người chấm thấy; đề `private` biến khỏi `/t/{slug}`; nhân bản đề ra bản nháp của người nhân bản.

### Step 4 – Soạn bài học
- Migration `lessons`, `lesson_sections`, `lesson_parts`, `lesson_questions`; `LessonsModule`: `LessonsService` + `LessonContentService` (chép từ exams, bỏ duration, thêm `explanations`), version/khôi phục/publish/lưu trữ/xoá/nhân bản/hiển thị.
- lang-app: `components/lesson-editor` (chép `ExamEditor`, không có ô thời lượng, bản nháp `lesson:{id}:draft`), trang danh sách/soạn/version bài học, `lib/lesson-api.ts`; xem trước tạm dùng `ExamSimulator` (chấm ở client, giải thích hiện sau khi Nộp), Step 5 đổi sang `LessonViewer` (người dùng chốt 2026-09-19). Version: chưa có `lesson_attempts` nên mọi lần lưu ghi đè version hiện tại; kiểm "có lượt học" qua `LessonAttemptLookup` để Step 5 nối vào (người dùng chốt 2026-09-19).
- Unit test như đề thi (version, quyền Teacher, publish lỗi 422, nhân bản).
- **Nghiệm thu:** tạo bài học từ mẫu Minna → 5 tab; soạn, lưu, publish; Teacher khác mở chỉ xem và nhân bản được.

### Step 5 – Học bài học & chấm tay bài học
- `LessonAttemptLookup` đọc `lesson_attempts` (Save có lượt học → version mới, xoá bài có lượt học → xoá mềm); xem trước trong trình soạn đổi sang `LessonViewer`.
- Migration `lesson_attempts`, `lesson_attempt_sections`, `lesson_attempt_answers`; `LessonAttemptsService` (mở section, autosave câu trả lời, nộp section → chấm + đáp án + giải thích, làm lại, học xong, ghi âm).
- Learner: danh sách bài học `tenant` ở `/t/{slug}`, trang bài học, màn hình học `LessonViewer` (tab, nội dung liền mạch, "Nộp phần này", "Làm lại", đáp án/đúng sai/giải thích sau khi nộp).
- Chấm bài: trang "Chấm bài" thêm lọc Đề thi | Bài học, chấm câu Speaking/Writing của bài học (quyền như hiện tại, đổi ở Step 10); nộp lại → lượt chấm cũ bỏ.
- Người dùng chốt 2026-09-19: "học xong" **tự động** (chỉ hiện nhãn, không có nút bấm tay); sau "Làm lại" học viên vẫn mở được **"Xem kết quả lần trước"** tới khi nộp lần mới; bài học có version mới thì lượt học version cũ **chỉ xem lại** (không nộp/làm lại), bấm Học tạo lượt trên version mới.
- **Nghiệm thu:** học viên học bài Minna: mở hết tab, nộp bài tập, thấy đáp án + giải thích, làm lại, "học xong"; Speaking nộp và được chấm.
- **Deploy giai đoạn 1.**

## Giai đoạn 2 – Khoá học & lớp

### Step 6 – Khoá học & giáo trình tham khảo
- Migration `courses`, `curricula`, `course_curricula`, `curriculum_groups`, `curriculum_items`; `TrainingModule` (services riêng cho khoá học, giáo trình).
- lang-app: danh sách/chi tiết khoá học (tab Giáo trình tham khảo: gắn/bỏ), danh sách/chi tiết giáo trình (chương + mục kéo thả, chọn bài học/đề đã publish, nhãn, ghi chú), nhân bản giáo trình. Bài/đề đang nằm trong giáo trình → xoá bị chặn (409), lưu trữ được.
- Người dùng chốt 2026-09-19: xoá khoá học (chưa có lớp) **chỉ bỏ gắn** giáo trình, giáo trình giữ trong thư viện (B3 viết trước khi đổi sang m-m); ảnh bìa chọn bằng `MediaDialog` dùng chung (Thư viện media hoặc dán URL, không có prefix R2 riêng); danh mục đang có khoá học → xoá 409 (như loại đề/mẫu bài học); mã khoá học theo quy tắc mã danh mục (`CATALOG_CODE_PATTERN`, tự in hoa).
- **Nghiệm thu:** tạo khoá "Tiếng Nhật N5", giáo trình 3 chương (bài học + kiểm tra + thi cuối khoá), gắn vào 2 khoá học; Teacher sửa giáo trình người khác → 403.

### Step 7 – Lớp học & giáo trình lớp
- Migration `classrooms`, `classroom_teachers`, `classroom_students`, `class_groups`, `class_items`, `class_change_logs`, cột mới `exam_attempts` (+ đổi index in_progress).
- Tạo lớp (chép giáo trình), sửa thông tin, chuyển trạng thái (chốt lượt dở khi `finished`, có số người đang làm), xoá/huỷ; giáo viên, học viên (sĩ số khoá dòng lớp, xoá mềm); giáo trình lớp (thêm/xoá/sắp xếp, nhãn, ngày mở, deadline, nhận bài quá hạn, ngưỡng đậu, thi lại cho, nhập từ giáo trình, `revision`, nhật ký).
- lang-app: danh sách lớp, trang lớp các tab Thông tin, Giáo viên & Học viên, Giáo trình, Nhật ký.
- Người dùng chốt 2026-09-19: mã lớp theo quy tắc mã khoá học (`CATALOG_CODE_PATTERN`, tự in hoa, unique `(tenant_id, code)`); chuyển trạng thái tự do giữa `upcoming`/`ongoing`/`finished` (không nhảy `upcoming → finished`), `upcoming`/`ongoing → cancelled`, `cancelled` là trạng thái cuối; lớp `finished`/`cancelled` khoá giáo trình lớp và thêm/xoá giáo viên, học viên (thông tin + trạng thái vẫn sửa được); xoá mục giáo trình lớp chưa có bài làm → xoá hẳn, có bài làm → ẩn (`removed_at`, khôi phục được); "Nhập từ giáo trình" chèn vào bản đang sửa ở client rồi Lưu (không có route `import`).
- Unit test: sĩ số, quyền giáo viên lớp, thi lại phải sau mục gốc, trùng đề chỉ khi thi lại, chuyển `finished` chốt lượt.
- **Nghiệm thu:** lớp từ khoá N5 chép đúng giáo trình; giáo viên lớp sửa giáo trình, Teacher ngoài lớp 403; đủ sĩ số thì chặn thêm.

### Step 8 – Thời khoá biểu, ngày nghỉ, lịch
- Migration `class_schedule_slots`, `class_sessions`, `class_session_teachers`, `class_session_links`, `tenant_holidays`, cột `tenants.late_weight/warning_threshold`, `classrooms.apply_tenant_holidays`.
- `@lang/shared`: hàm thuần sinh ô lặp + `recomputeSchedule` (mục 4.6) + phát hiện chồng giờ, unit test kỹ (ngày nghỉ nhiều ngày, thêm/xoá ngày nghỉ, buổi huỷ, buổi đã qua, đổi số buổi, 2 ô/tuần giờ khác nhau).
- API lịch lặp, xem trước, huỷ/khôi phục, buổi bù, giáo viên buổi (dạy thế + cảnh báo dời), map nội dung, cảnh báo trùng; cài đặt tenant (ngày nghỉ + ảnh hưởng, tham số chuyên cần).
- lang-app: `components/calendar` (tuần/tháng/danh sách), tab Thời khoá biểu của lớp, lịch khoá học, lịch trung tâm, "Lịch dạy của tôi", chi tiết buổi, trang Cài đặt.
- Người dùng chốt 2026-09-19: ngày bắt đầu và số buổi của lớp đã tạo **chỉ** sửa ở tab Thời khoá biểu (có xem trước), form sửa thông tin lớp bỏ 2 ô này; lịch khoá học của Teacher chỉ gồm lớp mình phụ trách (+ buổi mình dạy thế); buổi đã diễn ra chỉ sửa được phòng/link, ghi chú, nội dung map (huỷ/khôi phục, đổi giờ, đổi giáo viên, xoá buổi bù chỉ với buổi chưa diễn ra); cảnh báo "buổi đã dời" tắt bằng nút **Đã kiểm tra** hoặc khi lưu giáo viên/giờ của buổi.
- **Nghiệm thu:** lớp T2+T4 10 buổi; thêm ngày nghỉ T4 → các buổi dời đúng bảng ví dụ U-bối cảnh, ngày kết thúc lùi; xoá ngày nghỉ → về như cũ; huỷ buổi 5 + buổi bù; giáo viên dạy thế thấy buổi trong lịch; trùng giờ hiện đỏ.

### Step 9 – Học viên trong lớp
- Learner API: lớp của tôi, trang lớp (giáo trình + trạng thái mục theo quyền xem, buổi sắp tới), bắt đầu mục (kiểm lớp `ongoing`, học viên đang trong lớp, ngày mở, deadline/nhận bài quá hạn, 1 lượt/mục trừ `voided`), lịch học của tôi. `AttemptsService.mutate` và lượt học bài học từ chối khi lớp không còn `ongoing`.
- Nhóm thi: hàm thuần điểm %, đậu, bắt buộc/không bắt buộc (R7, R8, T2, T3) + unit test; học viên thấy điểm/đậu ngay.
- "Cho làm lại" (giáo viên lớp) → `voided`.
- lang-app: "Lớp của tôi" ở `/t/{slug}`, trang lớp học viên, "Lịch học của tôi"; mục bài học mở màn hình học, mục đề thi mở giả lập thi như cũ.
- Người dùng chốt đầu phiên Step 9 (2026-09-20):
  - Chương và mục cùng có ngày mở → lấy **mốc muộn hơn** (cả hai phải qua mới vào được).
  - Bài học/đề thi của mục lớp bị **lưu trữ** sau khi giao: học viên **vẫn học/thi được** (mục của lớp là căn cứ); chỉ bài/đề bị xoá mềm mới khoá mục.
  - "Cho làm lại" áp dụng cho **mọi lượt đề thi trong lớp, kể cả lượt đang làm dở** (chốt lượt như hết giờ rồi đánh dấu `voided`); lượt học bài học không cần (vốn làm lại tự do).
  - Trang lớp của học viên **không** hiện danh sách bạn cùng lớp, chỉ giáo viên phụ trách và sĩ số.
- **Nghiệm thu:** học viên làm bài kiểm tra trong lớp 1 lần, thi lại khi trượt, người đã đậu thấy "không bắt buộc" và vẫn thi được, điểm nhóm = cao nhất; mục chưa mở hiện nhưng không vào được; lớp `finished` chặn nộp.

### Step 10 – Chấm theo lớp & chuyển giao
- `canGrade` (mục 4.7) cho đề thi và bài học; migration `grading_delegations`; API chuyển giao (mục, đề/bài học tự do, từng lượt).
- Trang Chấm bài: lọc lớp/mục/học viên, mặc định bài mình được chấm; hộp "Chuyển giao chấm".
- Trang bài làm chi tiết của học viên (F4): đáp án học viên + đúng/sai từng câu cho giáo viên lớp — **cả mục đề thi lẫn mục bài học** (chốt ở Step 10).
- **Nghiệm thu:** Teacher không thuộc lớp không thấy bài của lớp; được chuyển giao thì thấy đúng các bài đó; bài tự do chỉ người soạn chấm.
- **Deploy giai đoạn 2.**

## Giai đoạn 3 – Theo dõi

### Step 11 – Chuyên cần, bảng điểm, nhận xét cuối khoá
- Hàm thuần chuyên cần (mục 1.4) + unit test (muộn, quá hạn, thi lại không bắt buộc, `voided`, mục đã xoá, đổi deadline).
- API tiến độ/chuyên cần/bảng điểm, nhận xét cuối khoá, xuất Excel (`exceljs`); tham số lớp ghi đè tenant. Route thực tế: `GET :id/progress/attendance`, `GET :id/progress/gradebook`, `GET :id/progress/export.xlsx`, `PUT :id/students/:membershipId/comment`; phần của học viên trả trong `GET learner/classes/:id` (`summary`, chỉ khi lớp `finished`).
- lang-app: tab Tiến độ & Chuyên cần (ô màu, cảnh báo dưới X%), tab Bảng điểm (lọc chương, cột nhóm thi), ô nhận xét; học viên xem sau tổng kết.
- **Nghiệm thu:** số liệu khớp tính tay trên lớp mẫu; Excel mở được bằng Excel/Numbers; học viên không thấy chuyên cần khi lớp đang học, thấy khi `finished`.

### Step 12 – Thông báo
- Migration `notifications`; `NotificationsService.notify(manager, { userIds, tenantId, type, params, link, dedupeKey })` gọi từ các service (sự kiện R18.1) trong cùng transaction; cron 15 phút (mục vừa mở, sắp hết hạn 24 giờ, quá hạn – chỉ lớp `ongoing`, chỉ học viên chưa nộp), cron hằng ngày xoá > 90 ngày. Route thực tế: `GET me/notifications` (`?unread`, phân trang), `GET me/notifications/unread-count`, `POST me/notifications/:id/read`, `POST me/notifications/read-all`.
- lang-app: `NotificationBell` (header site + dashboard, gọi lại 60 giây + `visibilitychange`), `/me/notifications`, `vi.notifications`.
- **Nghiệm thu:** giao mục mới → học viên có chuông; chấm xong → học viên có chuông; dời lịch → 1 thông báo gộp; không trùng khi cron chạy lại.

### Step 13 – Phụ huynh
- Thêm 3 loại thông báo cho phụ huynh (con quá hạn, con có kết quả bài mới, chuyên cần con dưới ngưỡng) – dời từ Step 12 vì link đích là trang "Con của tôi" (bảng `notifications` không đổi).
- Guardian API (kiểm liên kết `student_guardians` + role Parent) + trang "Con của tôi": chọn con, lớp, lịch, trạng thái mục, kết quả từng bài (không đáp án), bài làm tự do, chuyên cần/bảng điểm/nhận xét sau tổng kết. Route thực tế: `GET children`, `GET children/:membershipId`, `GET children/:membershipId/classes/:classId`, `GET children/:membershipId/schedule`.
- **Nghiệm thu:** phụ huynh 2 con lọc được lịch theo con; không xem được học viên không liên kết (403/404).

### Step 14 – Hoàn thiện & nghiệm thu tổng
- Rà `ROUTES`, tài liệu `/user-manual` (bài học, khoá học, giáo trình, lớp, lịch, chuyên cần, thông báo, phụ huynh, ma trận quyền), CLAUDE.md (quy ước module mới).
- Checklist nghiệm thu req-3 trên :3001 theo từng role.
- **Deploy giai đoạn 3.**

---

## 8. Ngoài phạm vi req-3
Điểm danh; học phí, ghi danh, tự đăng ký lớp, giới thiệu khoá học công khai; email/thông báo đẩy, tắt loại thông báo; nhập học viên từ file; gia hạn deadline riêng; nhân bản lớp/khoá học; phân quyền theo khoá học; trọng số, điểm tổng kết, tham số điểm theo hình thức thi, điểm liệt theo section; deadline/ngày mở theo buổi; ngày nghỉ hệ thống/lặp hằng năm; lặp cách tuần; kiểm trùng phòng; lịch gộp mọi tenant ở `/me`; phụ huynh nhắn tin giáo viên; flashcard, nhúng YouTube; đếm tham chiếu media khi nhân bản.
