# Requirement 3 – Tiến độ

> **Phiên chat mới:** đọc [CLAUDE.md](../../CLAUDE.md) → file này → phần liên quan của [req-3-plan.md](req-3-plan.md).
> Sau mỗi step: cập nhật bảng trạng thái + thêm mục nhật ký bên dưới.
>
> Trạng thái: ✅ Xong · 🟡 Đang làm · ⬜ Chưa làm · ⛔ Bị chặn

## Bảng trạng thái

| Giai đoạn | Step | Nội dung | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|---|---|
| 0 | – | Câu hỏi 4 vòng, plan, DB local `lang_simulator_dev` | ✅ | 2026-09-19 | Seed System Owner xong; CLAUDE.md cập nhật DB local |
| 1 | 1 | Đổi tên danh mục | ✅ | 2026-09-19 | Commit 484f81e, deploy :3001, người dùng kiểm OK |
| 1 | 2 | Mẫu bài học | ✅ | 2026-09-19 | Commit 38d6470 |
| 1 | 3 | Editor: khối mới & giải thích | ✅ | 2026-09-19 | Commit ce4dc75 (dữ liệu thử `step3-test` còn giữ) |
| 1 | 4 | Soạn bài học | ✅ | 2026-09-19 | Commit ce4dc75 (dữ liệu thử `step4-test` còn giữ) |
| 1 | 5 | Học bài học & chấm tay bài học | ✅ | 2026-09-19 | Commit db18cb7, đã push `main` (deploy giai đoạn 1) |
| 2 | 6 | Khoá học & giáo trình tham khảo | ✅ | 2026-09-19 | Commit d5cf255 (chưa push) |
| 2 | 7 | Lớp học & giáo trình lớp | ✅ | 2026-09-19 | Commit 06d9daa (chưa push); dữ liệu thử lớp `N5-2026-01` ở `step4-test` |
| 2 | 8 | Thời khoá biểu, ngày nghỉ, lịch | ✅ | 2026-09-20 | Chưa commit; lịch thử lớp `N5-2026-01` + lớp `TRUNG-LICH` ở `step4-test` |
| 2 | 9 | Học viên trong lớp | ✅ | 2026-09-20 | Chưa commit; dữ liệu thử lượt trong lớp `N5-2026-01` ở `step4-test` |
| 2 | 10 | Chấm theo lớp & chuyển giao | ✅ | 2026-09-20 | Chưa commit; deploy giai đoạn 2 sau khi người dùng kiểm giao diện |
| 3 | 11 | Chuyên cần, bảng điểm, nhận xét cuối khoá | ✅ | 2026-09-20 | Chưa commit; dữ liệu thử lớp `N5-2026-01` có thêm 2 mục đề thi đặt hạn nộp |
| 3 | 12 | Thông báo | ✅ | 2026-09-21 | Chưa commit; thông báo thử còn trong DB để bấm chuông |
| 3 | 13 | Phụ huynh | ✅ | 2026-09-22 | Chưa commit; phụ huynh thử `step13-parent@example.com` ở `step4-test` |
| 3 | 14 | Hoàn thiện & nghiệm thu tổng | ✅ | 2026-09-22 | Chưa commit; chờ người dùng bấm [checklist](req-3-acceptance.md) rồi deploy giai đoạn 3 |

## Bàn giao cho phiên tiếp theo

- Giai đoạn 1 (Step 1–5) xong, đã push `main` (`db18cb7`). Giai đoạn 2: Step 6 `d5cf255`, Step 7 `06d9daa`, Step 8 `a9d588a`, Step 9 `258b8a4`, Step 10 `90de1a6`, Step 11 + Step 12 `f7a573e` đã commit (chưa push). **Step 13 xong trên local, chưa commit.** Deploy giai đoạn 2 + 3 sau khi người dùng kiểm giao diện: migration `CreateCoursesCurricula`, `CreateClassrooms`, `CreateClassSchedule`, `CreateGradingDelegations`, `ClassProgress`, `CreateNotifications`, **`GuardianNotifications`** chạy lúc container khởi động; **không có env mới**. Dependency mới: `exceljs` ở `apps/lang-api` (không có build script, không cần `allowBuilds`).
- **Step 14 xong trên local (chưa commit).** Việc còn lại của req-3: người dùng bấm [req-3-acceptance.md](req-3-acceptance.md) trên máy dev → commit → push `main` để deploy giai đoạn 3 (migration `ClassProgress`, `CreateNotifications`, `GuardianNotifications` chạy lúc container khởi động, **không có env mới**) → chạy lại phần "Sau khi deploy giai đoạn 3" của checklist.
- Máy dev: `apps/lang-api/.env` trỏ Postgres local `lang_simulator_dev`. DB local có **21 migration**, 1 System Owner, mẫu bài học hệ thống **Minna no Nihongo – 1 bài**. **Còn giữ dữ liệu thử** để người dùng bấm giao diện:
  - Step 3: tenant `step3-test` (4 đề, 1 lượt làm chờ chấm của đề **do Chủ sở hữu soạn** → sau Step 10 `step3-teacher` **không còn thấy bài này**) + `step3-teacher|student|student2@example.com`.
  - Step 4–5: tenant `step4-test` (System Owner là Chủ sở hữu). Bài **Minna bài 1** của `step4-teacher` (công khai, **version 2**; tab Từ vựng có furigana/callout/khối gập mở, tab Luyện tập có Writing + Speaking, tab Bài tập 2 câu MC + 1 giải thích) và bản sao nháp **Bản của GV2** của `step4-teacher2`. `step4-student@example.com` có 2 lượt học tự do: version 1 (đã học xong; phần Luyện tập **đã chấm xong** từ Step 12 – bài đang chờ chấm hiện là lượt **trong lớp** của `step7-student1`) và version 2 (mới mở).
  - Step 6 (cũng ở `step4-test`): khoá **Tiếng Nhật N5** (`N5`, 24 buổi) và **Tiếng Nhật N5 – lớp tối** (`N5-TOI`), cả hai gắn giáo trình **Giáo trình N5 – Minna no Nihongo** của `step4-teacher` (3 chương, 7 mục); bản sao **… (bản sao)** của `step4-teacher2`. Bài Minna bài 2–4 và 3 đề JLPT_N2 (hiển thị Chỉ qua lớp) do `step4-teacher` tạo cho giáo trình.
  - Step 7 (cũng ở `step4-test`): lớp **N5 tối thứ 2–4** (`N5-2026-01`, khoá N5, **Đang học**, sĩ số tối đa 3, Phòng 202) chép giáo trình N5; giáo viên lớp `step4-teacher` (`step4-teacher2` là Teacher ngoài lớp); 3 học viên `step4-student`, `step7-student1|2@example.com` (mật khẩu `Step7-Passw0rd`, **đã bỏ cờ đổi mật khẩu**). Mục chưa xếp chương **Ôn tập riêng lớp N5-2026-01**. Nhật ký lớp có đủ loại dòng.
  - Step 8 (cũng ở `step4-test`): lớp `N5-2026-01` có thời khoá biểu **T2 + T4 18:00–19:30, 10 buổi từ 05/10/2026**; ngày nghỉ **Ngày nghỉ thử (Step 8)** T4 21/10 (buổi 6–10 đã lùi, kết thúc 09/11); buổi 5 **đã huỷ** + **buổi bù** T7 24/10 09:00; buổi 3 dạy thế `step4-teacher2` và đang có cảnh báo **Đã dời – kiểm tra lại**; buổi 1 map chương 1 + Minna bài 1. Lớp **Lớp thử trùng lịch** (`TRUNG-LICH`, Sắp mở, T2 19:00–20:30, 4 buổi, giáo viên `step4-teacher2`, học viên `step4-student`). Tham số chuyên cần của `step4-test` giữ mặc định 0,5 / 70.
  - Step 9 (cũng ở `step4-test`, do `accept9.js` dựng): giáo trình lớp `N5-2026-01` đặt **Chương 1 mở 01/09/2026**, mục **Kiểm tra chương 1** (ngưỡng 70, hạn 31/12/2026, **không nhận bài quá hạn**), mục **Thi lại** cùng đề (ngưỡng 70), mục **Kiểm tra chương 2** mở **01/12/2026**. Lượt trong lớp: `step7-student1` trượt 50% lần 1 → **đã được "Cho làm lại"** rồi làm lại đạt 100%, thi lại 100%; `step7-student2` đậu 100% lần 1 và thi lại 50%; `step4-student` có 1 lượt bị **chốt** (0/2); `step7-student1` còn 1 lượt học đang làm ở bài **Ôn tập riêng lớp**.
  - Step 10 (cũng ở `step4-test`, do `accept10.js` dựng): `step7-student1` có **lượt học bài Minna bài 1 trong lớp** đã nộp cả hai phần → 2 câu chấm tay, trong đó **1 câu đã được `step4-teacher2` chấm 7,5** lúc thử chuyển giao (chuyển giao đã gỡ lại, bảng `grading_delegations` hiện **rỗng**). Đây là dữ liệu tốt để bấm thử: `step4-teacher` mở Chấm bài → Bài học thấy cả bài trong lớp lẫn bài tự do, `step4-teacher2` **không thấy gì** cho tới khi được chuyển giao.
  - Step 11 (cũng ở `step4-test`, do `accept11.js` dựng): lớp `N5-2026-01` có thêm hạn nộp ở 2 mục đề thi — **Thi cuối khoá N5** hạn **18/09/2026 17:00** (quá hạn, chưa ai làm → ô "Chưa nộp") và **Kiểm tra chương 2** hạn **20/12/2026 17:00** (chưa tới hạn); mục **Kiểm tra chương 1** giữ hạn 31/12/2026. Nhờ vậy tab Tiến độ & Chuyên cần có đủ 4 loại ô (Đúng hạn · Chưa tới hạn · Chưa nộp · Không tính) và cả 3 học viên đều **50% < ngưỡng 70%** (hiện cảnh báo). `step7-student1` có **nhận xét cuối khoá** "Tiến bộ tốt ở phần nghe, cần luyện nói thêm."; tham số của lớp để trống (theo trung tâm 0,5 / 70).
  - Step 12 (cũng ở `step4-test`, do `accept12.js`/`accept12b.js` dựng): bảng `notifications` giữ **7 thông báo thật, tất cả chưa đọc** để bấm chuông — 3 học viên của lớp `N5-2026-01` có **"Quá hạn chưa nộp: Thi cuối khoá N5"** (cron sinh), `step7-student1` và `step4-student` có **"Bài Minna bài 1 đã chấm xong"**, `step4-teacher` có **"có bài mới cần chấm"**, `step4-teacher2` có **"được chuyển giao chấm"** (chuyển giao đã gỡ lại, bảng `grading_delegations` vẫn **rỗng**). Lượt học **trong lớp** của `step7-student1` đã **nộp lại** phần Luyện tập nên đang **chờ chấm 2 câu** (điểm 7,5 cũ bị bỏ khi nộp lại, đúng thiết kế); lượt học **tự do** version 1 của `step4-student` đã **chấm xong** (trước đây đang chờ chấm). Lớp thử `TB-STEP12` và mọi thông báo của nó (kể cả thông báo buổi học) đã xoá.
  - Step 13 (cũng ở `step4-test`, do `seed13.js` dựng): **phụ huynh thử** `step13-parent@example.com` (mật khẩu `Step13-Passw0rd`, đã bỏ cờ đổi mật khẩu), liên kết **2 con** `step7-student1` và `step7-student2` (quan hệ "Mẹ"). Lượt học **trong lớp** của `step7-student1` đã được `step4-teacher` chấm xong (Câu 1 = 8 "Viết rõ ý, chú ý chia động từ", Câu 2 = 6,5 "Phát âm tốt, nói chậm lại") nên trang lớp của con có sẵn khối **Nhận xét của giáo viên**. Chuông của phụ huynh có **2 thông báo "con quá hạn chưa nộp"** (mỗi con một dòng, do chạy cron thử với hạn quá khứ rồi trả lại hạn cũ). Lớp thử `PH-STEP13` đã xoá.
  - Dọn dẹp: như Step 9, thêm `delete from grading_delegations where tenant_id in (...)` trước khi xoá tenant (FK CASCADE theo tenant/membership nên xoá tenant cũng tự dọn).
- Chạy thử: API `node dist/main.js` (:3101, sau `pnpm build`), app `pnpm start` (:3100, cần `BACKEND_INTERNAL_URL=http://127.0.0.1:3101`); **đang chạy** bản build Step 13. Dừng Next bằng `pkill -f next-server`; trước khi chạy API mới kiểm `lsof -iTCP:3101 -sTCP:LISTEN`. Kiểm trang qua curl cần cookie `ls_rt=x`. Nghiệm thu API không cần mật khẩu: ký JWT `{ sub, tv }` bằng `JWT_SECRET` trong `.env` (mẫu `lib13.js` + `accept13*.js` trong scratchpad phiên Step 13 – `tokenOf(email)` đọc `token_version` từ DB, `jsonwebtoken`/`pg` lấy từ `node_modules/.pnpm/…`; Chủ sở hữu `step4-test` là `admin@lang-simulator.com`). Không có công cụ trình duyệt – nhờ người dùng bấm thử; kiểm render không cần trình duyệt: bundle bằng esbuild (`node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild/bin/esbuild --bundle --platform=node --jsx=automatic --packages=external --alias:@=./src`, chạy trong `apps/lang-app`) rồi `renderToStaticMarkup`, chạy với `NODE_PATH=apps/lang-app/node_modules` (component có `Modal`/portal không render được kiểu này; component gọi API phải tách phần nhận prop như `LearnerClassBoard`, hoặc render thẳng component con nhận prop như `AttemptReviewView`).

## Nhật ký

### Step 1 – Đổi tên danh mục (2026-09-19)

**Đã làm**
- Migration viết tay `1789797313218-RenameExamCategoriesToCategories`: `ALTER TABLE … RENAME` + đổi tên PK, 3 CHECK, 3 FK, 2 unique index (`*_exam_categories_*` → `*_categories_*`); `down` đổi ngược. FK `FK_exam_blueprints_category_id` giữ tên (thuộc bảng `exam_blueprints`), tự trỏ bảng mới. (`migration:generate` coi đổi tên là xoá + tạo nên không dùng.)
- lang-api: thư mục `exam-catalog/` → `catalog/` (`CatalogModule`), `Category` entity (`category.entity.ts`), `CategoriesService`, `Create/UpdateCategoryDto`, `toCategoryItem/Ref`; route `admin/categories`, `t/:slug/categories`; bảng `ROUTES` cập nhật. Message "danh mục đề" → "danh mục".
- `@lang/shared`: `exam-catalog.ts` → `catalog.ts`; `CategoryItem`, `CategoryRef`, `CategoryColor`, `CategoryIconName` (không dùng `CategoryIcon` vì trùng component lang-app), `DEFAULT_CATEGORY_*`, `CATALOG_CODE_PATTERN`/`CATALOG_*_MAX_LENGTH`.
- lang-app: `components/exam-catalog` → `components/catalog`, `CategoriesView`; trang `/admin/categories`, `/t/{slug}/dashboard/categories`; `vi.examCatalog` → `vi.catalog`, menu "Danh mục" (`vi.nav.categories`).
- Tài liệu: `/user-manual` (tên menu, đường dẫn, thuật ngữ; `updatedAt` 2026-09-19), README, CLAUDE.md.

**Sai khác so với plan**
- Đổi tên thêm thư mục/module `exam-catalog` → `catalog` (API và lang-app) vì Step 2 đặt mẫu bài học cùng chỗ. Loại đề giữ tên `ExamBlueprint*` / `exam-blueprints`.
- Không thêm redirect từ URL cũ `/…/exam-categories` (chưa có production; URL cũ trả 404).

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass (lang-api 190 test).
- Migration: chạy → `migration:generate` báo "No changes" → revert → chạy lại OK; dữ liệu seed (EN, JA) giữ nguyên, FK loại đề trỏ `categories`.
- API thật (:3101): route cũ 404; CRUD danh mục hệ thống; xoá danh mục có loại đề → 409; tenant thử: danh mục riêng + hệ thống, loại đề riêng, tạo đề, lọc đề theo danh mục, xem đề. Đã xoá tenant thử.
- lang-app (`next start`): `/admin/categories`, `/t/{slug}/dashboard/categories` 200, URL cũ 404, proxy `/api` hoạt động. Chưa bấm giao diện bằng trình duyệt (nội dung render phía client) – nên mở thử 2 trang Danh mục khi kiểm :3001.

**Lưu ý cho step sau**
- `CategoryItem.blueprintCount` hiện chỉ đếm loại đề; Step 2 thêm số mẫu bài học và chặn xoá danh mục có mẫu bài học.
- Chuỗi `vi.catalog.categories.subtitle` còn nói "nhóm loại đề"; Step 2 sửa thành loại đề + mẫu bài học.

### Step 2 – Mẫu bài học (2026-09-19)

**Đã làm**
- Migration `1789798273850-CreateLessonBlueprints` (sinh bằng `migration:generate`, `down` rút gọn): `lesson_blueprints` (như `exam_blueprints`, FK `categories` RESTRICT) + `lesson_modules` (không có thời lượng, unique mã deferred).
- lang-api (`catalog/`): `LessonBlueprint`, `LessonModule`, `LessonBlueprintsService` (chép `ExamBlueprintsService`: phạm vi hệ thống/tenant, danh mục phải thấy được & đang dùng, mã unique theo phạm vi, lưu cả danh sách phần), DTO, `AdminLessonBlueprintsController` (`admin/lesson-blueprints`), `TenantLessonBlueprintsController` (`t/:slug/lesson-blueprints`: xem Owner/Admin/Teacher, sửa Owner/Admin); `ROUTES` thêm 8 dòng. Unit test service + DTO.
- `CategoriesService`: đếm và chặn xoá theo cả loại đề lẫn mẫu bài học; `CategoryItem.blueprintCount` → `examBlueprintCount` + `lessonBlueprintCount`.
- `@lang/shared`: `LessonBlueprintItem`, `LessonModuleItem`, `LessonModuleInput`, `LESSON_BLUEPRINT_MIN/MAX_MODULES`.
- lang-app: `LessonBlueprintsView` + `LessonBlueprintFormModal` (chép bản loại đề), `ModulesEditor` thêm `variant="lesson"` (bỏ ô thời lượng, chữ "phần"); trang `/admin/lesson-blueprints`, `/t/{slug}/dashboard/lesson-blueprints`; menu "Mẫu bài học"; nhóm menu đổi tên **Đề thi & Bài học** (plan 6.1); trang Danh mục có 2 cột Loại đề / Mẫu bài học.
- Tài liệu: `/user-manual` (trang danh mục hệ thống + trung tâm, thuật ngữ, vai trò, giới hạn, tên nhóm menu), README, CLAUDE.md.

**Sai khác so với plan**
- Không tạo `LessonCatalogModule` riêng: mẫu bài học nằm trong `CatalogModule` (`catalog/`, đã đổi tên ở Step 1) cạnh loại đề; service/entity/controller vẫn tách riêng.
- `ModulesEditor` dùng chung (thêm `variant`) thay vì chép, vì chỉ khác ô thời lượng.
- Chưa có cột "Số bài học" và chưa chặn nút xoá mẫu đang dùng: bảng `lessons` có ở Step 4. `remove` đã bắt lỗi khoá ngoại → 409 "Mẫu bài học đang có bài học sử dụng…".

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass (lang-api 198 test).
- Migration: chạy → "No changes" → revert → chạy lại OK.
- API thật (:3101): System Owner tạo **Minna no Nihongo – 1 bài** (5 phần, thứ tự đúng); mã trùng 409, không có phần 400; danh mục JA đếm 1 loại đề + 1 mẫu, xoá JA → 409. Tenant thử: thấy mẫu hệ thống, sửa mẫu hệ thống 403, tạo mẫu riêng (trùng mã hệ thống được), sửa danh sách phần giữ id phần cũ. Teacher: xem được cả 2 mẫu, tạo/sửa/xoá 403. Đã xoá tenant + giáo viên thử.
- lang-app (`next start`): 2 trang mẫu bài học 200. Chưa bấm giao diện bằng trình duyệt.

**Lưu ý cho step sau**
- Step 4: thêm `LessonBlueprintsService.findUsable` (như loại đề), cột "Số bài học" (`lessonCount`) và khoá nút xoá mẫu đang dùng; FK `lessons.blueprint_id` NO ACTION.

### Step 3 – Editor: khối mới & giải thích (2026-09-19)

**Đã làm**
- `@lang/exam-core`:
  - `IndicatorKind` thêm `explanation` (nhãn "Explanation"). `explanation.ts`: `extractExplanations`/`explanationsFromPlan` → `SectionExplanation { nodeId, numbers, blocks }`, `explanationsFor`, `isExplanation`. Quy tắc gắn (người dùng chốt đầu phiên): đi ngược lên, bỏ qua explanation khác; gặp question thì lấy mọi số câu của nó, gặp part/subpart hoặc hết thì `numbers: []`.
  - `stripAnswers` bỏ nội dung giải thích, giữ indicator rỗng. `validateSection`: giải thích rỗng → cảnh báo. `buildOutline`: dòng "Explanation · câu 3–7 / không gắn câu hỏi nào". `migrateExamValue` giữ `explanation` (trước đây kind lạ bị đổi thành `question`).
  - `rich.ts`: `callout`/`toggle`/`ruby` + `blockDepth`/`toggleEnd`.
  - Test: `explanation.spec.ts`, `rich.spec.ts`; test đối chiếu LC chạy thêm bản có giải thích chèn sau mọi câu (nội dung giải thích cố tình có checkbox tick, blank, cặp ghép) → đánh số, `exam_questions`, kết quả chấm y hệt.
- lang-app:
  - Plugin `plate/exam/rich-blocks.tsx`: `CalloutPlugin` (Enter xuống dòng, Enter ở dòng trống cuối thì thoát; chọn loại ngay trên khối), `TogglePlugin` (Enter cuối tiêu đề tạo dòng thụt vào), `RubyPlugin` (inline).
  - Toolbar: dropdown Callout, nút Khối gập/mở, nút Furigana (`PromptDialog`). Slash menu: 3 callout + khối gập/mở (H1–H3 đã có). `ExplanationDialog`: hướng dẫn chi tiết + "sẽ gắn với câu …" theo vị trí con trỏ.
  - `ExamSimulator`/`ExamBlocks` render ruby, callout, `<details>` cho khối gập/mở (trong câu hỏi dừng trước nhóm lựa chọn/cặp ghép/dòng đánh số). Giải thích: `ExplanationReveal` chỉ hiện khi đã có `result` (xem trước sau khi Nộp).
  - `ExamFormModal` có ô **Hiển thị** (tạo + sửa). Danh sách đề: nhãn "Chỉ qua lớp", dòng "Bản sao của …", nút **Nhân bản** (có xác nhận, xong mở trình soạn bản sao). Trang chấm: khối "Giải thích (học viên không thấy)".
- lang-api:
  - Migration `1789799812859-ExamVisibilityCloneExplanations`: `exams.visibility` (varchar + `CHK_exams_visibility`, mặc định `tenant`), `exams.cloned_from_id` (FK tự trỏ, SET NULL), `exam_sections.explanations jsonb NOT NULL DEFAULT '[]'`.
  - `prepareSection` ghi `explanations`; helper `insertPreparedSections` dùng chung cho tạo đề, lưu nội dung, nhân bản.
  - `POST t/:slug/exams/:id/clone` (thêm vào `ROUTES`). PATCH/POST đề nhận `visibility`. `ExamListItem` thêm `visibility`, `clonedFrom`.
  - Học viên: danh sách + bộ lọc chỉ đề `tenant`; bắt đầu lượt làm đề `private` → 404; trang đề `private` → 404 nếu chưa từng làm, đã làm thì xem lịch sử (`isOpen = false`).
  - Chấm: `GradingQuestion.explanations`. `sectionPrompts` bỏ qua segment giải thích (nếu không, hướng dẫn subpart của câu đứng sau giải thích bị mất).
- Tài liệu: `/user-manual` (Vòng đời đề thi: Hiển thị, Nhân bản; Trình soạn đề: Explanation, khối trình bày, lỗi mới; Làm bài thi; Chấm bài; thuật ngữ; ma trận quyền; vai trò), CLAUDE.md.

**Sai khác so với plan**
- `exam_sections.explanations` là `NOT NULL DEFAULT '[]'` thay vì NULL (section cũ không có giải thích nên `[]` là đúng). Default entity phải viết `() => "'[]'"`: viết `'[]'::jsonb` thì `migration:generate` luôn báo lệch.
- Heading H1–H6 và highlight **đã có sẵn** từ bản chép LC (loại đoạn + nút Đánh dấu, H1–H3 trong slash menu). Step này chỉ thêm callout, khối gập/mở, furigana.
- Khối gập/mở là block phẳng (tiêu đề + các block thụt sâu hơn), không phải block chứa block con, để mọi logic câu hỏi của exam-core giữ nguyên. Trong editor luôn mở (có mũi tên và tooltip hướng dẫn). Chỉ simulator/`ExamBlocks` gập, mặc định đóng.
- Nhân bản (người dùng chốt đầu phiên): đề đã publish của bất kỳ ai **hoặc** đề mình sửa được (nháp/lưu trữ). Bản sao giữ `visibility` của đề gốc, `created_by` = người nhân bản, không kiểm loại đề còn dùng được không.
- Tạo đề cũng nhận `visibility` (plan chỉ ghi PATCH).

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass (exam-core 63, shared 61, lang-api 204 test).
- Migration: chạy → "No changes" (lần đầu lệch default jsonb → revert, sửa entity, sinh lại).
- API thật (:3101), script `accept3.js` 33 mục đều đạt. Tenant thử, đề có furigana/callout/khối gập mở/2 giải thích:
  - `exam_sections.explanations` gắn câu 1 và 2. Nội dung giải thích **không có** trong content_public và mọi response phía học viên (danh sách, bắt đầu lượt, start section, nộp, kết quả, chi tiết lượt, trang đề).
  - Người chấm nhận đúng giải thích của câu Writing.
  - Teacher đổi hiển thị đề người khác 403; giá trị lạ 400. Đề `private` biến khỏi danh sách; học viên chưa làm mở đề/bắt đầu lượt → 404; học viên đã làm vẫn xem lịch sử và kết quả.
  - Teacher nhân bản đề đã publish → nháp của Teacher, version 1, cùng nội dung (kể cả giải thích), không có bài làm. Teacher nhân bản nháp người khác 403; Student 403.
- Render `ExamSimulator`/`ExamBlocks` bằng `react-dom/server`: ruby, callout, `<details>`, khối gập trong câu hỏi không nuốt lựa chọn, giải thích ẩn khi chưa nộp. **Chưa bấm giao diện bằng trình duyệt** (editor: toolbar, slash, Enter trong callout/khối gập, furigana, hộp Explanation; xem trước hiện giải thích sau Nộp; form Hiển thị; nút Nhân bản; trang chấm) – dữ liệu thử `step3-test` còn giữ, xem phần bàn giao.

**Lưu ý cho step sau**
- Bài học dùng lại `extractExplanations`/`explanationsFor`, `ContentVisibility`, `CLONE_TITLE_SUFFIX`, và cách tạo bản sao (chạy lại `prepareSection` trên `raw_data` của version hiện tại).
- Step 5 (học bài) hiện giải thích sau khi nộp section: lấy từ `lesson_sections.explanations` của server, **không** gửi trước khi nộp.
- Step 9: làm đề `private` qua lớp phải đi đường riêng (`class_item_id`), không nới điều kiện `visibility` ở `AttemptsService.create` hiện tại.

### Step 4 – Soạn bài học (2026-09-19)

**Đã làm**
- Người dùng chốt đầu phiên: (1) chưa có `lesson_attempts` thì mọi lần lưu ghi đè version hiện tại, Step 5 bổ sung; (2) xem trước tạm dùng `ExamSimulator`. Plan Step 4/5 đã ghi lại.
- Migration `1789827136380-CreateLessons` (sinh bằng `migration:generate`, `down` rút gọn): `lessons` (FK `lesson_blueprints` NO ACTION, `visibility` mặc định `private`, `cloned_from_id` SET NULL, xoá mềm), `lesson_sections` (không có `duration_minutes`, `explanations jsonb NOT NULL DEFAULT '[]'`), `lesson_parts`, `lesson_questions`.
- lang-api `lessons/`: `LessonsService` (list/creators/create/detail/update + hiển thị/clone/publish/archive/remove), `LessonContentService` (save/versions/getVersion/restore), `lesson-section-content.ts`, mapper (`canEditLesson`), DTO, `LessonsController` (`t/:slug/lessons`, `EXAM_AUTHOR_ROLES`), `LessonAttemptLookup` (chỗ nối lượt học của Step 5). `ROUTES` thêm 13 dòng. Unit test `lesson-content.service.spec.ts` (19 test: tạo từ mẫu, version/khôi phục khi có lượt học, 409/400, giải thích, quyền Teacher/Owner/Admin, tenant khác 404, hiển thị, nhân bản, publish 422, xoá hẳn/xoá mềm, DTO).
- Mẫu bài học: `LessonBlueprintsService.findUsable`, `LessonBlueprintItem.lessonCount` (đếm cả bài xoá mềm; trang hệ thống đếm mọi tenant). lang-app: cột **Số bài học**, nút xoá khoá khi mẫu đang dùng.
- `@lang/shared`: `lesson-content.ts` (`LessonListItem`, `LessonDetail`, `LessonSectionItem`, input/version types, giới hạn `LESSON_*`; `LessonStatus`/`LessonSectionStatus` là alias enum đề thi).
- `@lang/exam-core`: `validateSection(value, { requireQuestions })`; bài học tắt cảnh báo "Section chưa có câu hỏi nào." (API `sectionIssues(…, LESSON_VALIDATE_OPTIONS)`, editor `validateOptions`).
- lang-app: `lib/lesson-api.ts`; `components/lesson-editor` (`LessonEditor`, `lesson-sections.ts`, `lesson-draft.ts`); `components/lessons/LessonFormModal`; trang `/t/{slug}/dashboard/lessons`, `lessons/[id]/edit`, `lessons/[id]/versions`; menu **Bài học** (nhóm Đề thi & Bài học). Component dùng chung của trình soạn đề thêm tuỳ chọn: `SectionTabs` (`variant="lesson"`, `onDuration` tuỳ chọn), `SectionEditor` (`validateOptions`), `PreviewDialog` (`durationMinutes` tuỳ chọn, `aside`).
- Tài liệu: `/user-manual` nhóm **Đề thi & Bài học** thêm trang **Bài học**; thuật ngữ, ma trận quyền, menu theo vai trò, vai trò Chủ sở hữu/Quản trị viên/Giáo viên, mẫu bài học (Số bài học, chặn xoá), giới hạn, ngoài phạm vi. CLAUDE.md (bài học API/app, `requireQuestions`, lệnh migrate).

**Sai khác so với plan**
- Không chép nguyên `ExamEditor` cùng mọi file con: `LessonEditor`, form, trang, bản nháp là bản riêng; `SectionEditor`/toolbar/dialog/`SectionTabs`/`PreviewDialog` dùng chung (thêm prop) vì chỉ khác thời lượng. Kiểm tra nội dung dùng lại `assertSectionShapes`/`sectionIssues` của đề thi (thuần `@lang/exam-core`).
- Thêm `requireQuestions` cho `validateSection` (plan không ghi): section lý thuyết của bài học luôn bị cảnh báo thừa nếu không tắt.
- Chưa có lượt học nên version bài học luôn là 1 (xem quyết định đầu phiên).

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass (shared 61, exam-core 63, lang-api 225 test).
- Migration: chạy → "No changes" → revert → chạy lại OK. ⚠️ Lần đầu gọi nhầm `migration:revert` khi CreateLessons chưa chạy (không có script `migration:run`) → revert mất migration Step 3; đã chạy lại, khôi phục `visibility`/`cloned_from_id` của 4 đề `step3-test` theo `accept3.js` và tính lại `exam_sections.explanations` từ `raw_data` (đề Step 3 + bản sao: 2 giải thích mỗi đề, như trước). CLAUDE.md đã ghi lệnh đúng.
- API thật (:3101), script `accept4.js` 41 mục đều đạt: Teacher tạo bài từ Minna → 5 tab đúng thứ tự, nháp/private/không thời lượng; lưu nháp còn lỗi được, publish → 422 kèm issues (không cảnh báo section lý thuyết); `baseRevision` cũ 409; publish; `lesson_sections.explanations` gắn câu 1, content_public không có giải thích/đáp án; furigana/callout/khối gập mở đọc lại nguyên vẹn. Teacher khác: xem được (`canEdit=false`), lưu/sửa/lưu trữ/xoá/khôi phục 403, **nhân bản** → nháp của mình (nội dung + giải thích), sửa bản sao được; nhân bản nháp người khác 403; Student 403. Owner đổi hiển thị bài của Teacher (không đổi version), giá trị lạ 400, lưu trữ; Teacher publish lại. Danh sách không kèm nội dung; trang version 1 version. `lessonCount` Minna = 2; mẫu riêng đang có bài → xoá 409, ngừng dùng → tạo bài 400, hết bài thì xoá được.
- lang-app (`next start`, cookie `ls_rt`): `/t/step4-test/dashboard/lessons`, `…/edit`, `…/versions`, 2 trang mẫu bài học, trang đề thi đều 200. Render `SectionTabs` bản bài học (không ô/nhãn thời lượng) và `LessonFormModal` bằng `react-dom/server`. **Chưa bấm giao diện bằng trình duyệt**: danh sách (lọc, Nhân bản, Publish, Lưu trữ, Xoá), form tạo (Hiển thị mặc định Chỉ qua lớp), trình soạn (5 tab không thời lượng, thêm section từ phần của mẫu, lưu, bản nháp, Chỉ xem với Teacher khác), xem trước (Nộp → giải thích), trang Version, cột Số bài học ở trang Mẫu bài học.

**Lưu ý cho step sau**
- Step 5: nối `LessonAttemptLookup` vào `lesson_attempts`; giữ nguyên chữ ký để `LessonsService`/`LessonContentService` không phải đổi.
- `ExamStatusBadge` dùng cho cả bài học (cùng giá trị trạng thái).
- Nội dung bài học trả cho học viên phải là `content_public` (không phải `raw_data`); giải thích chỉ sau khi nộp section.

### Step 5 – Học bài học & chấm tay bài học (2026-09-19)

**Đã làm**
- Người dùng chốt đầu phiên (ghi vào plan Step 5): "học xong" **tự động**, không có nút bấm tay; sau "Làm lại" vẫn mở được **Xem kết quả lần trước**; bài có version mới thì lượt version cũ **chỉ xem lại**.
- Migration `1789828790860-CreateLessonAttempts` (sinh bằng `migration:generate`, `down` rút gọn): `lesson_attempts` (2 index unique một phần theo `class_item_id`, FK `lessons` NO ACTION), `lesson_attempt_sections` (FK `lesson_sections` NO ACTION), `lesson_attempt_answers` (unique `(attempt_section_id, question_id)`, FK `lesson_questions` NO ACTION).
- lang-api `lesson-attempts/`: `LessonAttemptsService` (mở lượt/dùng lại lượt của version hiện tại, mở tab, autosave, nộp → chấm + đáp án + giải thích, làm lại, ghi âm bản đang làm, nghe lại bản đang làm/đã nộp), `LearnerLessonsService` (danh sách `tenant` + bộ lọc, trang bài học + các lượt học), `LearnerLessonsController`. `LessonAttemptLookup` đọc `lesson_attempts` (Save có lượt học → version mới, xoá → xoá mềm, trang Version có số lượt học). `gradeSection` của `attempts/attempt-grading.ts` nhận kiểu `QuestionRow` để dùng chung.
- Chấm bài học: `LessonGradingService` + `LessonGradingController` (`grading/lesson-attempts`, `…/:id`, `…/:id/recordings/:answerId/url`, `grading/lesson-answers/:answerId`), cùng quyền đề thi (`GRADER_ROLES`, không chấm bài mình). `ROUTES` thêm 15 dòng. Repository giả hỗ trợ thêm `MoreThan`.
- `@lang/shared`: `lesson-attempt.ts` (`LessonAttemptStatus`, `LessonAttemptSectionStatus`, `LearnerLesson*`, `LessonAttemptView`, `LessonSectionResult`, `LessonGrading*`…).
- lang-app:
  - `SimulatorProvider` thêm `review` (kết quả + đáp án + giải thích theo id indicator + điểm chấm tay) và `flags`. `ExamSimulator`: lựa chọn đúng có nhãn **Đáp án đúng**, ô trống/cặp ghép sai hiện đáp án, sắp xếp sai hiện **Thứ tự đúng**, điểm/nhận xét câu chấm tay, giải thích lấy từ `review` khi content_public chỉ còn indicator. `ExamDocument` = nội dung liền mạch (không tab Part). `renderPlan` tách ra dùng chung.
  - `components/lesson-viewer`: `LessonViewer` (tab section có dấu ✓, "Nộp phần này" hỏi lại khi còn câu chưa làm, "Làm lại", "Xem kết quả lần trước"/"Quay lại làm bài"), `lesson-review.ts`, `LessonPreviewDialog` (thay `PreviewDialog` ở trình soạn bài học và trang Version).
  - `components/lesson-learning`: `LearnerLessonList` (mục **Bài học** ở `/t/{slug}`), `LearnerLessonDetailView` (`/t/{slug}/lessons/{id}`), `LessonAttemptScreen` (`/t/{slug}/lesson-attempts/{id}`, autosave 2 giây/khi đổi tab/ẩn trang, trạng thái lưu), `SubmittedRecording`. Middleware chặn thêm `/t/:slug/lessons`, `/t/:slug/lesson-attempts`.
  - `SpeakingRecorder` nhận `upload`/`getUrl` (trang thi đề truyền hàm cũ).
  - Trang Chấm bài: bộ chọn **Đề thi | Bài học** (`?kind=lesson`), trang `/grading/lessons/{attemptId}`; `GradingAttemptView` nhận `kind` (tiêu đề giải thích "học viên thấy sau khi nộp" với bài học).
- Tài liệu: `/user-manual` nhóm **Học, thi & chấm bài** thêm trang **Học bài học**; sửa trang Bài học (xem trước, hiển thị, version, xoá), Chấm bài (Đề thi | Bài học, nộp lại bỏ điểm cũ), thuật ngữ **Lượt học**, ma trận quyền (học bài học công khai: mọi vai trò), vai trò Học viên. CLAUDE.md (lesson-attempts, chấm bài học, lang-app học bài).

**Sai khác so với plan**
- Module riêng `lesson-attempts/` (không nằm trong `lessons/`); entity lượt học đăng ký thêm ở `LessonsModule` cho `LessonAttemptLookup` (tránh import vòng).
- Thêm cột so với plan 4.3: `lesson_attempts` có `submitted_at`, `graded_at`, `auto_correct/auto_total`, `manual_count/manual_graded_count` (tổng lần nộp gần nhất, để lọc/sắp xếp trang Chấm bài); `lesson_attempt_sections` có `status` (open/submitted), `responses` = bản đang làm, `submitted_responses` = lần nộp gần nhất, `recordings` jsonb = ghi âm bản đang làm (answers bị xoá/tạo lại mỗi lần nộp nên không giữ ghi âm nháp ở đó), `order_seed`.
- `class_item_id` chưa có khoá ngoại (bảng `class_items` có ở Step 7).
- Danh sách chấm bài học là endpoint riêng `GET grading/lesson-attempts` (plan ghi `attempts?kind=`) vì dữ liệu khác loại; route thêm: `POST …/sections/:sid/retry`, `GET …/sections/:sid/recordings/:number/url`, `GET …/answers/:answerId/recording-url`, `GET grading/lesson-attempts/:id/recordings/:answerId/url`.
- `POST lessons/:id/attempts` trả lượt đã có của version hiện tại (200) thay vì 409 như đề thi.
- `gradeSection` dùng chung với đề thi thay vì chép sang `lessons/`.
- Nộp phần không có câu hỏi → 409 (phần lý thuyết chỉ cần mở).

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass (shared 61, exam-core 63, lang-api 235 test – thêm 10 test `lesson-attempts.service.spec.ts`: mở lượt/không lộ đáp án, private/nháp 404, lưu trữ 409, nộp từ autosave + đáp án + giải thích, làm lại giữ kết quả cũ, phần lý thuyết không nộp, học xong, version mới chỉ xem lại, bài chuyển private, ghi âm nháp → answer, chấm tay đếm lại + nộp lại bỏ điểm cũ + không chấm bài mình).
- Migration: chạy → "No changes" → revert → chạy lại OK. Lệnh dọn dữ liệu thử chạy được (thử trong transaction rồi rollback).
- API thật (:3101), `accept5.js` **47/47 mục đạt** trên bài Minna của `step4-test`: thêm Writing + Speaking vào tab Luyện tập (chưa có lượt học → vẫn version 1); học viên thấy bài ở danh sách, bản nháp 404; mở lượt (mở lại cùng lượt); response trước khi nộp không có giải thích/đáp án; autosave → nộp → 1/2 kèm đáp án + giải thích câu 1; nộp lại khi chưa Làm lại 409; Làm lại giữ kết quả cũ; nộp đúng 2/2, DB chỉ giữ answers lần gần nhất; ghi âm lên R2 thật, nghe lại bản nháp/đã nộp; mở hết tab → **Đã học xong**; Teacher thấy lượt chờ chấm, chấm 2 câu (Teacher khác chấm được) → graded, học viên thấy điểm + nhận xét; nộp lại → chờ chấm lại, answer cũ 404, vẫn học xong; lưu bài có lượt học → version 2, trang Version đếm 1 lượt ở v1; lượt v1 chỉ xem lại (Làm lại 409), mở bài → lượt mới trên v2.
- lang-app (`next start`, cookie `ls_rt`): `/t/step4-test`, trang bài học, màn hình học, Chấm bài (cả `?kind=lesson`), trang chấm bài học, trình soạn + trang version bài học đều 200. Render `LessonViewer` bằng `react-dom/server` với dữ liệu thật: phần đã nộp có "Đáp án đúng", giải thích, "Đúng 2/2 câu"; lượt chỉ xem lại không có nút Làm lại; phần nộp lại hiện "Chờ giáo viên chấm"; lượt mới không lộ giải thích, có nút "Nộp phần này". **Chưa bấm giao diện bằng trình duyệt**: danh sách Bài học ở trang trung tâm, trang bài học, màn hình học (tab, autosave, nộp, làm lại, xem kết quả lần trước, ghi âm – cần HTTPS/localhost), xem trước trong trình soạn, trang Chấm bài (Đề thi | Bài học) và chấm bài học.

**Lưu ý cho step sau**
- Step 7: thêm FK `lesson_attempts.class_item_id` → `class_items`. Step 9: lượt học trong lớp đi đường riêng (theo `class_item_id`, 1 lượt/mục/version); `canSubmitAttempt` hiện đòi `class_item_id IS NULL` và bài `visibility = tenant` – phải mở rộng cho lượt trong lớp (bài `private` học qua lớp được), lớp không `ongoing` thì chặn nộp.
- Step 10: `LessonGradingService` hiện cho mọi `GRADER_ROLES` chấm (trừ bài mình); đổi sang `canGrade` (plan 4.7) cùng lúc với đề thi.
- Step 11: bảng điểm bài học = `% đúng` lần gần nhất (`lesson_attempts.auto_correct/auto_total` đã là tổng lần nộp gần nhất) + ✔ học xong lấy từ **bất kỳ** lượt `completed` (giả định 2).
- Step 12: sự kiện "chấm xong bài học" → chuông; điểm gọi là `LessonGradingService.grade` (khi `graded_at` vừa có).
- Nhân bản đề/bài/giáo trình không chép lượt học; xoá bài học có lượt học vẫn là xoá mềm.

### Step 6 – Khoá học & giáo trình tham khảo (2026-09-19)

**Đã làm**
- Người dùng chốt đầu phiên (ghi vào plan Step 6): xoá khoá học chỉ **bỏ gắn** giáo trình; ảnh bìa qua `MediaDialog` dùng chung; danh mục đang có khoá học → xoá 409; mã khoá học theo quy tắc mã danh mục (in hoa).
- Migration `1789831276329-CreateCoursesCurricula` (sinh bằng `migration:generate`, `down` rút gọn): `courses`, `curricula`, `course_curricula` (PK kép, CASCADE theo khoá học, NO ACTION theo giáo trình), `curriculum_groups`, `curriculum_items` (CHECK đúng 1 trong `lesson_id`/`exam_id` theo `item_type`, CHECK nhãn, 2 unique theo giáo trình, FK bài/đề NO ACTION).
- lang-api `training/`: `CoursesService` (danh sách lọc tên/mã, trạng thái, danh mục; tạo/sửa/lưu trữ bằng PATCH `status`; xoá; gắn/bỏ gắn), `CurriculaService` (danh sách lọc tên/người tạo/khoá học, `creators`, chi tiết `ungrouped` + `groups`, sửa thông tin, `PUT :id/items`, nhân bản, xoá), 2 controller, `content-usage.ts` chặn xoá bài/đề đang dùng (gọi trong `LessonsService.remove`/`ExamsService.remove`). `CategoriesService` đếm `courseCount` và chặn xoá. `ROUTES` thêm 15 dòng.
- `@lang/shared` `training.ts`: `CourseStatus`, `CurriculumItemType`, `CurriculumItemLabel`, `CURRICULUM_LABELS_BY_TYPE`, giới hạn độ dài/số lượng, kiểu `Course*`/`Curriculum*`, `SaveCurriculumItemsInput`; `CategoryItem.courseCount`.
- lang-app: menu nhóm **Đào tạo** (Khoá học, Giáo trình), trang danh sách khoá học (Teacher không có nút tạo/sửa/xoá), chi tiết khoá học (ảnh bìa, tab Thông tin · Giáo trình tham khảo: gắn bằng ô chọn, bỏ gắn có xác nhận), danh sách giáo trình (lọc khoá học/người tạo, chip mã khoá học đang gắn, Nhân bản mở luôn bản sao, Xoá), trang giáo trình (`CurriculumEditor`: Chưa xếp chương + chương, kéo thả chương/mục bằng tay cầm, nút Lên/Xuống, ô chọn Chương, nhãn, tên hiển thị + ghi chú, nhãn **Đã lưu trữ**, Lưu với `baseRevision`, cảnh báo rời trang khi chưa lưu; `ContentPickerDialog` tab Bài học | Đề thi chỉ bài/đề đã publish, "Đã có"). Trang Danh mục thêm cột **Khoá học**.
- Tài liệu: `/user-manual` nhóm mới **Đào tạo** (`07-dao-tao.json`: trang Khoá học, Giáo trình; đổi tên file nhóm sau thành `08-thi-cham-bai.json`, `09-van-hanh.json`), thuật ngữ Đào tạo, ma trận quyền + menu, vai trò Chủ sở hữu/Quản trị viên/Giáo viên, danh mục (đếm/chặn xoá khoá học), xoá đề/bài học đang nằm trong giáo trình, ngoài phạm vi. CLAUDE.md (training API + lang-app).

**Sai khác so với plan**
- `courses` unique `(tenant_id, code)` thường thay vì `lower(code)`: mã luôn in hoa (CHECK), không cần index biểu thức.
- Thêm cột `curricula.revision` (plan 4.4 thiếu, cần cho `baseRevision`).
- Payload `PUT :id/items` lồng nhau: `{ baseRevision, ungrouped: Item[], groups: [{ id?, title, items }] }`, mục gửi `itemType` + `contentId`; `sort_order` của mục tính trong từng chương.
- Lưu trữ/dùng lại khoá học bằng `PATCH { status }` (không có route riêng). Thêm `GET curricula/creators` (bộ lọc người tạo).
- Chưa có bảng lớp: xoá khoá học luôn được (Step 7 chặn khi đã có lớp).

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass (shared 61, exam-core 63, lang-api 246 test – thêm 10 test `training.service.spec.ts`: giáo trình N5 3 chương + giữ id + revision 409, trùng/nhãn sai/bài nháp/bài tenant khác/id lạ 400, bài lưu trữ giữ được nhưng không thêm mới, quyền Teacher 403 + Owner sửa được + tenant khác 404, nhân bản, xoá giáo trình đang gắn 409, khoá học (mã trùng, danh mục, lưu trữ), gắn 2 khoá + xoá khoá giữ giáo trình, DTO, chặn xoá bài/đề; thêm 1 test bài học đang nằm trong giáo trình → 409; test danh mục thêm khoá học).
- Migration: chạy → "No changes" → revert → chạy lại OK.
- API thật (:3101), `accept6.js` **47/47 mục đạt** trên `step4-test`: Teacher tạo + publish 3 bài học, 3 đề (Chỉ qua lớp); Owner tạo khoá **Tiếng Nhật N5** (mã `n5` → `N5`) + khoá thứ 2, mã trùng 409, sai định dạng 400; Teacher tạo khoá 403, Student xem khoá 403; Teacher tạo giáo trình 3 chương (bài học + bài tập + kiểm tra + thi cuối khoá), đúng thứ tự/nhãn/ghi chú, `baseRevision` cũ 409, trùng/nháp/nhãn sai 400; **Teacher khác sửa/lưu mục/xoá → 403**, xem được (`canEdit=false`), nhân bản → bản của mình (không gắn khoá), sửa bản sao không ảnh hưởng bản gốc; Owner sửa giáo trình của Teacher được; Teacher gắn 403, Owner **gắn vào 2 khoá học**, gắn lại 409, lọc giáo trình theo khoá; xoá giáo trình đang gắn 409; xoá bài học/đề đang trong giáo trình 409, lưu trữ được, mục hiện `archived`, lưu lại giữ id; danh mục có khoá học → xoá 409, `courseCount` = 1; xoá khoá học → giáo trình còn.
- lang-app (`next start`, cookie `ls_rt`): `/t/step4-test/dashboard/courses`, `…/courses/{id}`, `…/curricula`, `…/curricula/{id}`, trang Danh mục đều 200. Render `CurriculumEditor` bằng `react-dom/server` với dữ liệu thật: chế độ sửa (3 chương, 7 mục, ô nhãn + ô chương, tay cầm kéo, "Gốc: Minna bài 2"), chế độ chỉ xem cho Teacher khác (không ô nhập, hiện ghi chú, nhãn). Hàm `curriculum-draft.ts` kiểm bằng script (thả trước mục, lên/xuống, cuối chương, đổi chương, xoá chương, đổi chỗ chương, payload). **Chưa bấm giao diện bằng trình duyệt**: tạo/sửa khoá học (chọn ảnh bìa), gắn/bỏ gắn, tạo giáo trình, thêm mục qua hộp chọn, kéo thả chương/mục (kể cả sang chương khác), sửa tên hiển thị/ghi chú, lưu + báo 409 khi người khác vừa lưu, cảnh báo rời trang, nhân bản.

**Lưu ý cho step sau**
- Step 7: `assertLessonNotInUse`/`assertExamNotInUse` kiểm thêm `class_items` (mục lớp chưa xoá hay cả mục đã ẩn – bài làm vẫn trỏ tới); `CoursesService.remove` chặn khi khoá học đã có lớp (409, chỉ lưu trữ); tạo lớp chỉ từ khoá học `active`; chép giáo trình sang lớp đọc `curriculum_groups`/`curriculum_items` theo `sort_order` (ungrouped = `group_id` NULL, hiện đầu tiên) – dùng lại được `CurriculaService.getDetail`. `classrooms.source_curriculum_id` nên `ON DELETE SET NULL` (xoá giáo trình không ảnh hưởng lớp đã chép). Tab **Lớp** của trang khoá học thêm ở Step 7, **Lịch** ở Step 8.
- Giáo trình lớp (Step 7) cho thêm bài/đề đã publish bất kỳ như giáo trình tham khảo; có thể dùng lại `ContentPickerDialog`, `curriculum-draft.ts` (thêm trường ngày mở, deadline… cho mục lớp).
- Giới hạn 300 mục/100 chương đặt ở `@lang/shared` (`CURRICULUM_MAX_*`).

### Step 7 – Lớp học & giáo trình lớp (2026-09-19)

**Đã làm**
- Người dùng chốt đầu phiên (ghi vào plan Step 7):
  - Mã lớp theo quy tắc mã khoá học (in hoa).
  - Chuyển trạng thái tự do giữa Sắp mở/Đang học/Đã kết thúc, trừ nhảy thẳng Sắp mở → Đã kết thúc. Sắp mở/Đang học → Đã huỷ; Đã huỷ là trạng thái cuối.
  - Lớp kết thúc/huỷ khoá giáo trình lớp và thêm/xoá giáo viên, học viên; thông tin và trạng thái vẫn sửa được.
  - Xoá mục chưa có bài làm → xoá hẳn; có bài làm → ẩn (khôi phục được).
  - "Nhập từ giáo trình" gộp ở client rồi Lưu.
- Migration `1789833902308-CreateClassrooms` (sinh bằng `migration:generate`, `down` rút gọn):
  - `classrooms`: unique `(tenant_id, code)` + CHECK mã in hoa, FK `courses` NO ACTION, `source_curriculum_id` SET NULL, `curriculum_revision`.
  - `classroom_teachers` (PK kép); `classroom_students` (unique `(classroom_id, membership_id)`, `removed_at`); `class_groups` (`opens_at`).
  - `class_items`: CHECK nội dung/nhãn/ngưỡng đậu 0–100, FK bài/đề NO ACTION, `retake_of_item_id` tự trỏ SET NULL, `removed_at`.
  - `class_change_logs` (`detail jsonb`).
  - `exam_attempts` thêm `class_item_id` (FK NO ACTION), `voided_at`, `voided_by`. `UQ_exam_attempts_in_progress` tách thành `_free` (theo đề, `class_item_id IS NULL`) và `_class` (theo mục).
  - FK `lesson_attempts.class_item_id`.
- lang-api `classrooms/`:
  - `ClassroomsService`: danh sách (Teacher chỉ thấy lớp mình); chi tiết kèm `canManage`, `canEditCurriculum`, `inProgressAttemptCount`, `hasActivity`; tạo từ khoá học đang dùng và chép giáo trình tham khảo đang gắn khoá học; sửa thông tin; đổi trạng thái; xoá khi chưa có bài làm; nhật ký.
  - `ClassMembersService`: chỉ thành viên đang hoạt động đúng role; kiểm sĩ số khi đã khoá dòng lớp; xoá mềm/khôi phục học viên; cảnh báo học viên đang học lớp khác cùng khoá.
  - `ClassCurriculumService`:
    - Lưu với `baseRevision`; mục mới giữ uuid client gửi.
    - Mục bỏ đi: có bài làm thì ẩn, chưa có thì xoá.
    - Thi lại; trùng bài/đề chỉ khi là lần thi lại; ngày mở phải trước deadline.
    - Nhật ký so sánh trước/sau.
  - `classroom-access.ts` (`loadClassroomAccess`, `assertClassroomOpen`), `class-activity.ts` (`learnerCountsByItem`, `countInProgressAttempts`).
  - `AttemptsService.finalizeForClassItems` chốt lượt thi dở trong transaction đổi trạng thái; `AttemptsService.create` chỉ xét lượt tự do.
  - `CoursesService.remove` → 409 khi khoá học có lớp; danh sách khoá học có `classCount`; `content-usage.ts` kiểm cả `class_items`. `ROUTES` thêm 14 dòng.
- `@lang/shared` `classroom.ts`:
  - `ClassroomStatus`, `CLASSROOM_STATUS_TRANSITIONS`, `isClassroomClosed`.
  - `TRAINING_UTC_OFFSET` + `trainingLocalToIso`/`isoToTrainingLocal`/`isValidCalendarDate`.
  - Giới hạn `CLASSROOM_*`, `DEFAULT_PASS_THRESHOLD`; kiểu lớp/thành viên/giáo trình lớp/nhật ký (`ClassLogAction`, `ClassLogDetail`).
  - `CourseListItem.classCount`.
- lang-app:
  - Menu **Đào tạo → Lớp học**; trang `/t/{slug}/dashboard/classes` (lọc trạng thái/khoá học; Teacher chỉ thấy lớp mình).
  - Trang `/classes/{id}`: nút đổi trạng thái có xác nhận kèm số lượt thi dở; Sửa thông tin; Xoá lớp (khoá khi đã có bài làm). Tab Thông tin · Giáo viên & Học viên · Giáo trình · Nhật ký thay đổi.
  - Trang khoá học thêm tab **Lớp** (Tạo lớp chọn sẵn khoá); danh sách khoá học thêm cột **Lớp**; nút xoá khoá khi khoá học có lớp.
  - `components/classes`: `ClassroomFormModal`, `ClassMembersPanel` + `MemberPickerDialog`, `ImportCurriculumDialog`, `ClassLogList`, `class-curriculum-draft.ts`.
  - `ClassCurriculumEditor`: như giáo trình tham khảo, thêm ngày mở mục/chương, deadline, nhận bài quá hạn, ngưỡng đậu, "Thi lại cho", nút **Thêm lần thi lại (cùng đề)**, khung "Mục đã xoá" + Khôi phục. Chọn nội dung trùng mục đang ẩn thì khôi phục mục đó.
  - `curriculum-draft.ts` đổi sang generic (`DraftTree`) để dùng chung.
- Tài liệu:
  - `/user-manual`: trang **Lớp học** và **Giáo trình lớp** trong nhóm Đào tạo; sửa các trang Khoá học, Giáo trình, Đề thi & Bài học (chặn xoá theo lớp); thuật ngữ, ma trận quyền, menu, vai trò, Ngoài phạm vi.
  - CLAUDE.md: lớp học API + lang-app.

**Sai khác so với plan**
- Chưa thêm cột `classrooms.apply_tenant_holidays` (Step 8) và `late_weight`/`warning_threshold` (Step 11): chưa dùng tới, thêm ở step cần. `end_date` để NULL tới khi có thời khoá biểu.
- `classrooms` unique `(tenant_id, code)` thường (mã luôn in hoa, như khoá học) thay vì `lower(code)`.
- Không có route `POST curriculum/import/:curriculumId` (nhập ở client, người dùng chốt).
- Giáo viên/học viên đọc chung `GET :id/members` (plan ghi GET riêng); chưa có `GET :id/conflicts` (trùng lịch ở Step 8).
- Chuyển sang **Đã huỷ** cũng chốt lượt thi dở như Đã kết thúc, vì lớp huỷ cũng không nộp bài được.
- Teacher ngoài lớp nhận **403** (không phải 404) ở mọi route lớp.
- `class_change_logs.action` không có CHECK (thêm loại nhật ký không cần migration).
- `exam_attempts.voided_*` thêm luôn ở Step 7 (plan 4.5), tới Step 9 mới dùng.

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass: shared 61, exam-core 63, lang-api 258 test.
  - Thêm 11 test `classrooms.service.spec.ts`:
    - Tạo lớp chép giáo trình; khoá học lưu trữ / giáo trình không gắn / mã trùng.
    - Teacher ngoài lớp 403, giáo viên lớp sửa được, `baseRevision` 409.
    - Mục mới phải publish, deadline sau ngày mở, nhãn đúng loại.
    - Thi lại sau mục gốc, không thi lại của thi lại, chỉ đề thi; trùng đề chỉ khi thi lại.
    - Ẩn/xoá/khôi phục mục + nhật ký.
    - Sĩ số, xoá mềm, khôi phục, sai role; cảnh báo lớp khác cùng khoá.
    - Đổi trạng thái chốt lượt, khoá sửa, mở lại, huỷ là cuối.
    - Chặn xoá lớp/khoá học/bài học; DTO.
  - Thêm 1 test `attempts.service.spec.ts`: chốt lượt thi của lớp.
- Migration: chạy → "No changes" → revert → chạy lại OK.
- API thật (:3101), `accept7.js` **55/55 mục đạt** trên `step4-test`:
  - Lớp `N5-2026-01` tạo từ khoá N5 chép **đúng** "Giáo trình N5 – Minna no Nihongo" (3 chương, 7 mục; nhãn, tên, ghi chú, thứ tự).
  - Quyền: Teacher chưa thuộc lớp 403; thêm vào lớp thì xem và sửa giáo trình lớp được; **Teacher ngoài lớp xem/sửa 403**; Student 403.
  - Giáo trình lớp:
    - Thi lại đứng trước mục gốc / thi lại của thi lại / bài học làm thi lại → 400; cùng đề mà không gắn thi lại → 400.
    - Lưu được thi lại cùng đề + deadline, ngày mở, ngưỡng, không nhận quá hạn, chương mở lúc; revision cũ → 409.
    - Bài học mới chỉ có trong lớp → xoá bài học 409.
  - Sĩ số 2: **thêm 3 → 409, thêm 2 → được, thêm tiếp → 409**. Xoá mềm rồi thêm người khác được; tăng sĩ số và thêm lại người cũ → khôi phục.
  - Lớp thứ 2 cùng khoá: có cảnh báo học viên, xoá được (chưa có bài làm).
  - Trạng thái: Sắp mở → Đã kết thúc 409. Kết thúc → giáo trình/học viên 409, thông tin vẫn sửa được; mở lại được.
  - Xoá khoá học có lớp → 409. Nhật ký đủ loại dòng + chi tiết lần lưu giáo trình.
- `accept7b.js` **9/9 mục đạt**. Lượt thi dở được gắn vào mục lớp bằng SQL, vì luồng học viên làm bài trong lớp là Step 9.
  - Chi tiết lớp đếm 1 lượt dở; xoá lớp → 409.
  - Bỏ mục có bài làm → ẩn; gửi lại → khôi phục.
  - **Kết thúc lớp chốt lượt thi** (mọi section nộp tự động); nhật ký ghi số lượt bị chốt; mở lại không mở lại lượt.
  - Đã xoá lượt thi thử.
- lang-app (`next start`, cookie `ls_rt`):
  - Danh sách lớp, trang lớp, trang khoá học (tab Lớp), danh sách khoá học/giáo trình đều trả 200.
  - Render `ClassCurriculumEditor` bằng `react-dom/server` với dữ liệu thật: chế độ sửa (4 chương, 9 mục, badge "Mở 18:00 19/10/2026 · Hạn 20:00 20/10/2026 · Không nhận quá hạn · Đậu ≥ 70%", ô Mở chương lúc) và chế độ chỉ xem ("Thi lại cho: Kiểm tra chương 1").
  - Hàm `class-curriculum-draft.ts` kiểm bằng script: giữ ngày giờ ISO, đích thi lại, nhập lại giáo trình bỏ qua mục đã có, mục thiếu vào đúng chương cùng tên, mục ẩn trùng nội dung được khôi phục, uuid v4.
- **Chưa bấm giao diện bằng trình duyệt**:
  - Tạo lớp (chọn khoá → giáo trình), sửa thông tin, nút đổi trạng thái + hộp xác nhận.
  - Thêm/xoá giáo viên, học viên qua hộp chọn.
  - Giáo trình lớp: kéo thả, ô ngày giờ, thi lại, bỏ mục có bài làm, khôi phục, nhập từ giáo trình, lưu + báo 409.
  - Nhật ký; tab Lớp của khoá học.

**Lưu ý cho step sau**
- ⚠️ Lỗi có từ Step 6: xoá hẳn tenant bằng SQL (`delete from tenants …`) lỗi FK NO ACTION `curriculum_items → exams/lessons`, vì cascade xoá đề trước mục giáo trình. `class_items`, `classrooms → courses` và lượt làm → `class_items` cũng là FK NO ACTION như vậy.
  - App không có luồng xoá hẳn tenant, nên hiện chỉ ảnh hưởng lệnh dọn dữ liệu thử (đã đổi thứ tự xoá ở phần bàn giao).
  - Nếu cần xoá hẳn tenant: đổi các FK này sang `DEFERRABLE INITIALLY DEFERRED` bằng migration mới – hỏi người dùng trước.
  - Chú thích "NO ACTION để xoá cứng tenant vẫn CASCADE được" ở `curriculum-item.entity.ts` và các entity lượt làm (trỏ `exams`/`lessons`) chưa đúng.
- Step 8:
  - `classrooms.start_date`/`planned_sessions` đã sửa được qua `PATCH` nhưng chưa tính lại gì → gọi `recomputeSchedule` khi hai trường này đổi. Thêm `apply_tenant_holidays`; tính `end_date`.
  - Tab **Thời khoá biểu** ở trang lớp (thêm vào `TABS`), tab **Lịch** ở trang khoá học.
  - Map buổi ↔ `class_items`/`class_groups`: mục đã ẩn xử lý thế nào thì quyết định khi làm.
- Step 9:
  - Bắt đầu mục lớp đi đường riêng theo `class_item_id`, không dùng `AttemptsService.create` (chỉ cho lượt tự do). Đề `private` làm được qua lớp.
  - Ngày mở hiệu lực khi cả chương và mục đều có ngày mở chưa chốt (đề xuất lấy mốc muộn hơn) – hỏi người dùng.
  - `acceptLate = false` → sau deadline không bắt đầu được; deadline đề thi là hạn **bắt đầu**.
  - Chặn nộp khi lớp `isClassroomClosed`: lượt thi đã bị chốt lúc đổi trạng thái; lượt học bài học vẫn mở nhưng không nộp được.
  - Học viên đã `removed_at` không vào được lớp. `learnerCountsByItem` đếm cả lượt `voided`. `retake_of_item_id` + `pass_threshold` là dữ liệu cho nhóm thi.
- Step 10: `canGrade` dùng `classroom_teachers` (giáo viên của lớp chấm bài trong lớp).
- Step 11: thêm `late_weight`/`warning_threshold` cho lớp. Mục đã ẩn (`removed_at`) không tính chuyên cần/bảng điểm; học viên có `removed_at` ẩn khỏi bảng (giả định 15).
- Step 12: sự kiện "thêm mục mới vào giáo trình lớp" lấy từ `detail.added` trong `ClassCurriculumService.save` → chuông cho học viên.

### Step 8 – Thời khoá biểu, ngày nghỉ, lịch (2026-09-20)

**Đã làm**
- `@lang/shared` `schedule.ts`:
  - Ngày giờ `+07:00`: `trainingDateOf`, `trainingTimeOf`, `trainingDateTimeToIso`, `addCalendarDays`, `weekdayOf` (1 = T2).
  - Ô lặp: `validateScheduleSlots`, `slotOccurrences`.
  - Lịch: `recomputeSchedule` theo thuật toán plan 4.6, `heldSessionCount`.
  - Trùng lịch: `findSessionOverlaps`.
  - Kiểu API cho lịch, buổi, ngày nghỉ, cài đặt.
  - `ClassLogAction` thêm `schedule_saved`, `schedule_recomputed`, `session_updated`, `session_cancelled`, `session_restored`, `makeup_added`, `makeup_removed`, `session_links_saved`.
  - `UpdateClassroomInput` bỏ `startDate`/`plannedSessions`.
- Migration `1789836331338-CreateClassSchedule` (sinh bằng `migration:generate`, `down` rút gọn):
  - Bảng mới: `class_schedule_slots`, `class_sessions`, `class_session_teachers`, `class_session_links`, `tenant_holidays`.
  - Cột mới: `tenants.late_weight` (numeric 3,2) và `warning_threshold`, `classrooms.apply_tenant_holidays`.
  - Default `late_weight` phải viết `() => String(DEFAULT_LATE_WEIGHT)`: viết số thì `migration:generate` luôn báo lệch.
- lang-api `classrooms/`:
  - `class-schedule.ts`: tính/ghi lịch, `recomputeClassroom`. `session-data.ts`: người của buổi, trùng lịch, map nội dung, view.
  - `ClassScheduleService`: xem, xem trước, lưu lịch lặp, kiểm trùng khi thêm thành viên.
  - `ClassSessionsService`: sửa buổi, huỷ/khôi phục, buổi bù, map nội dung, chi tiết buổi cho giáo viên dạy thế.
  - `ScheduleFeedService` + `ScheduleController`: `schedule/mine`, `schedule/center`, `courses/:id/sessions`, `sessions/:sid`.
  - Mở lại lớp đã kết thúc thì tính lại lịch. Ẩn mục giáo trình lớp thì bỏ map với buổi.
  - `ROUTES` thêm 20 dòng.
- Module mới `tenant-settings/`: `t/:slug/settings` (GET/PATCH), CRUD ngày nghỉ, `POST holidays/impact`. Thêm/sửa/xoá ngày nghỉ thì tính lại mọi lớp mở có áp dụng ngày nghỉ, khoá dòng lớp theo thứ tự id, ghi nhật ký lớp khi có buổi dời.
- lang-app:
  - `components/calendar`: `CalendarView` (tuần/tháng/danh sách, ngày nghỉ xám, buổi huỷ gạch ngang, trùng lịch viền đỏ, màu theo lớp), `calendar-model.ts`, `CalendarFeedView`.
  - Tab **Thời khoá biểu** ở trang lớp (`ClassSchedulePanel`: lịch lặp + hộp xác nhận xem trước, danh sách/lịch buổi, **Thêm buổi bù**; trang lớp nhận `?tab=`). Tab **Lịch** ở trang khoá học.
  - Trang `schedule` (Lịch trung tâm có lọc khoá học/giáo viên, Lịch dạy của tôi), `sessions/[sessionId]`, `settings`.
  - `components/schedule`: `MakeupDialog`, `SessionEditDialog`, `SessionLinksDialog`, `schedule-format.ts`.
  - Hộp chọn thành viên cảnh báo trùng lịch. Nhật ký lớp hiện các dòng mới.
  - Form sửa lớp bỏ ngày bắt đầu/số buổi.
  - Menu: **Đào tạo → Lịch**, **Cài đặt** (Owner/Admin).
  - Chuỗi `vi.schedule`, `vi.tenantSettings`.
- Tài liệu `/user-manual` (`updatedAt` 2026-09-20):
  - Trang mới: **Thời khoá biểu & buổi học**, **Lịch** (nhóm Đào tạo), **Cài đặt trung tâm** (nhóm Trung tâm).
  - Cập nhật: Lớp học, Khoá học, thuật ngữ, ma trận quyền + menu, vai trò Chủ sở hữu/Quản trị viên/Giáo viên, Ngoài phạm vi.
  - CLAUDE.md, plan (route + quyết định chốt đầu phiên).

**Sai khác so với plan**
- Người dùng chốt đầu phiên:
  - Ngày bắt đầu/số buổi chỉ sửa ở tab Thời khoá biểu (PATCH lớp không nhận nữa).
  - Lịch khoá học của Teacher chỉ gồm lớp mình phụ trách + buổi dạy thế.
  - Buổi đã diễn ra chỉ sửa phòng/ghi chú/nội dung.
  - Cảnh báo dời tắt bằng **Đã kiểm tra** hoặc khi lưu giáo viên/giờ.
  - Đã ghi vào plan Step 8.
- Route đổi sang POST vì cần gửi body: `schedule/preview`, `conflicts` (nhiều người), `settings/holidays/impact` (ngày nghỉ mới chưa có id).
- Chưa có chuông thông báo (Step 12). Hàm tính lại trả danh sách buổi dời để Step 12 gửi thông báo gộp.
- Chưa có `revision` cho lịch lặp: xem trước rồi lưu, người khác lưu chen giữa thì kết quả lưu có thể khác bản xem trước.
- `UQ_class_sessions_classroom_seq` là unique thường, không có điều kiện `kind = regular`: buổi bù có `seq` NULL nên không đụng nhau.
- Tự quyết khi làm:
  - Không cho sửa lịch lặp và thao tác buổi của lớp đã kết thúc/huỷ.
  - Buổi bù phải sau thời điểm hiện tại, dài tối đa 12 giờ.
  - Giáo viên riêng của buổi phải có ít nhất 1 người, role Teacher, đang hoạt động.
  - Lớp đã huỷ không hiện trên lịch gộp và không tính trùng lịch.

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass: shared 90 test (+29 `schedule.spec.ts`), exam-core 63, lang-api 268 test (+10 test thời khoá biểu trong `classrooms.service.spec.ts`).
- Migration: chạy → "No changes" → revert → chạy lại OK.
- API thật (:3101), `accept8.js` **42/42 mục đạt** trên lớp `N5-2026-01` của `step4-test`:
  - Lịch T2+T4 10 buổi từ 05/10: xem trước không ghi; lưu ra đúng 10 ngày, kết thúc 04/11, 18:00 +07.
  - Thêm ngày nghỉ T4 07/10: ảnh hưởng báo 9 buổi dời. Buổi 2…10 lùi 1 ô **đúng bảng ví dụ T4** (kết thúc 09/11), id buổi giữ nguyên, có nhật ký. Xoá ngày nghỉ → về như cũ.
  - Huỷ buổi 5 (giáo viên lớp), các buổi sau không dời; buổi bù T7 "bù cho Buổi 5" không bị ngày nghỉ dời; khôi phục được.
  - Dạy thế buổi 3 cho `step4-teacher2`:
    - Người dạy thế thấy buổi trong **Lịch dạy của tôi** (nhãn dạy thế) và xem được chi tiết buổi. Buổi khác của lớp → 403, học viên → 403.
    - Ngày nghỉ làm buổi 3 dời → **cảnh báo dời**; "Đã kiểm tra" tắt cảnh báo.
  - Map chương + mục vào buổi 1.
  - Lớp `TRUNG-LICH` trùng giờ thứ 2:
    - Kiểm trùng khi thêm học viên báo đúng; vẫn thêm được.
    - Buổi của `N5-2026-01` hiện trùng lịch; lịch trung tâm có cờ trùng, lọc được theo giáo viên.
    - Teacher xem lịch trung tâm → 403. Lịch khoá học của Teacher chỉ có lớp mình.
  - Quyền: Teacher sửa lịch lặp/cài đặt → 403; ô chồng giờ → 400; khoảng lịch > 3 tháng → 400. Giảm còn 8 buổi: xem trước xoá buổi 9, 10.
- lang-app (`next start`, cookie `ls_rt`): trang lớp (kể cả `?tab=schedule`), chi tiết buổi, `schedule`, `settings`, khoá học trả 200.
- Render `CalendarView` bằng `react-dom/server` với dữ liệu thật (lịch trung tâm tháng 10):
  - Tuần: 2 buổi viền đỏ trùng lịch, link tới trang buổi.
  - Tháng: ngày nghỉ 21/10, buổi bù 24/10.
  - Danh sách: nhãn Đã huỷ / Trùng lịch / Đã dời.
  - Lịch của lớp; xếp cột buổi chồng giờ (`layoutDay`).
- **Chưa bấm giao diện bằng trình duyệt**:
  - Sửa lịch lặp + hộp xác nhận.
  - Thêm buổi bù; sửa buổi (giờ, giáo viên dạy thế); chọn nội dung; huỷ/khôi phục/xoá buổi bù.
  - Chuyển tuần/tháng/danh sách, lọc lịch trung tâm.
  - Thêm/sửa/xoá ngày nghỉ + hộp ảnh hưởng; cảnh báo trùng trong hộp thêm học viên.
  - Hiển thị trên màn hình hẹp (lịch tuần/tháng cuộn ngang, `min-width` 760px).

**Lưu ý cho step sau**
- Step 9:
  - "Lịch học của tôi" (`learner/schedule`) dùng lại `CalendarView`/`ScheduleFeedService.feed`: buổi của các lớp mình đang học (`classroom_students.removed_at IS NULL`), không cần giáo viên dạy thế.
  - Trang lớp học viên hiện "Nội dung buổi này" và ở mỗi mục "Học ở buổi: …" (R17), dữ liệu có sẵn ở `class_session_links`.
  - `loadConflicts` đã tính học viên.
- Step 12:
  - Gửi thông báo gộp mỗi lớp khi lịch dời. Kết quả `recomputeClassroom`/`applySchedule` có `changed` (lọc `dateChanged`); gọi ở `ClassScheduleService.save`, `TenantSettingsService.recomputeTenant`, `ClassroomsService.changeStatus`.
  - Chuông cho giáo viên dạy thế khi buổi bị dời (`movedWarning`), khi huỷ/khôi phục buổi, khi có buổi bù (V1.4).
- Step 11: `tenants.late_weight`/`warning_threshold` đã có; thêm cột ghi đè ở `classrooms` (plan 4.5).
- Khi một khoảng ngày nghỉ quá dài làm hết ô: `slotOccurrences` dừng sau 30 năm, lớp khi đó chỉ có các buổi xếp được (`endDate` theo buổi cuối).

### Step 9 – Học viên trong lớp (2026-09-20)

**Đã làm**
- Người dùng chốt đầu phiên (đã ghi vào plan Step 9):
  - Chương và mục cùng có ngày mở → lấy **mốc muộn hơn**.
  - Bài/đề của mục lớp bị **lưu trữ** sau khi giao: học viên **vẫn học/thi được**; chỉ bài/đề xoá mềm mới khoá mục.
  - "Cho làm lại" áp dụng cho **mọi lượt đề thi, kể cả đang làm dở** (chốt như hết giờ rồi đánh dấu); bài học không cần.
  - Trang lớp của học viên **không** hiện danh sách bạn cùng lớp, chỉ giáo viên và sĩ số.
- **Không có migration** (cột `class_item_id`, `voided_*` đã có từ Step 7); `migration:generate` báo "No changes".
- `@lang/shared` `class-progress.ts` (hàm thuần + kiểu API):
  - `attemptScorePercent` (R8.1, câu chấm tay `MANUAL_SCORE_MAX` = 10, làm tròn 1 chữ số).
  - `ClassAttemptState` (`in_progress`/`pending_grading`/`graded`), `ClassAttemptSummary`.
  - `examGroupResult` (điểm cao nhất trong lượt **đã chấm xong**, đậu khi ≥ 1 lượt đạt ngưỡng của mục đó, `hasPending`), `isGroupMemberRequired` (đã đậu ở lần **trước** → lần sau không bắt buộc).
  - `classItemLock` (`classroom` → `content` → `not_open` → `done` → `deadline`) + `effectiveOpensAt`.
  - Kiểu `LearnerClassItem`/`LearnerClassDetail`/`LearnerClassItemView`/`LearnerExamGroupView`/`ClassItemAttemptRow`…
  - `ClassLogAction.ATTEMPT_VOIDED` + `ClassLogDetail.itemTitle`/`studentName`.
- lang-api `classrooms/`:
  - `LearnerClassesController` (`t/:slug/learner/classes`, `classes/:id`, `classes/:id/items/:itemId/start`, `learner/schedule`) + `LearnerClassesService`.
  - `ClassAttemptsService`: `GET classes/:id/items/:itemId/attempts` và `POST classes/:id/items/:itemId/void/:attemptId`.
  - `class-gate.ts` (`isAttemptClassOngoing`/`assertAttemptClassOngoing`) dùng ở `AttemptsService.mutate`/`saveResponses`/`uploadRecording` và `canSubmitAttempt` của lượt học.
  - `AttemptsService.createForClassItem` + `insertAttempt` (tách từ `create`), `finalizeAttempt` (tách từ `finalizeForClassItems`); `LessonAttemptsService.startForClassItem` + `insertAttempt`.
  - `ScheduleFeedService.forClassrooms` cho "Lịch học của tôi"; `manualScoresByAttempt` (`class-activity.ts`); `loadContents` trả thêm `deleted`, `currentVersion`.
  - `ROUTES` thêm 6 dòng.
- lang-app:
  - `components/class-learning`: `MyClassList` ("Lớp của tôi" ở `/t/{slug}`), `LearnerClassView` + `LearnerClassBoard` (tách phần hiển thị nhận prop), `LearnerSchedulePage`, `class-learning-ui.tsx`.
  - Trang `(site)/t/[slug]/classes/[classId]` và `(site)/t/[slug]/schedule`.
  - `CalendarFeedView` nhận `sessionHref` (học viên không có link tới trang chi tiết buổi).
  - `ItemAttemptsDialog` + nút **Bài làm** ở mục đề thi có bài làm trong `ClassCurriculumEditor`.
  - API `lib/learner-class-api.ts`, chuỗi `vi.classLearning`/`vi.classAttempts`.
- Tài liệu:
  - `/user-manual`: trang mới **Lớp học của tôi** (nhóm Học, thi & chấm bài); cập nhật Giáo trình lớp (ngày mở gộp chương, nhóm thi lấy điểm cao nhất, mục **Bài làm & Cho làm lại**), vai trò Học viên/Giáo viên, thuật ngữ (Điểm %, Ngưỡng đậu, Cho làm lại), ma trận quyền (3 dòng), Ngoài phạm vi; bỏ các câu "trang lớp/lịch học của học viên chưa có".
  - CLAUDE.md (lang-api + lang-app), plan (quyết định chốt đầu phiên).

**Sai khác so với plan**
- Thêm `GET classes/:id/items/:itemId/attempts` (plan chỉ có route void): giáo viên cần danh sách lượt để bấm "Cho làm lại". `GET classes/:id/students/:membershipId/attempts` (F4) để Step 10.
- `learner/classes` trả mảng, không phân trang (một học viên ít lớp).
- Chặn ghi khi lớp không `ongoing` cắm ở cả `saveResponses`/`uploadRecording` (không đi qua `mutate`); đường đọc (`get`, `result`) vẫn chạy để xem lại được.
- "Cho làm lại" chỉ làm được khi lớp chưa kết thúc/huỷ (cùng quy tắc với giáo trình lớp ở plan mục 5).
- Mục bài học đã có lượt: chỉ hiện link **Học tiếp/Xem lại** (bỏ nút "Vào học" trùng chức năng).
- `InMemoryRepository` bổ sung FindOperator `MoreThanOrEqual`, `LessThanOrEqual`, `Between`.

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass: shared 120 test (+30 `class-progress.spec.ts`), exam-core 63, lang-api 296 test (+26 `learner-classes.service.spec.ts`, +1 `attempts.service.spec.ts`, +1 `lesson-attempts.service.spec.ts`).
- `migration:generate` → "No changes" (Step 9 không cần migration).
- API thật (:3101), `accept9.js` **45/45 mục đạt** trên lớp `N5-2026-01` của `step4-test`:
  - Lớp của tôi: đúng 1 lớp kèm khoá học/giáo viên/sĩ số/buổi kế tiếp; giáo viên không phải học viên → rỗng; người ngoài lớp mở trang lớp → **404**.
  - Trang lớp: mục chưa mở **vẫn hiện** nhưng khoá và bắt đầu → 409; mốc mở = **muộn hơn** giữa chương (05/10) và mục (01/09) → đúng chương thắng.
  - Làm bài kiểm tra trong lớp với **đề `private`**; làm lần hai → 409 "chỉ làm một lần".
  - Trượt 50% (< ngưỡng 70) → lần thi lại **bắt buộc**; thi lại 100% → điểm nhóm = **cao nhất 100%**, đậu.
  - Đậu 100% lần 1 → lần thi lại **không bắt buộc** nhưng **vẫn thi được**; thi lại 50% không làm tụt điểm nhóm.
  - Mục bài học: bấm hai lần mở **cùng lượt**, màn hình học còn nộp được.
  - Hạn đã qua + tắt "Nhận bài quá hạn" → 409; dời deadline thì vào lại được.
  - Lớp **Đã kết thúc**: nộp section đề thi 409, nộp phần bài học 409, vẫn xem lại lượt và kết quả nhóm; mọi mục khoá theo lớp. Mở lại lớp OK.
  - "Cho làm lại": giáo viên ngoài lớp **403**; giáo viên của lớp OK; lần hai → 409; học viên bắt đầu được lượt mới; nhật ký có dòng `attempt_voided` kèm tên học viên.
  - Lịch học của tôi: chỉ buổi của lớp mình; giáo viên không học lớp nào → rỗng.
  - Học viên bị xoá khỏi lớp → 404; thêm lại thì vào được và **giữ kết quả cũ**.
- lang-app (`next start`, cookie `ls_rt`): `/t/step4-test`, `/t/{slug}/classes/{id}`, `/t/{slug}/schedule`, trang lớp trong dashboard đều 200.
- Render `LearnerClassBoard` bằng `react-dom/server` với dữ liệu thật: header lớp, 5 buổi sắp tới, khung "Kết quả bài kiểm tra/bài thi" (Điểm cao nhất 100% · Đậu), giáo trình 4 chương với nhãn **Mở lúc…**, **Hạn…**, **Không nhận bài quá hạn**, **Đậu ≥ 70%**, **Đã chấm 100% Đậu**, **Chưa tới ngày mở**, **Lần 2 · Thi lại cho: … · Không bắt buộc (bạn đã đậu lần trước)**, **Học ở Buổi 1 …**, nút **Vào học/Vào làm bài/Xem kết quả**.
- **Chưa bấm giao diện bằng trình duyệt**:
  - "Lớp của tôi" ở trang trung tâm; vào trang lớp, bấm mở mục bài học/đề thi và luồng thi thật.
  - Lịch học của tôi (chuyển tuần/tháng/danh sách).
  - Hộp **Bài làm** của giáo viên và nút **Cho làm lại**.
  - Hiển thị trên màn hình hẹp.

**Lưu ý cho step sau**
- Step 10:
  - `canGrade` dùng `classroom_teachers`; lượt trong lớp tra lớp qua `class_items.classroom_id` (như `class-gate.ts`).
  - Lượt `voided` **không** được đưa vào trang Chấm bài (không tính điểm, nhóm thi, chuyên cần – giả định 8).
  - Trang bài làm chi tiết của học viên (F4) dùng `GET classes/:id/students/:membershipId/attempts` (chưa làm); danh sách theo mục đã có ở `GET classes/:id/items/:itemId/attempts`.
  - `manualScoresByAttempt` + `attemptScorePercent` dùng lại được cho bảng điểm.
- Step 11:
  - Chuyên cần chỉ tính mục đề thi có deadline; **không tính** lần thi lại không bắt buộc (`isGroupMemberRequired` = false), mục `removed_at`, lượt `voided`.
  - Học viên/phụ huynh chỉ xem chuyên cần/bảng điểm khi lớp `finished`: hiện `LearnerClassDetail` chưa có trường nào của chuyên cần.
  - Trung bình chương dùng `examGroupResult` theo chương.
- Step 12: sự kiện "mục mới/đổi deadline" cho học viên lấy từ `detail.added`/`changed` của `ClassCurriculumService.save`; "cho làm lại" cũng nên báo cho học viên.
- Step 13 (phụ huynh): `LearnerClassesService.detail` dựng sẵn trạng thái mục theo một người; phụ huynh xem con thì truyền `userId`/`membershipId` của con và bỏ nút bắt đầu.

### Step 10 – Chấm theo lớp & chuyển giao (2026-09-20)

**Đã làm**
- Người dùng chốt đầu phiên (đã ghi vào plan mục 4.7 và Step 10):
  - Giữ đúng **5 loại phạm vi** chuyển giao của plan, **không** thêm phạm vi "cả lớp".
  - Phạm vi **đề thi/bài học** chỉ áp dụng cho **bài làm tự do** (bài trong lớp giao theo mục hoặc theo từng lượt).
  - Người **được** chuyển giao **không** chuyển giao tiếp.
  - Trang bài làm chi tiết của học viên (F4) gồm **cả mục đề thi lẫn mục bài học**.
- Migration `CreateGradingDelegations` (bảng `grading_delegations`: `tenant_id`, `delegate_membership_id`, `scope_type` varchar + `@Check`, `scope_id` (đa hình, không FK), `created_by`, unique `(delegate, scope_type, scope_id)`, index `(tenant_id, scope_type, scope_id)`); `migration:generate` sau đó báo "No changes".
- `@lang/shared`: `GradingKind`, `GradingScopeType`/`GRADING_SCOPE_TYPES`, `GradingDelegation`/`GradingDelegationBox`/`GradingDelegationTarget`/`CreateGradingDelegationInput`, `GRADING_FREE_FILTER`, `GradingClassOption`/`GradingClassItemOption`/`GradingClassItemRef`; danh sách chấm bài thêm `classItem`, `classes`, `classItems`; `class-progress.ts` thêm `ClassStudentRef`/`ClassStudentAttempts`/`ClassStudentItemView`/`ClassStudentAttemptRow`/`ClassStudentLessonRow`/`AttemptReview`/`AttemptReviewSection`.
- lang-api `grading/`:
  - `grading-access.ts`: hàm thuần `canGradeAttempt` (+ `grading-access.spec.ts`, 10 test), `loadGraderScope`, `applyGraderScope` (điều kiện SQL tương đương cho danh sách), `canDelegateScope` (quyền **gốc**).
  - `GradingService`/`LessonGradingService` lọc theo phạm vi, thêm `classId`/`itemId`, trả `classes`/`classItems` (`grading-class.ts`), mỗi dòng kèm `classItem`; `nextAttemptId` lọc lại bằng `canGradeAttempt`.
  - `GradingDelegationsService` + 3 route `grading/delegations` (+ spec 7 test).
- lang-api `classrooms/`: `ClassStudentAttemptsService` + 5 route `classes/:id/students/:membershipId/...` (danh sách, xem lại lượt thi, xem lại lượt học, 2 route ghi âm); `attempts/attempt-review.ts` dựng `AttemptReviewSection` cho đề thi (dùng lại kiểu `LessonSectionResult`), bài học dùng `toSectionView` (đã export). `learner-classes.service.ts` export `orderItems`/`rootIdOf`/`buildExamGroups`/`toAttemptSummary` để dùng chung. `ROUTES` thêm 8 dòng.
- lang-app: ô lọc **Lớp**/**Mục** + cột **Lớp · Mục** ở trang Chấm bài; `GradingDelegationDialog` (nút **Chuyển giao chấm** ở trang chấm một bài); trang `/t/{slug}/dashboard/classes/{id}/students/{membershipId}` (`StudentAttemptsView` + `AttemptReviewView`), vào từ tab **Giáo viên & Học viên** và từ hộp **Bài làm**; API ở `lib/grading-api.ts` và `lib/classroom-api.ts`; chuỗi `vi.grading.delegation`/`vi.classStudentAttempts`.
- Tài liệu: `/user-manual` (trang **Chấm bài**: bộ lọc mới, mục **Ai chấm bài nào**, mục **Chuyển giao chấm**; trang **Giáo trình lớp**: mục **Bài làm của học viên**; vai trò Giáo viên; ma trận quyền 2 dòng mới + sửa dòng chấm tay; thuật ngữ **Chuyển giao chấm**), CLAUDE.md (lang-api + lang-app), plan (quyết định chốt đầu phiên).

**Sai khác so với plan**
- Route mục 6 chỉ ghi `GET students/:membershipId/attempts`; thực tế thêm `…/attempts/:attemptId`, `…/lesson-attempts/:attemptId` và 2 route ghi âm để xem lại bài làm (F4 cần đáp án + đúng/sai từng câu, và nghe lại câu Speaking).
- `GET grading/delegations` nhận `attemptId` + `kind` và trả "hộp" (phạm vi giao được + đã giao) thay vì CRUD chung: giao diện luôn mở từ một bài làm cụ thể.
- Trường lọc trả về đặt tên `classItems` (không phải `items`) vì `Paginated.items` đã dùng tên đó.
- `nextAttemptId` không dùng query builder (lọc ở JS bằng `canGradeAttempt`) để unit test với repository giả vẫn chạy.
- `GradingModule` phải `TypeOrmModule.forFeature([GradingDelegation])`: runtime dùng `autoLoadEntities`, thiếu thì 500 "No metadata".

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass: lang-api **317 test** (+10 `grading-access.spec.ts`, +7 `grading-delegations.service.spec.ts`, +4 F4 trong `classrooms.service.spec.ts`); `migration:generate` → "No changes".
- API thật (:3101), `accept10.js` **41/41 mục đạt** + `voided.js` **4/4**:
  - `step4-teacher` (giáo viên lớp + người soạn) thấy cả bài trong lớp lẫn bài tự do; `step4-teacher2` (Teacher ngoài lớp, không soạn) **không thấy bài nào**; Chủ sở hữu thấy mọi bài.
  - Lọc theo lớp / "Bài làm tự do" / mục đúng; `classId` sai định dạng → 400.
  - Teacher ngoài phạm vi mở bài → 403.
  - Chuyển giao mục lớp cho `step4-teacher2`: thấy đúng bài của mục, mở và **chấm được** (7,5 điểm); người giao vẫn chấm được; người được giao giao tiếp → 403; gỡ xong hết thấy bài.
  - Bài tự do: phạm vi thứ hai là **cả bài học**; `step3-teacher` **không còn** thấy bài làm tự do của đề do Chủ sở hữu soạn (đổi hành vi theo giả định 10), mở thẳng → 403.
  - Lượt thi đánh dấu `voided` biến khỏi hàng chờ chấm, mở thẳng → 409 (đã khôi phục dữ liệu thử).
  - F4: giáo viên lớp xem được, Teacher ngoài lớp 403; mục đề thi liệt kê cả lượt **Đã cho làm lại**; nhóm thi lại gộp mục gốc + lần thi lại; xem lại bài thi có câu trả lời, verdict từng câu và đáp án; xem lại lượt học có kết quả phần đã nộp; lượt của học viên khác → 404; membership không phải học viên lớp → 404.
- lang-app (`next start`): `/t/step4-test/dashboard/grading`, `?kind=lesson`, trang lớp và trang bài làm học viên đều **200**.
- Render `AttemptReviewView` bằng `react-dom/server` với dữ liệu thật: tab hai section, câu 1 kèm nhãn **Đáp án đúng**, ô chọn của học viên `checked` và mọi ô `disabled` (chỉ đọc).
- **Chưa bấm giao diện bằng trình duyệt**:
  - Bộ lọc Lớp/Mục và cột Lớp · Mục ở trang Chấm bài.
  - Hộp **Chuyển giao chấm** (chọn phạm vi, chọn giáo viên, gỡ).
  - Trang bài làm chi tiết của học viên và hộp **Xem bài làm** (kể cả nghe ghi âm Speaking).
  - Hiển thị trên màn hình hẹp.

**Lưu ý cho step sau**
- Step 11:
  - Chuyên cần chỉ tính **mục đề thi có deadline**; **không tính** lần thi lại không bắt buộc (`isGroupMemberRequired` = false), mục `removed_at`, lượt `voided`. "Đã làm" = đã nộp (không cần chấm xong).
  - Tham số `k`/ngưỡng lấy từ `tenants.late_weight`/`warning_threshold` (đã có), lớp ghi đè được → cần cột mới ở `classrooms` (R11.1–2).
  - Dữ liệu cho bảng điểm đã có sẵn: `ClassStudentAttemptsService.listForStudent` (theo 1 học viên) dựng đúng mục + nhóm thi; bảng điểm cả lớp nên gom theo cùng cách (`orderItems`/`buildExamGroups`/`toAttemptSummary` + `manualScoresByAttempt`).
  - Trung bình chương = trung bình `bestPercent` của các nhóm thi trong chương (giả định 9); bài học không tính.
  - Học viên/phụ huynh chỉ xem chuyên cần/bảng điểm/nhận xét khi lớp `finished`: `LearnerClassDetail` chưa có trường nào của phần này.
  - Nhận xét cuối khoá: 1 dòng/học viên/lớp, viết khi lớp `ongoing`/`finished` (T5) → bảng mới, quyền như giáo viên của lớp (`loadClassroomAccess`).
  - Excel dùng `exceljs` (giả định 13), route `GET classes/:id/export.xlsx`.
- Step 12: thông báo "được chuyển giao chấm" cho giáo viên (R18) lấy từ `GradingDelegationsService.create`.
- Step 13 (phụ huynh): `AttemptReview` **không** dùng cho phụ huynh (có đáp án); phụ huynh chỉ xem kết quả như học viên.

### Step 11 – Chuyên cần, bảng điểm, nhận xét cuối khoá (2026-09-20)

**Đã làm**
- Người dùng chốt đầu phiên (đã ghi vào plan mục 1.4):
  - Mốc **đúng hạn/muộn** xét theo **lúc bắt đầu** lượt thi (deadline là hạn bắt đầu theo R10.3), không theo lúc nộp.
  - Bảng điểm: mục **bài học** hiện `%` **chỉ trên câu tự chấm** của lần nộp gần nhất (câu chấm tay của bài học thường chưa chấm).
  - Sửa **tham số chuyên cần của lớp** ngay trong tab "Tiến độ & Chuyên cần" (lưu qua PATCH lớp, chỉ Owner/Admin).
- Migration `1789919504329-ClassProgress`: `classrooms.late_weight numeric(3,2) NULL` + `warning_threshold int NULL` (+2 CHECK, `null` = theo trung tâm), `classroom_students.final_comment` + `final_comment_by` (FK users SET NULL) + `final_comment_at`. `migration:generate` sau đó báo "No changes"; revert → chạy lại OK.
- `@lang/shared` `class-progress.ts`: `AttendanceMark` (`on_time`/`late`/`missed`/`in_progress`/`pending`/`excluded`), `attendanceMarkOf`, `attendanceRate`, `isBelowAttendanceThreshold`, `averagePercent`, `autoScorePercent`; kiểu API `ClassProgressParams`, `ClassProgressStudent`, `AttendanceColumn/Cell/Row`, `ClassAttendance`, `GradebookColumnKind`, `GradebookColumn`, `GradebookExamCell`/`GradebookLessonCell`, `GradebookGroupAverage`, `GradebookRow`, `ClassGradebook`, `ClassFinalComment`, `SaveFinalCommentInput`, `FINAL_COMMENT_MAX_LENGTH`, `LearnerClassSummary`; `LearnerClassDetail.summary`; `UpdateClassroomInput` thêm `lateWeight`/`warningThreshold`; `ClassLogAction.FINAL_COMMENT_SAVED` + `ClassLogDetail.cleared`.
- lang-api `classrooms/`: `class-progress.ts` (`loadClassProgress` nạp 1 lần rồi `attendanceColumns`/`attendanceRows`/`gradebookGroups`/`gradebookColumns`/`gradebookRows`/`learnerSummary`/`progressParams`), `ClassProgressService` (attendance, gradebook, `saveComment` trong transaction khoá lớp, `workbook` bằng `exceljs`), 4 route mới ở `ClassroomsController` (+4 dòng `ROUTES`), `INFO_FIELDS` thêm 2 tham số; `LearnerClassesService.detail` trả `summary` khi lớp `finished`.
- lang-app: `ClassAttendancePanel`, `ClassGradebookPanel` (+ hộp nhận xét) và 2 tab mới ở trang lớp; khối **Tổng kết cuối khoá** ở trang lớp của học viên; `api.download` + `lib/download.ts` (`saveBlob`) cho file Excel; API ở `lib/classroom-api.ts`; chuỗi `vi.classes.progress`/`vi.classes.gradebook`/`vi.classLearning.summary`.
- Tài liệu: `/user-manual` trang mới **Chuyên cần & bảng điểm** (cách tính, tham số lớp, 2 bảng, nhận xét, Excel), trang **Lớp học** (tab mới + 3 dòng quyền), **Lớp học của tôi** (mục "Tổng kết cuối khoá"), **Cài đặt trung tâm** (lớp ghi đè được), ma trận quyền (3 dòng), thuật ngữ (Chuyên cần, Nhận xét cuối khoá), vai trò Giáo viên/Học viên; CLAUDE.md; plan (quyết định chốt đầu phiên + route thực tế).

**Sai khác so với plan**
- Nhận xét cuối khoá dùng **cột trên `classroom_students`** như thiết kế mục 4.5 (lưu ý Step 10 đoán là bảng mới).
- Thêm mark `in_progress`: lượt đang làm dở không tính là đã nộp nhưng cũng không phải "quá hạn chưa nộp" (khi hết giờ lượt bị chốt rồi mới tính theo lúc bắt đầu).
- Tham số của lớp lưu qua `PATCH t/:slug/classes/:id` (không thêm route riêng); `canManageParams` trong `ClassAttendance` để UI biết ai sửa được.
- Route xuất Excel trả `StreamableFile` + `Content-Disposition` (`filename*=UTF-8''…`); client tải bằng `api.download` vì access token nằm trong bộ nhớ (không mở link trực tiếp được).
- Bảng chuyên cần/bảng điểm trả **cả** học viên đã rời lớp (`removed: true`), client ẩn mặc định và có checkbox "Hiện học viên đã rời lớp" (giả định 15) — không thêm query param.
- `GET learner/classes/:id` chỉ nạp phần tổng kết khi lớp `finished` (lớp `cancelled` không có – giả định 3).

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass: `@lang/shared` **142 test** (+27 hàm thuần chuyên cần), lang-api **329 test** (+9 `classrooms.service.spec.ts`, +3 `learner-classes.service.spec.ts`); `migration:generate` → "No changes".
- API thật (:3101), `accept11.js` **41/41 mục đạt** trên lớp `N5-2026-01`:
  - Quyền: giáo viên của lớp xem được, giáo viên ngoài lớp 403, học viên gọi route giáo viên 403.
  - Cột chuyên cần chỉ gồm mục đề thi có hạn nộp; đậu lần 1 → lần thi lại **Không tính**; trượt lần 1 → lần thi lại bắt buộc.
  - Hạ hạn nộp xuống giữa hai lượt: người bắt đầu trước hạn **Đúng hạn**, hai người bắt đầu sau hạn **Muộn**; mục quá hạn chưa ai làm **Chưa nộp** → tỉ lệ 50% / 25% / 25% khớp tính tay (k = 0,5).
  - Tham số lớp k = 0,2 → 10%; giáo viên PATCH lớp 403; bỏ ghi đè quay về 0,5.
  - Bảng điểm: 8 cột (nhóm thi KT1 + thi lại gộp 1 cột), điểm nhóm = cao nhất lượt đã chấm (bỏ lượt đã "Cho làm lại"), thi lại thấp hơn không hạ điểm, bài học 0% (nộp 0/2) và "chưa nộp → chưa có %", trung bình chương 100/—/—.
  - Nhận xét: giáo viên của lớp viết được (trim), giáo viên ngoài lớp 403, membership lạ 404, ghi nhật ký `final_comment_saved`.
  - Excel: tải được với `Content-Disposition` đúng tên, đọc lại bằng `exceljs` thấy 2 sheet, tiêu đề cột, 3 dòng học viên, ô điểm dạng chữ và nội dung nhận xét (`file` báo "Microsoft Excel 2007+").
  - Học viên: lớp đang học → `summary = null`; chuyển lớp sang **Đã kết thúc** → tỉ lệ 25%, cảnh báo dưới ngưỡng, 4 mục kèm nhãn, trung bình chương, nhận xét; mở lại lớp → **thời khoá biểu không đổi** (so sánh bảng `class_sessions` trước/sau).
- lang-app (`next start`): trang lớp `?tab=progress`, `?tab=gradebook` và trang lớp của học viên đều **200**; render `LearnerClassBoard` bằng `react-dom/server` với JSON thật: khối "Tổng kết cuối khoá" hiện 50%, "Đúng hạn 1 · Muộn 0 · Chưa nộp 1", cảnh báo dưới ngưỡng 70%, 4 mục kèm nhãn, trung bình chương và nhận xét.
- **Chưa bấm giao diện bằng trình duyệt**:
  - Tab Tiến độ & Chuyên cần: bảng ô màu, ô tham số của lớp (lưu/để trống), checkbox "Hiện học viên đã rời lớp".
  - Tab Bảng điểm: lọc chương, cột nhóm thi (tooltip các lần), cột trung bình, hộp nhận xét cuối khoá.
  - Nút **Xuất Excel** (tải file trong trình duyệt) và mở file bằng Excel/Numbers.
  - Khối "Tổng kết cuối khoá" của học viên khi lớp đã kết thúc, và màn hình hẹp.

**Lưu ý cho step sau**
- Step 12 (thông báo):
  - Sự kiện của Step 11: **nhận xét cuối khoá** được công bố (lớp chuyển `finished`) hoặc sửa sau đó → thông báo cho học viên (T5.3); `ClassProgressService.saveComment` và `ClassroomsService.changeStatus` là chỗ gọi.
  - Sự kiện khác đã có chỗ gọi sẵn: giao mục mới (`ClassCurriculumService.save`), chấm xong (`GradingService`/`LessonGradingService`), dời lịch (`applySchedule`/`recomputeClassroom`), được chuyển giao chấm (`GradingDelegationsService.create`).
  - Cron "sắp hết hạn/quá hạn" dùng `class_items.deadline_at` của mục đề thi **chưa có lượt nộp** của từng học viên trong lớp (`attendanceMarkOf` đang tính `missed` theo đúng dữ liệu đó).
- Step 13 (phụ huynh): `LearnerClassSummary` dùng lại được cho "Con của tôi" (`learnerSummary(data, membershipId, now)` nhận membership của con); tài liệu `/user-manual` hiện ghi phụ huynh **chưa** xem được chuyên cần/bảng điểm — Step 13 phải cập nhật lại ma trận quyền và trang phụ huynh.
- Xoá dữ liệu thử: hạn nộp mới ở 2 mục và nhận xét cuối khoá nằm trong lớp `N5-2026-01` nên xoá tenant `step4-test` là sạch.

### Step 12 – Thông báo (2026-09-21)

**Đã làm**
- Người dùng chốt đầu phiên (đã ghi vào plan mục 1.4):
  - 3 loại thông báo cho **phụ huynh** dời sang Step 13 (làm cùng trang "Con của tôi" để link đích tồn tại).
  - "Có bài mới cần chấm" chỉ gửi cho người có **quyền chấm gốc**: giáo viên của lớp (bài trong lớp) hoặc người soạn đề/bài (bài tự do); không gửi Owner/Admin, không gửi người được chuyển giao.
  - **Không** làm thông báo cấp hệ thống (trung tâm chờ duyệt…).
- Migration `1789922543142-CreateNotifications`: bảng `notifications` (`user_id`, `tenant_id` NULL, `type` + CHECK 16 loại, `params jsonb`, `link`, `dedupe_key`, `read_at`, `created_at`), index `(user_id, created_at)`, `(created_at)` (cron dọn) và unique một phần `(user_id, dedupe_key) where dedupe_key is not null`. `migration:generate` sau đó báo "No changes"; revert → chạy lại OK.
- `@lang/shared` `notification.ts`: `NotificationType` (16 loại), `NotificationParams` (`className`, `title`, `actorName`, `count`, `seq`, `at`, `percent`), `NotificationItem`, `NotificationList`, `NotificationUnreadCount`, `NOTIFICATION_RETENTION_DAYS`, `NOTIFICATION_DEADLINE_SOON_HOURS`, `NOTIFICATION_BELL_SIZE`.
- lang-api `notifications/`: `NotificationsService` (`notify` chèn `ON CONFLICT DO NOTHING` trong transaction của service gọi, `list`/`unreadCount`/`markRead`/`markAllRead`/`purgeOld`), `NotificationsController` (`me/notifications`, +4 dòng `ROUTES`), `notification-targets.ts` (người nhận + đường dẫn), `grading-notifications.ts`, `notification-sweep.ts` (`sweepClassItems`), `NotificationsScheduler` (15 phút quét mốc, 3h sáng dọn 90 ngày). `classrooms/class-notifications.ts` gom sự kiện của lớp.
- Gọi `notify` từ: `ClassMembersService.addTeachers/addStudents`, `ClassCurriculumService.save`, `ClassScheduleService.save`, `TenantSettingsService` (ngày nghỉ), `ClassroomsService.changeStatus` (mở lại lớp → dời lịch; kết thúc → nhận xét cuối khoá), `ClassSessionsService.update/cancel/createMakeup`, `ClassProgressService.saveComment`, `AttemptsService.submitSections`, `LessonAttemptsService.submit`, `GradingService.grade`, `LessonGradingService.grade`, `GradingDelegationsService.create`.
- lang-app: `components/notifications` (`NotificationBell` ở header `(site)` + `DashboardShell`, `NotificationRow`, `notification-text.ts`), trang `/me/notifications`, `lib/notification-api.ts`, chuỗi `vi.notifications` (16 câu mẫu).
- Tài liệu: `/user-manual` trang mới **Thông báo** (nhóm Tài khoản: chuông, trang Tất cả thông báo, bảng 15 sự kiện, cron), thêm đoạn ở Giáo viên/Học viên, Lớp học, Thời khoá biểu, Giáo trình lớp, Chuyên cần, Lớp của tôi, Chấm bài; thuật ngữ + ma trận quyền + giới hạn hệ thống; `updatedAt` 2026-09-21. CLAUDE.md, plan (quyết định chốt + route thực tế Step 12/13).

**Sai khác so với plan**
- `notify` nhận `EntityManager` (chạy trong transaction của sự kiện) và danh sách **userId** thay vì `users`; chống trùng bằng `dedupe_key` + `ON CONFLICT DO NOTHING` chứ không kiểm tra trước (không làm hỏng transaction).
- Thêm 2 loại ngoài R18.1: `session_makeup_added` (buổi bù) và `class_item_opened` (mục tới ngày mở, R18.1 gộp chung với "mục mới được giao" nên tách để câu chữ đúng).
- Mục mới **hẹn ngày mở** không báo lúc lưu giáo trình, để cron báo khi tới ngày (mốc hiệu lực dùng `effectiveOpensAt` của chương + mục).
- Cron quét **cửa sổ 3 ngày** (`SWEEP_WINDOW_DAYS`) cho gọn truy vấn: API dừng lâu hơn thể thì mốc rơi vào lúc dừng không được báo lại (đã ghi vào tài liệu).
- Dời lịch, huỷ buổi, buổi bù gửi **hai** thông báo (học viên → trang lớp khu vực chính, giáo viên → dashboard/chi tiết buổi) nhưng mỗi nhóm chỉ **một** thông báo gộp mỗi lớp (U5.3).
- Nhận xét cuối khoá: báo khi lớp chuyển **Đã kết thúc** (dedupe 1 lần/lớp, chỉ học viên đã có nhận xét) và báo lại mỗi lần sửa nhận xét khi lớp đã kết thúc.
- `InMemoryRepository` thêm `findAndCount` (kèm `order`/`skip`/`take`) để unit test `NotificationsService` chạy được; `testing/fake-notifications.ts` là service giả cho unit test các service khác.

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass: lang-api **341 test** (+9 `notifications.service.spec.ts`/`notification-sweep.spec.ts`, +3 sự kiện trong `classrooms.service.spec.ts`, thêm assertion ở `grading`/`attempts`); `migration:generate` → "No changes".
- API thật (:3101): `accept12.js` **36/37** (mục duy nhất không đạt là "còn lượt học chờ chấm" ở lần chạy lại – lần chạy trước đã chấm hết; `accept12b.js` kiểm riêng **11/11**):
  - Chuông/API: học viên xem được thông báo của mình kèm tên trung tâm; chưa đăng nhập → 401; đọc thông báo của người khác → 404; đọc từng cái/tất cả, lọc `?unread=true`, phân trang, `unread-count` khớp.
  - Sự kiện trên lớp thử `TB-STEP12`: thêm giáo viên/học viên, lưu giáo trình (gộp 1 thông báo cho mục mới đã mở, thông báo riêng cho lần thi lại, mục hẹn ngày mở **không** báo, giáo viên nhận "giáo trình được cập nhật"), lưu lịch lần đầu không báo dời, dời lịch → **1** thông báo gộp mỗi nhóm, huỷ buổi, buổi bù, giáo viên dạy thế.
  - Cron: đặt hạn quá khứ → sinh thông báo quá hạn; **chạy lại → 0 thông báo mới** (dedupe). Lớp `upcoming` không báo (phát hiện đúng khi lớp chưa chuyển Đang học).
  - Chấm bài: học viên nộp lại → giáo viên của lớp nhận "có bài mới cần chấm" (người nộp và giáo viên ngoài lớp không nhận); chấm xong → học viên nhận "bài đã chấm xong" kèm link lượt học; chuyển giao chấm → người được giao nhận thông báo (đã gỡ lại sau khi kiểm).
  - Dọn: xoá lớp thử + thông báo của lớp đó.
- lang-app (`next start`): `/me/notifications` **200**; render 16 loại thông báo bằng `react-dom/server` (`NotificationRow` + `notificationText`) – câu chữ tiếng Việt đúng, ngày giờ theo giờ Việt Nam.
- **Chưa bấm giao diện bằng trình duyệt**:
  - Chuông ở header khu vực chính và dashboard: số chưa đọc, mở danh sách, bấm một thông báo (đánh dấu đã đọc + đi đúng trang), **Đánh dấu đã đọc tất cả**, tự đếm lại sau 60 giây và khi quay lại tab.
  - Trang **Tất cả thông báo**: lọc Chưa đọc, phân trang, màn hình hẹp.
  - Tài khoản bấm thử: `step7-student1@example.com` / `step4-teacher@example.com` (mật khẩu `Step7-Passw0rd` cho học viên Step 7).

**Lưu ý cho step sau**
- Step 13 (phụ huynh): thêm 3 loại `NotificationType` cho phụ huynh (con quá hạn, con có kết quả bài mới, chuyên cần con dưới ngưỡng) → **phải sửa cả CHECK của bảng `notifications` (migration mới), `vi.notifications.types` và `notification-text.ts`**; người nhận lấy từ `student_guardians` (viết thêm helper cạnh `notification-targets.ts`), link tới `/t/{slug}/children/{membershipId}`.
- "Con quá hạn" dùng chung chỗ với `sweepClassItems` (đang có sẵn danh sách học viên chưa nộp); "chuyên cần dưới ngưỡng" tính bằng `learnerSummary`/`attendanceRate` khi lớp kết thúc.
- Tài liệu `/user-manual` trang **Thông báo** hiện không liệt kê sự kiện nào cho phụ huynh và ma trận quyền ghi Phụ huynh ✘ — Step 13 phải cập nhật lại.
- Xoá dữ liệu thử: `notifications` CASCADE theo user và tenant nên xoá tenant `step4-test` là sạch.

### Step 13 – Phụ huynh (2026-09-22)

**Đã làm**
- Người dùng chốt đầu phiên (đã ghi vào plan mục 1.4):
  - "Nhận xét chấm tay" của con hiện **inline** dưới mỗi lượt (tên phần · số câu · điểm · nhận xét), **không** làm trang chi tiết một lượt cho phụ huynh.
  - "Con có kết quả bài mới" gửi **mọi lúc** lượt chuyển sang đã chấm xong, kể cả đề/bài không có câu chấm tay (có kết quả ngay khi nộp) → thêm chỗ gửi ở `AttemptsService` và `LessonAttemptsService`.
  - "Chuyên cần con dưới ngưỡng" gửi **khi lớp chuyển Đã kết thúc** (1 lần/lớp/con), không quét trong khoá.
- Migration `1790035806542-GuardianNotifications`: chỉ nới CHECK `CHK_notifications_type` 16 → 19 giá trị (`child_item_overdue`, `child_attempt_graded`, `child_attendance_low`); `down` xoá thông báo của 3 loại mới trước khi gắn lại CHECK cũ. `migration:generate` sau đó báo "No changes"; revert → chạy lại OK.
- `@lang/shared` `guardian.ts`: `GuardianChild`, `ChildManualAnswer`/`ChildManualAnswers`, `ChildExamAttempt`, `ChildLessonAttempt`, `ChildOverview`, `ChildClassDetail`, `CHILD_FREE_ATTEMPT_LIMIT`; `NotificationParams.childName`.
- lang-api `guardian/`: `GuardianService` + `GuardianController` (`t/:slug/children`, `@TenantRoles(PARENT)`, 4 dòng `ROUTES`), unit test `guardian.service.spec.ts` (5 test). `LearnerClassesService` tách `listFor`/`detailFor`/`scheduleFor` nhận `LearnerViewer`; `ClassroomsModule` export service này.
- Thông báo: `notifications/guardian-notifications.ts` (`guardianUserIdsByStudent`, `notifyGuardians`, `notifyGuardiansAttemptGraded`), `guardianChildLink`, `notifyGuardiansAttendance` trong `classrooms/class-notifications.ts`; gọi từ `sweepClassItems`, `GradingService`, `LessonGradingService`, `AttemptsService.submitSections`, `LessonAttemptsService.submitSection`, `ClassroomsService.changeStatus`.
- lang-app: `components/guardian` (`MyChildrenList`, `ChildrenView`, `ChildView` + `ChildBoard`, `ChildClassBoard`, `guardian-ui.tsx`), trang `(site)/t/[slug]/children`, `/children/[membershipId]`, `/children/[membershipId]/classes/[classId]`; `LearnerClassBoard` thêm prop `readOnly`/`scheduleHref`/`itemExtra`; `lib/guardian-api.ts`; chuỗi `vi.guardian` + 3 câu mới ở `vi.notifications.types` và `notification-text.ts`.
- Tài liệu: viết lại trang **Phụ huynh** (bỏ callout "Chưa có"), thêm trang **Con của tôi** ở nhóm Học, thi & chấm bài; cập nhật **Thông báo** (3 sự kiện mới), **Thành viên**, **Lịch**, **Kết quả & lịch sử**, ma trận quyền (thêm dòng "Con của tôi", Phụ huynh nhận thông báo ✔) và **Ngoài phạm vi** (bỏ các mục Step 10–13 đã làm); `updatedAt` 2026-09-22. CLAUDE.md, plan (quyết định chốt + route thực tế + route frontend lớp của con).

**Sai khác so với plan**
- Plan mục 6.1 chưa có route frontend trang lớp của con; đã thêm `children/[membershipId]/classes/[classId]` vào plan.
- Route `children/*` chỉ mở cho role **Phụ huynh** (đúng ma trận mục 5: Owner/Admin/Teacher ✘) – Owner/Admin muốn xem học viên thì dùng dashboard lớp.
- Lịch của con nằm **trong** trang tổng quan của con (không có trang lịch riêng), nên mỗi con có lịch riêng như tiêu chí nghiệm thu đòi.
- Thông báo cho phụ huynh gửi **mỗi con một dòng** (link phải trỏ đúng con) chứ không gộp; `notifyGuardians` cho phép `params` là hàm theo từng con (dùng cho tỉ lệ chuyên cần).
- `ClassroomsService.changeStatus` đổi thứ tự: chốt lượt dở dang (`finalizeForClassItems`) **trước** rồi mới gửi thông báo nhận xét cuối khoá + chuyên cần, để số liệu chuyên cần là số cuối cùng.
- Thông báo "con có kết quả bài mới" với **bài học**: chỉ gửi khi lượt học xong mà `manual_count = 0` (bài có câu chấm tay thì đã có đường chấm tay lo), dedupe `child_lesson_done:{attemptId}` – tránh mỗi lần nộp một section lại báo.

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass: lang-api **348 test** (+5 `guardian.service.spec.ts`, +1 chuyên cần dưới ngưỡng ở `classrooms.service.spec.ts`, +1 phụ huynh quá hạn ở `notification-sweep.spec.ts`); `migration:generate` → "No changes".
- API thật (:3101) trên `step4-test`, 48/48 mục đạt (`accept13.js` 29, `accept13b.js` 10, `accept13c.js` 5, `accept13d.js` 14):
  - Quyền: phụ huynh 200; học viên/giáo viên/Chủ sở hữu **403**; chưa đăng nhập 401; học viên **không liên kết** → 404 ở cả 3 route con.
  - Tổng quan con: đúng lớp của con, chỉ lượt **ngoài lớp** (kiểm chéo `class_item_id` trong DB).
  - Trang lớp của con: giáo trình + trạng thái từng mục, điểm %/đậu-trượt, **không** có `content_public`/`answer_key`; nhận xét chấm tay đúng 6 trường; lớp đang học → `summary = null`.
  - Lịch: mỗi con một lịch, khoảng > 93 ngày → 400.
  - Thông báo: giáo viên chấm bài của con → phụ huynh nhận "bài của con đã có kết quả" (kèm tên con, link đúng con); cron sinh "con quá hạn chưa nộp" cho **cả 2 con**, chạy lại → 0 thông báo mới; lớp thử `PH-STEP13` nộp đề **tự chấm hết** → phụ huynh được báo ngay khi nộp; chuyển lớp sang Đã kết thúc → "chuyên cần của con 50%, dưới ngưỡng 70%" và phụ huynh xem được tổng kết (4 loại ô chuyên cần khớp).
- lang-app (`next start`): `/t/step4-test/children`, `/children/{id}`, `/children/{id}/classes/{id}` và `/user-manual/con-cua-toi` đều **200**; render `ChildBoard` + `ChildClassBoard` bằng `react-dom/server` với dữ liệu thật – chế độ chỉ đọc (không có nút "Vào học"/"Xem kết quả"), nhận xét chấm tay hiện đúng dưới mục **Minna bài 1**, 3 câu thông báo mới đúng tiếng Việt.
- **Chưa bấm giao diện bằng trình duyệt**:
  - Khối **Con của tôi** ở trang trung tâm, trang danh sách con, trang con (lớp · bài làm ngoài lớp · **Lịch học của con** tuần/tháng/danh sách), trang lớp của con.
  - Chuông của phụ huynh: 2 thông báo "con quá hạn chưa nộp", bấm vào đi đúng trang của từng con.
  - Tài khoản bấm thử: `step13-parent@example.com` / `Step13-Passw0rd`.

**Lưu ý cho step sau**
- Step 14 rà `ROUTES`: bảng hiện có 4 dòng `children/*`; kiểm lại toàn bộ so với plan mục 5–6.
- Trang **Ngoài phạm vi hiện tại** của `/user-manual` đến Step 12 vẫn liệt kê chấm bài theo lớp, chuyên cần, thông báo là "chưa có" – Step 13 đã sửa; rà nốt các trang khác xem còn câu nào lỗi thời.
- Dọn dữ liệu thử: `student_guardians` CASCADE theo membership nên xoá tenant `step4-test` là sạch; phụ huynh thử là **user riêng** (`step13-parent@example.com`), xoá tenant xong nhớ xoá luôn user nếu muốn sạch hẳn.
- Máy dev đang chạy API :3101 và Next :3100 của bản build Step 13.

### Step 14 – Hoàn thiện & nghiệm thu tổng (2026-09-22)

**Đã làm**
- **Rà `ROUTES`** (`access-control.e2e.spec.ts`, 157 dòng) so với plan mục 5–6: khớp hoàn toàn, **không phải sửa**. Test tự báo lỗi nếu thiếu route nên bảng luôn đủ; đã đối chiếu tay mức quyền của từng nhóm (`MANAGER` cho lớp · lịch lặp · cài đặt · gắn giáo trình; `STAFF` cho giáo trình lớp · buổi học · chuyên cần · nhận xét · chấm · chuyển giao; `MEMBER` cho `learner/*`; `PARENT_ONLY` cho `children/*`). Route frontend thực tế cũng khớp plan mục 6.1. Plan mục 6.2 đã được cập nhật ở cuối Step 13 (nằm trong diff chưa commit).
- **Rà `/user-manual`** – 12 chỗ lỗi thời/thiếu đã sửa (`updatedAt` giữ 2026-09-22):
  - `vong-doi-de-thi`, `bai-hoc`: bỏ câu "học viên làm đề/học bài trong lớp có ở **giai đoạn sau**" → trỏ sang [Lớp học của tôi].
  - `trinh-soan-de`: "Bài học **(sắp có)**" → "Bài học: hiện cho học viên sau khi nộp phần".
  - `ket-qua-lich-su`: bỏ "Chưa có trang thống kê kết quả hay trang phụ huynh xem kết quả con" → trỏ Chuyên cần & bảng điểm + Con của tôi.
  - `kien-truc`: DB (máy dev dùng Postgres local riêng từ 2026-09-19, **không** còn dùng chung với VPS), bucket private thêm prefix ghi âm bài học, vai trò lang-api thêm thời khoá biểu + cron thông báo.
  - `deploy-moi-truong`: seed bỏ "(database dùng chung)"; "Kiểm tra sau deploy" thêm bước bài học, đào tạo (khoá học → lớp → chuyên cần → Xuất Excel) và chuông thông báo.
  - `gioi-han-he-thong`: thêm bảng **Đào tạo: khoá học, giáo trình, lớp, lịch** (17 dòng: mã/tên, 1–500 buổi, 100 chương – 300 mục, sĩ số 1–1000, 1–14 ô lặp, buổi ≤ 12 giờ, ngày nghỉ ≤ 366 ngày, lịch ≤ 93 ngày, k/ngưỡng, nhận xét 4000 ký tự, 20 lượt ngoài lớp của con).
  - `su-co-thuong-gap`: thêm bảng **Lớp học, lịch và theo dõi** (12 triệu chứng của req-3).
  - `ngoai-pham-vi`: viết lại theo req-1 + req-3 mục 8 (bỏ các việc đã làm; thêm học phí/ghi danh, tắt loại thông báo, ngày nghỉ lặp hằng năm, lặp cách tuần, kiểm trùng phòng, điểm tổng kết, deadline theo buổi…).
  - `con-cua-toi`: `roles` thu từ `[PARENT, TEACHER, TENANT_ADMIN, TENANT_OWNER]` về `["PARENT"]` cho đúng phân quyền (Owner/Admin/Teacher không vào khu vực này).
  - `dashboard-trung-tam`: thêm đoạn giải thích thẻ **Bài chờ chấm** (xem mục dưới).
- **Sửa thẻ "Bài chờ chấm"** của dashboard tenant (phát hiện khi rà, người dùng chốt sửa trong Step 14): trước đây đếm mọi lượt **đề thi** `submitted` của trung tâm trừ bài của chính mình – không lọc phạm vi chấm (Step 10), không bỏ lượt `voided` (Step 9), không đếm lượt học (Step 5). Thêm `grading/grading-pending.ts` (`countPendingGrading`, dùng lại `loadGraderScope`/`applyGraderScope`, nhận `EntityManager` nên `TenantDashboardModule` **không** phải import `GradingModule`); `TenantDashboardController` truyền thêm `@CurrentUser()`, `getStats(ctx, graderId)`.
- **Rà CLAUDE.md**: thêm mục 4 "Bắt đầu phiên làm việc" trỏ checklist nghiệm thu; ghi `countPendingGrading` vào phần Quyền chấm & chuyển giao.
- **Checklist nghiệm thu tổng**: file mới [req-3-acceptance.md](req-3-acceptance.md) – 5 nhóm vai trò (System Owner/Admin · Chủ sở hữu/Quản trị viên · Giáo viên · Học viên · Phụ huynh), 54 mục kèm đường dẫn, kết quả mong đợi, tài khoản thử và phần "Sau khi deploy giai đoạn 3".

**Sai khác so với plan**
- Plan Step 14 chỉ ghi "rà ROUTES, tài liệu, CLAUDE.md + checklist"; thực tế phát sinh **một sửa code** (thẻ Bài chờ chấm) vì rà tài liệu mới lộ ra số liệu không khớp trang Chấm bài.
- Checklist nghiệm thu để ở **file riêng** (người dùng chốt) thay vì viết trong progress, để dùng lại sau mỗi lần deploy.
- Nghiệm thu chạy trên máy dev (:3100/:3101), **chưa** chạy trên :3001 như plan – deploy giai đoạn 3 làm sau khi người dùng bấm xong.

**Nghiệm thu (local)**
- 5 lệnh kiểm tra pass (553 test: shared 142, exam-core 63, lang-api 348 – không thêm test mới, đường query builder không unit test được bằng repository giả).
- `accept14.js` (script chỉ đọc, trừ 1 phép thử có khôi phục – xem dưới): **60/60 đạt** trên `step4-test` + `step3-test`, chia theo 5 vai trò như checklist. Gồm: tài liệu không còn 4 câu lỗi thời, giáo viên đọc tài liệu → 403; khoá học/giáo trình/lớp/thời khoá biểu/chuyên cần (4 loại ô, 3 học viên dưới ngưỡng)/bảng điểm/Xuất Excel/lịch trung tâm/cài đặt/nhật ký; giáo viên ngoài lớp 403, không thấy bài chấm, không vào cài đặt/lịch trung tâm/tạo lớp; học viên thấy lớp – mục khoá theo ngày mở – nhóm thi, chưa có tổng kết, không lộ `answer_key`/`content_public`, bị chặn khỏi dashboard và `children/*`; phụ huynh 2 con, lịch từng con, học viên không liên kết → 404, Chủ sở hữu vào `children` → 403.
- Thẻ **Bài chờ chấm** kiểm chéo với bộ lọc "Chờ chấm" của trang Chấm bài cho 3 vai trò × 2 tenant: đều khớp. Trên `step3-test` (1 lượt thi chờ chấm của đề do Chủ sở hữu soạn): Chủ sở hữu 1/1, `step3-teacher` 0/0 (trước khi sửa thẻ sẽ hiện 1 trong khi danh sách rỗng). Nhánh **lượt học** kiểm bằng cách tạm đặt `manual_graded_count = 1` cho lượt học trong lớp của `step7-student1` → thẻ của `step4-teacher` = 1, `step4-teacher2` = 0, rồi **trả lại 2** (đã xác nhận giá trị sau khi trả lại).
- 17 route frontend trả 200 (`next start` :3100), gồm `/user-manual/gioi-han-he-thong`, `/ngoai-pham-vi`, `/su-co-thuong-gap`, `/con-cua-toi`, `/dashboard-trung-tam` và trang dashboard tenant.
- **Chưa bấm giao diện bằng trình duyệt** – đó chính là việc còn lại của req-3: người dùng chạy [req-3-acceptance.md](req-3-acceptance.md) (cột **Bấm**).

**Lưu ý cho step sau**
- Dữ liệu thử **giữ nguyên** trên DB local (người dùng chốt) để bấm checklist; dọn sau khi xong: `delete from grading_delegations where tenant_id in (...)` → xoá tenant `step3-test`, `step4-test` → xoá user `step13-parent@example.com`.
- Máy dev đang chạy API :3101 và Next :3100 của bản build Step 14.
- Script nghiệm thu nằm trong scratchpad của phiên này (`lib14.js` + `accept14.js`); muốn giữ lâu dài thì chép vào repo, hiện **không** commit.
- Deploy giai đoạn 3: migration `ClassProgress`, `CreateNotifications`, `GuardianNotifications` chạy lúc container khởi động, **không có env mới**; dependency mới duy nhất của giai đoạn 2–3 là `exceljs` (`apps/lang-api`).

## Prompt cho Step 11

```
Bắt đầu Step 11 của req-3 (Chuyên cần, bảng điểm, nhận xét cuối khoá).

1. Làm theo mục "Bắt đầu phiên làm việc" trong CLAUDE.md: đọc docs/requirements/req-3-progress.md (phần "Bàn giao cho phiên tiếp theo" và "Lưu ý cho step sau" của Step 10), rồi đọc trong docs/requirements/req-3-plan.md: mục 1.4 (Chuyên cần, Tham số, Ai xem, Bảng điểm, Nhận xét cuối khoá, Excel), giả định 9, 13, 15, 16 ở mục 2, DB mục 4 (bảng mới cho nhận xét + tham số ghi đè của lớp), phân quyền mục 5, route mục 6 (classes progress: attendance, gradebook, export.xlsx, students/:membershipId/comment) và Step 11 ở mục 7. Chỉ mở req-3-question*.md (R11, R12, T1, T2, T5, E7.3–7.4) khi cần lý do của một quyết định.
2. Trước khi code, tóm tắt ngắn cho tôi cách làm: hàm thuần tính chuyên cần và bảng điểm trong @lang/shared, migration (tham số ghi đè của lớp + nhận xét cuối khoá), API attendance/gradebook/comment/export.xlsx, tab "Tiến độ & Chuyên cần" và "Bảng điểm" ở trang lớp, phần học viên/phụ huynh chỉ thấy khi lớp đã kết thúc. Chỗ nào chưa rõ thì hỏi tôi, không tự đoán.
3. Làm lần lượt: migration → hàm thuần + unit test → service + controller kèm unit test (thêm dòng ROUTES) → lang-app → tài liệu. Sau mỗi phần chạy test.
4. Nghiệm thu thật theo tiêu chí của plan trên lớp N5-2026-01 của step4-test (dữ liệu Step 9–10 đã có lượt đúng hạn, muộn, chưa làm, thi lại). Cập nhật /user-manual, CLAUDE.md, req-3-progress.md và ghi prompt cho Step 12 ở cuối file. Chưa commit, chờ tôi yêu cầu.
```

## Prompt cho Step 12

```
Bắt đầu Step 12 của req-3 (Thông báo).

1. Làm theo mục "Bắt đầu phiên làm việc" trong CLAUDE.md: đọc docs/requirements/req-3-progress.md (phần "Bàn giao cho phiên tiếp theo" và "Lưu ý cho step sau" của Step 11), rồi đọc trong docs/requirements/req-3-plan.md: mục 1.4 (dòng Thông báo), giả định 11 ở mục 2, DB mục 4.7 (bảng notifications), phân quyền mục 5, route mục 6 (me: notifications) và Step 12 ở mục 7. Chỉ mở req-3-question*.md (R18, E11) khi cần lý do của một quyết định.
2. Trước khi code, tóm tắt ngắn cho tôi cách làm: migration notifications, NotificationsService.notify gọi từ những service nào cho từng sự kiện R18.1, 2 cron (sắp hết hạn 24 giờ / quá hạn, và dọn thông báo > 90 ngày), API /me/notifications, NotificationBell ở header khu vực chính + dashboard, trang /me/notifications, chuỗi vi.notifications. Chỗ nào chưa rõ thì hỏi tôi, không tự đoán.
3. Làm lần lượt: migration → service + cron kèm unit test (thêm dòng ROUTES) → gọi notify từ các service sự kiện → lang-app → tài liệu. Sau mỗi phần chạy test.
4. Nghiệm thu thật theo tiêu chí của plan trên tenant step4-test (lớp N5-2026-01 đã có mục có hạn nộp, bài chờ chấm, lịch có thể dời). Cập nhật /user-manual, CLAUDE.md, req-3-progress.md và ghi prompt cho Step 13 ở cuối file. Chưa commit, chờ tôi yêu cầu.
```

## Prompt cho Step 13

```
Bắt đầu Step 13 của req-3 (Phụ huynh).

1. Làm theo mục "Bắt đầu phiên làm việc" trong CLAUDE.md: đọc docs/requirements/req-3-progress.md (phần "Bàn giao cho phiên tiếp theo" và "Lưu ý cho step sau" của Step 12), rồi đọc trong docs/requirements/req-3-plan.md: mục 1.4 (dòng Phụ huynh, Ai xem), giả định 3 và 15 ở mục 2, phân quyền mục 5, route mục 6 (children) và Step 13 ở mục 7. Chỉ mở req-3-question*.md (R19, D12) khi cần lý do của một quyết định.
2. Trước khi code, tóm tắt ngắn cho tôi cách làm: API "Con của tôi" (kiểm liên kết `student_guardians` + role Parent), trang `/t/{slug}/children` và `/children/{membershipId}` (lớp, lịch, giáo trình + trạng thái mục, kết quả từng bài không đáp án, bài làm tự do, chuyên cần/bảng điểm/nhận xét sau tổng kết), 3 loại thông báo cho phụ huynh (migration thêm CHECK). Chỗ nào chưa rõ thì hỏi tôi, không tự đoán.
3. Làm lần lượt: migration (loại thông báo mới) → service + controller kèm unit test (thêm dòng ROUTES) → thông báo cho phụ huynh → lang-app → tài liệu. Sau mỗi phần chạy test.
4. Nghiệm thu thật theo tiêu chí của plan trên tenant step4-test (tạo phụ huynh liên kết 2 học viên trong lớp N5-2026-01). Cập nhật /user-manual, CLAUDE.md, req-3-progress.md và ghi prompt cho Step 14 ở cuối file. Chưa commit, chờ tôi yêu cầu.
```

## Prompt cho Step 14

```
Bắt đầu Step 14 của req-3 (Hoàn thiện & nghiệm thu tổng).

1. Làm theo mục "Bắt đầu phiên làm việc" trong CLAUDE.md: đọc docs/requirements/req-3-progress.md (phần "Bàn giao cho phiên tiếp theo" và "Lưu ý cho step sau" của Step 13), rồi đọc trong docs/requirements/req-3-plan.md: phân quyền mục 5, route mục 6 và Step 14 ở mục 7.
2. Trước khi code, tóm tắt ngắn cho tôi việc sẽ làm: rà bảng ROUTES của access-control.e2e.spec.ts so với plan mục 5–6, rà toàn bộ tài liệu /user-manual (bài học, khoá học, giáo trình, lớp, lịch, chuyên cần, thông báo, phụ huynh, ma trận quyền, giới hạn, ngoài phạm vi) xem còn câu nào lỗi thời, rà CLAUDE.md, và checklist nghiệm thu req-3 theo từng vai trò. Chỗ nào chưa rõ thì hỏi tôi, không tự đoán.
3. Làm lần lượt: rà ROUTES → rà tài liệu → checklist nghiệm thu → chạy thử theo checklist trên step4-test. Sau mỗi phần chạy 5 lệnh kiểm tra.
4. Cập nhật req-3-progress.md. Sau khi tôi kiểm giao diện xong mới commit và deploy giai đoạn 3 (migration ClassProgress, CreateNotifications, GuardianNotifications chạy lúc container khởi động; không có env mới).
```
