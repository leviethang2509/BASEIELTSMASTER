# Deploy lên VPS

Một image `ghcr.io/vunguyenquangit/lang-simulator` chứa cả lang-api và lang-app. Container `lang-simulator-app` chạy trên VPS cùng máy với LC:

| Thành phần | Cổng |
|---|---|
| lang-app (Next.js) | container 3000 → host **3001** |
| lang-api (NestJS) | 3002, chỉ trong container (Next rewrite `/api` tới đây) |
| LC | host 3000 (không liên quan) |

Container nối Postgres qua Docker network của container Postgres, database `lang-simulator`, schema `public`. **Máy dev dùng chung database này** (chưa có production).

Staging (VPS 2, chỉ deploy khi bấm nút): xem [deploy-staging.md](deploy-staging.md).

Khi container khởi động ([docker/entrypoint.sh](../../docker/entrypoint.sh)): chạy migration → lỗi thì dừng → chạy lang-api và lang-app. Healthcheck gọi `http://127.0.0.1:3000/api/health` (Next → rewrite → api → database).

## 1. Chuẩn bị (một lần)

### GitHub (repo `vunguyenquangit/lang-simulator` → Settings → Secrets and variables → Actions)

| Secret | Giá trị |
|---|---|
| `VPS_HOST` | IP VPS |
| `VPS_USER` | user SSH (có quyền chạy `docker`) |
| `VPS_SSH_KEY` | private key SSH (toàn bộ nội dung) |
| `VPS_PORT` | cổng SSH (bỏ trống = 22) |
| `GHCR_TOKEN` | Personal access token có quyền `read:packages` để VPS pull image |

Image push lên GHCR bằng `GITHUB_TOKEN` có sẵn, không cần secret riêng.

### Database

User `lang_simulator` phải có `LOGIN`, là owner database `lang-simulator` (hoặc có quyền `CREATE` trên schema `public`). Kiểm tra:

```sql
select rolcanlogin from pg_roles where rolname = 'lang_simulator';
select has_schema_privilege('lang_simulator', 'public', 'CREATE');
```

### VPS

```bash
sudo mkdir -p /opt/lang-simulator
sudo chown "$USER" /opt/lang-simulator
```

Tạo `/opt/lang-simulator/.env` theo mẫu [deploy/.env.example](../../deploy/.env.example). Nếu đã có `deploy/.env` soạn sẵn trên máy dev (không nằm trong git):

```bash
scp deploy/.env <user>@<ip-vps>:/opt/lang-simulator/.env
ssh <user>@<ip-vps> chmod 600 /opt/lang-simulator/.env
```

- `DB_NETWORK`, `DB_HOST`: network và tên container Postgres – **giống LC** (`grep -E '^(DB_HOST|DB_NETWORK)=' /opt/lightc/.env`). Hiện tại: `DB_HOST=postgres_db`, `DB_NETWORK=postgres-docker_default`.
  ```bash
  docker ps --format '{{.Names}}' | grep -i postgres
  docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' <ten-container-postgres>
  ```
  Network `bridge` mặc định không phân giải tên container; khi đó cần network do người dùng tạo (vd. của docker compose).
- `JWT_SECRET`: khác giá trị ở máy dev (`openssl rand -base64 48`).
- `JWT_ACCESS_EXPIRES_IN`, `REFRESH_EXPIRES_IN`, `COOKIE_SECURE` (từ Step 5): không bắt buộc, mặc định `15m`, `30d`, `false`. Chỉ đặt `COOKIE_SECURE=true` khi truy cập qua HTTPS, nếu không trình duyệt sẽ không gửi cookie đăng nhập.
- `R2_*` (từ Step 10): 6 biến `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_PUBLIC_BASE_URL`, `R2_PRIVATE_BUCKET` – copy y nguyên từ `apps/lang-api/.env` trên máy dev (container dùng chung 2 bucket với dev). Thiếu biến thì API vẫn khởi động được nhưng upload media và ghi âm Speaking trả 501.
- Gemini / GCP (req-5, "Định dạng bằng AI"): `GEMINI_BACKEND=vertex`, `GEMINI_MODEL`, `GEMINI_MAX_OUTPUT_TOKENS`, `GEMINI_VERTEX_LOCATION`, `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_JSON_BASE64` (VPS **không** mount file JSON – mã hoá file service account trên máy dev: `base64 -i apps/lang-api/secrets/gcp-service-account.json | tr -d '\n'`). Service account cần role **Vertex AI User**, project bật API `aiplatform.googleapis.com`. `GEMINI_API_KEY` chỉ dùng khi `GEMINI_BACKEND=aistudio`. Không bắt buộc: thiếu thì API vẫn chạy, nút AI trong trình soạn đề bị disable ("Chưa cấu hình AI") và route AI trả 501. Có cấu hình rồi vẫn phải **bật Trợ lý AI cho từng trung tâm** ở `/admin/tenants` → **Chi tiết**.
- **Không** đặt `SEED_OWNER_*` trên VPS: System Owner được seed một lần từ máy dev (database dùng chung).

Mở cổng 3001 trên firewall nếu có (vd. `ufw allow 3001/tcp`).

`docker-compose.yml` **không cần tạo tay**: workflow copy [deploy/docker-compose.yml](../../deploy/docker-compose.yml) lên `/opt/lang-simulator` mỗi lần deploy.

## 2. Deploy

Workflow [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml):

| Sự kiện | Việc chạy |
|---|---|
| Pull request vào `main` | Chỉ build image (kiểm tra Dockerfile), không push, không deploy |
| Push `main` / chạy tay (Actions → Build & Deploy → Run workflow) | Build + push image (`latest`, `sha-<commit>`) → copy `docker-compose.yml` → `docker compose pull` → `docker compose up -d --wait` |

`--wait` chờ container `healthy`; migration lỗi hoặc `/api/health` không đạt thì job deploy báo đỏ.

## 3. Kiểm tra trên VPS

```bash
cd /opt/lang-simulator
docker compose ps                              # STATUS phải là healthy
docker logs lang-simulator-app --tail 100      # [entrypoint] chạy migration … lang-api chạy tại …
curl -s http://127.0.0.1:3001/api/health       # {"status":"ok","database":"up",...}
```

Truy cập: `http://<ip-vps>:3001`.

Đổi `.env` xong phải tạo lại container: `docker compose up -d --force-recreate`.

### Ghi âm Speaking trên HTTP

Trình duyệt chỉ cho dùng micro trên HTTPS hoặc localhost, nên ở `http://<ip-vps>:3001` ô ghi âm báo không hỗ trợ (các phần khác chạy bình thường). Chưa có domain + SSL (để req sau), muốn thử ghi âm thì trên Chrome mở `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, thêm `http://<ip-vps>:3001`, bật và khởi động lại Chrome. Khi có HTTPS: đặt `COOKIE_SECURE=true` rồi tạo lại container.

### Kiểm tra nhanh sau deploy

1. `/api/health` trả `database: up`; log không có lỗi migration.
2. Đăng nhập System Owner → `/admin` có số liệu; `/admin/exam-blueprints` có TOEIC/IELTS/JLPT N2.
3. Tài khoản thử đăng ký trung tâm → System Admin duyệt → vào `/t/{slug}/dashboard`.
4. `/t/{slug}/dashboard/media`: không có cảnh báo "Chưa cấu hình Cloudflare R2", upload thử một ảnh (kiểm `R2_*` và `sharp` trong image).
5. Soạn + publish một đề có Reading, Writing, Speaking → tài khoản học viên làm bài (ghi âm cần flag Chrome ở trên) → giáo viên chấm → học viên thấy điểm.
6. Trợ lý AI (nếu đã điền biến Gemini/GCP): `/admin/tenants` → **Chi tiết** trung tâm thử → bật **Trợ lý AI** → trình soạn đề có nút **Định dạng bằng AI** (không bị disable), dán một đoạn đề ngắn → bấm → nội dung được định dạng. Xong thì tắt lại nếu trung tâm thử không cần.
7. Xoá dữ liệu thử (database dùng chung với máy dev).

## 4. Rollback

```bash
cd /opt/lang-simulator
# Lấy tag trong GitHub → Packages → lang-simulator, dạng sha-<commit đầy đủ>
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-<commit>/' .env
docker compose pull && docker compose up -d --wait
```

Quay lại bản mới nhất: đặt lại `IMAGE_TAG=` (trống) rồi chạy lại lệnh trên. Lần deploy tiếp theo từ workflow **vẫn dùng `IMAGE_TAG` trong `.env`**, nhớ xoá trước khi push.

Rollback image **không hoàn tác migration**. Vì database dùng chung với máy dev, migration phải tương thích ngược (thêm cột/bảng trước, xoá sau).

## 5. Sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Container restart liên tục, log `migration thất bại` | Sai `DB_*` trong `.env` hoặc user thiếu quyền. Log ngay phía trên có chi tiết |
| `Cấu hình môi trường không hợp lệ` | Thiếu/sai biến (vd. `JWT_SECRET` < 32 ký tự) |
| `network … not found` / `Thiếu DB_NETWORK` | Sai hoặc thiếu `DB_NETWORK` |
| `getaddrinfo ENOTFOUND <DB_HOST>` | Container không cùng network với Postgres, hoặc sai tên container |
| `denied` khi pull image | `GHCR_TOKEN` hết hạn hoặc thiếu quyền `read:packages` |
| `/api/health` 503 | lang-api không kết nối được database |
| Upload media / ghi âm báo 501 | Thiếu biến `R2_*` trong `.env` (đổi xong phải `--force-recreate`) |
| Ô ghi âm báo trình duyệt không hỗ trợ | Đang truy cập qua HTTP, xem mục "Ghi âm Speaking trên HTTP" |
| Nút **Định dạng bằng AI** bị disable, tooltip "Chưa cấu hình AI" | Thiếu/sai biến Gemini/GCP; log API lúc khởi động có dòng `Gemini chưa dùng được – …` |
| Định dạng bằng AI báo "Dịch vụ AI chưa được bật…" / "Tài khoản AI thiếu quyền…" / "Thông tin xác thực AI không hợp lệ…" | Project GCP chưa bật `aiplatform.googleapis.com` / service account thiếu role Vertex AI User / JSON base64 sai. Chi tiết lỗi của Google nằm trong log API (`Gemini lỗi …`) |
