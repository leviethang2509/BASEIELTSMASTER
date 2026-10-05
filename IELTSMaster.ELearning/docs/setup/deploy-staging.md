# Deploy Staging (VPS 2)

Staging chạy trên VPS thứ hai (Ubuntu Server 24.04), **tách hẳn** VPS 1: database riêng, secret riêng, và **chỉ deploy khi có người bấm nút** trên GitHub. Workflow của VPS 1 ([deploy.md](deploy.md)) giữ nguyên.

| | VPS 1 (hiện tại) | VPS 2 – Staging |
|---|---|---|
| Workflow | `Build & Deploy` (`deploy.yml`) – tự chạy khi push `main` | `Deploy Staging` (`deploy-staging.yml`) – **chỉ chạy tay** |
| Compose | [deploy/docker-compose.yml](../../deploy/docker-compose.yml) | [deploy/staging/docker-compose.yml](../../deploy/staging/docker-compose.yml) |
| Postgres | container dùng chung với LC | container riêng `lang-simulator-staging-db` (volume `lang-simulator-staging-pgdata`) |
| App | `lang-simulator-app`, host 3001 | `lang-simulator-staging-app`, host **3000** (`APP_PORT`) |
| Image tag | `latest` | `staging` + `sha-<commit>` (không đụng `latest`) |
| User SSH | theo secret `VPS_USER` | `ielts-master` |
| Secret GitHub | `VPS_*` | `STAGING_VPS_*` (tên khác hẳn, xem bước 5) |

Thư mục trên VPS 2: `/opt/lang-simulator` gồm `docker-compose.yml` (workflow copy lên) + `.env` (tự tạo).

Quy ước: `root@vps2$` là lệnh chạy bằng root trên VPS 2, `ielts-master@vps2$` là bằng user mới, `dev$` là máy dev. `<ip-vps2>` là IP của VPS 2.

---

## Bước 1. Chuẩn bị VPS và tạo user `ielts-master`

Kiểm tra kiến trúc CPU – image chỉ build `linux/amd64`, lệnh phải in `x86_64`:

```bash
root@vps2$ uname -m
```

Cập nhật hệ thống, đặt múi giờ:

```bash
root@vps2$ apt update && apt upgrade -y
root@vps2$ timedatectl set-timezone Asia/Ho_Chi_Minh
```

Tạo user (hỏi mật khẩu – đặt mật khẩu mạnh, dùng cho `sudo`), cho quyền `sudo`:

```bash
root@vps2$ adduser ielts-master
root@vps2$ usermod -aG sudo ielts-master
```

### SSH key cho chính bạn đăng nhập

Trên máy dev (bỏ qua `ssh-keygen` nếu đã có key):

```bash
dev$ ssh-keygen -t ed25519 -C "vu@dev"          # nếu chưa có ~/.ssh/id_ed25519
dev$ ssh-copy-id ielts-master@<ip-vps2>
dev$ ssh ielts-master@<ip-vps2>                 # phải vào được không cần mật khẩu
```

### Tường lửa

```bash
root@vps2$ ufw allow OpenSSH
root@vps2$ ufw allow 3000/tcp     # cổng web của staging (APP_PORT)
root@vps2$ ufw enable
root@vps2$ ufw status
```

> Docker tự mở cổng publish mà **không qua ufw**. Vì vậy compose chỉ map Postgres ra `127.0.0.1:5432` – không đổi thành `5432:5432`.

### (Khuyến nghị) Khoá đăng nhập root bằng mật khẩu

Chỉ làm **sau khi** đã `ssh ielts-master@<ip-vps2>` bằng key thành công và `sudo -v` chạy được. Mở một phiên SSH dự phòng trước khi sửa.

```bash
root@vps2$ cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PermitRootLogin prohibit-password
PasswordAuthentication no
EOF
root@vps2$ sshd -t && systemctl reload ssh
```

## Bước 2. Cài Docker

Theo repo chính thức của Docker (không dùng bản trong kho Ubuntu).

Gỡ trước các gói Docker của Ubuntu nếu VPS cài sẵn – không thì `docker-compose-plugin` báo `trying to overwrite '/usr/libexec/docker/cli-plugins/docker-compose', which is also in package docker-compose-v2`. Gói nào không có thì apt bỏ qua; `/var/lib/docker` không bị xoá:

```bash
root@vps2$ for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do apt-get remove -y $pkg; done
root@vps2$ apt --fix-broken install -y     # chỉ cần khi đã lỡ cài dở và gặp lỗi trên
```

```bash
root@vps2$ apt install -y ca-certificates curl
root@vps2$ install -m 0755 -d /etc/apt/keyrings
root@vps2$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
root@vps2$ chmod a+r /etc/apt/keyrings/docker.asc
root@vps2$ echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
root@vps2$ apt update
root@vps2$ apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
root@vps2$ systemctl enable --now docker
```

Cho `ielts-master` chạy `docker` không cần `sudo` (GitHub Actions đăng nhập bằng user này):

```bash
root@vps2$ usermod -aG docker ielts-master
```

> Thuộc nhóm `docker` tương đương quyền root trên máy – chỉ cấp cho user deploy này.

Đăng xuất rồi vào lại để nhóm có hiệu lực, kiểm tra:

```bash
ielts-master@vps2$ docker version && docker compose version
ielts-master@vps2$ docker run --rm hello-world
```

## Bước 3. SSH key riêng cho GitHub Actions

Dùng key **riêng** cho CI (không dùng key cá nhân), không đặt passphrase:

```bash
dev$ ssh-keygen -t ed25519 -N "" -C "github-actions-staging" -f ~/.ssh/lang-simulator-staging-deploy
dev$ ssh-copy-id -i ~/.ssh/lang-simulator-staging-deploy.pub ielts-master@<ip-vps2>
dev$ ssh -i ~/.ssh/lang-simulator-staging-deploy ielts-master@<ip-vps2> 'docker ps'   # phải chạy được
```

Private key `~/.ssh/lang-simulator-staging-deploy` sẽ dán vào GitHub ở bước 5.

## Bước 4. Thư mục dự án và file `.env`

```bash
ielts-master@vps2$ sudo mkdir -p /opt/lang-simulator
ielts-master@vps2$ sudo chown ielts-master:ielts-master /opt/lang-simulator
```

Tạo `.env` theo mẫu [deploy/staging/.env.example](../../deploy/staging/.env.example). Cách gọn: soạn trên máy dev ở `deploy/staging/.env` (đã bị gitignore) rồi copy lên:

```bash
dev$ cp deploy/staging/.env.example deploy/staging/.env
dev$ openssl rand -hex 24        # → DB_PASSWORD
dev$ openssl rand -base64 48     # → JWT_SECRET
# sửa deploy/staging/.env, rồi:
dev$ scp deploy/staging/.env ielts-master@<ip-vps2>:/opt/lang-simulator/.env
dev$ ssh ielts-master@<ip-vps2> chmod 600 /opt/lang-simulator/.env
```

Lưu ý khi điền:

- `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`: container Postgres dùng chính các giá trị này để **tạo** user + database ở lần chạy đầu. Đổi sau đó không có tác dụng (phải đổi bằng SQL `ALTER USER … PASSWORD …`, rồi sửa `.env`).
- **Không** khai báo `DB_HOST`/`DB_PORT`/`DB_NETWORK`: compose tự đặt `DB_HOST=db` (tên service).
- `JWT_SECRET`: khác máy dev và VPS 1.
- `R2_*`: nên tạo 2 bucket + API token riêng cho staging (vd. `lang-simulator-staging-public`/`-private`) để dữ liệu thử không lẫn với dev. Dùng chung bucket với dev vẫn chạy (key theo id tenant/user, không đè nhau). Bỏ trống thì upload media/ghi âm trả 501.
- Gemini / GCP (`GEMINI_*`, `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_JSON_BASE64`): như [deploy.md](deploy.md) mục 1 – dùng base64 của file service account, không mount file. Dùng chung service account với dev được (lượt AI tính theo trung tâm trong database staging). Bỏ trống thì nút AI bị disable, route AI trả 501.
- `IMAGE_TAG`: để trống, workflow tự ghi.
- **Không** đặt `SEED_OWNER_*` trong file này (seed ở bước 7 truyền biến tạm).

## Bước 5. Thiết lập GitHub

### 5.1 Secrets

Repo `vunguyenquangit/lang-simulator` → **Settings → Environments → New environment** tên `staging`. Trong environment đó → **Environment secrets → Add secret**:

| Secret | Giá trị |
|---|---|
| `STAGING_VPS_HOST` | `<ip-vps2>` |
| `STAGING_VPS_USER` | `ielts-master` |
| `STAGING_VPS_SSH_KEY` | toàn bộ nội dung `~/.ssh/lang-simulator-staging-deploy` (gồm dòng `-----BEGIN…`/`-----END…`) |
| `STAGING_VPS_PORT` | cổng SSH (bỏ qua = 22) |

`GHCR_TOKEN` (PAT `read:packages`) dùng lại secret sẵn có của repo, không cần tạo lại.

> Tên secret cố ý **khác** `VPS_*` của VPS 1: nếu trùng tên mà quên tạo trong environment, GitHub sẽ lấy secret cấp repo và deploy nhầm lên VPS 1.

### 5.2 (Tuỳ chọn) Giới hạn người/nhánh được deploy

Trong environment `staging`:

- **Required reviewers**: thêm người phải duyệt trước khi job deploy chạy (thêm một lần xác nhận ngoài nút Run workflow).
- **Deployment branches and tags**: chọn *Selected branches* nếu chỉ muốn cho deploy một số nhánh (vd. `main`, `release/*`).

### 5.3 Workflow

File [.github/workflows/deploy-staging.yml](../../.github/workflows/deploy-staging.yml) (đã có trong repo, cần push lên GitHub để nút xuất hiện). Nó chỉ có trigger `workflow_dispatch` – **không** chạy khi push hay PR. `deploy.yml` của VPS 1 không đổi.

| Input `image_tag` | Việc chạy |
|---|---|
| Để trống | Build nhánh chọn ở ô *Use workflow from* → push `staging` + `sha-<commit>` → deploy `sha-<commit>` |
| `sha-<commit đầy đủ>` | Bỏ qua build, deploy image đã có trên GHCR (rollback, hoặc lên đúng bản VPS 1 đang chạy) |

Mỗi lần deploy: copy `deploy/staging/docker-compose.yml` → ghi `IMAGE_TAG` vào `.env` → `docker compose pull` → `docker compose up -d --wait` (chờ db + app `healthy`; migration lỗi hoặc `/api/health` không đạt thì job đỏ).

## Bước 6. Tạo container PostgreSQL

Có thể để lần deploy đầu tạo cả hai container, nhưng dựng database trước giúp kiểm tra `.env` sớm. Copy compose lên tay (các lần sau workflow tự copy):

```bash
dev$ scp deploy/staging/docker-compose.yml ielts-master@<ip-vps2>:/opt/lang-simulator/
```

```bash
ielts-master@vps2$ cd /opt/lang-simulator
ielts-master@vps2$ docker compose up -d db
ielts-master@vps2$ docker compose ps                   # db: healthy
ielts-master@vps2$ docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select current_user, current_database(), version();"'
```

User `DB_USERNAME` là owner database nên migration tạo bảng được, không cần cấp quyền thêm. Dữ liệu nằm ở volume `lang-simulator-staging-pgdata` – `docker compose down` **không** xoá volume; chỉ `docker compose down -v` mới xoá (mất toàn bộ dữ liệu staging).

Kết nối từ máy dev (DBeaver/psql) qua SSH tunnel, không mở cổng 5432 ra ngoài:

```bash
dev$ ssh -N -L 15432:127.0.0.1:5432 ielts-master@<ip-vps2>   # 5432 = DB_PUBLISH_PORT
# rồi kết nối localhost:15432, user/mật khẩu/database như .env
```

Lỗi `Bind for …:5432 failed: port is already allocated` khi `up`: trên VPS đã có tiến trình khác giữ cổng 5432 (`sudo ss -ltnp | grep 5432`, `docker ps --format '{{.Names}}\t{{.Ports}}'`). Đặt `DB_PUBLISH_PORT=15432` (cổng trống bất kỳ) trong `.env` rồi `docker compose up -d db` lại – app không bị ảnh hưởng vì nối qua network nội bộ `db:5432`.

## Bước 7. Tạo container ứng dụng (deploy lần đầu)

1. Push các file mới (`deploy/staging/*`, `.github/workflows/deploy-staging.yml`) lên `main`. Lần push này vẫn chạy workflow của VPS 1 như thường lệ – bình thường, VPS 2 không bị động tới.
2. GitHub → **Actions → Deploy Staging → Run workflow** → chọn nhánh, để trống `image_tag` → **Run workflow**.
3. Chờ job `Build image` và `Deploy to Staging` xanh.

Kiểm tra trên VPS:

```bash
ielts-master@vps2$ cd /opt/lang-simulator
ielts-master@vps2$ docker compose ps                                # cả db và app: healthy
ielts-master@vps2$ docker logs lang-simulator-staging-app --tail 100 # [entrypoint] chạy migration … lang-api chạy tại …
ielts-master@vps2$ curl -s http://127.0.0.1:3000/api/health         # {"status":"ok","database":"up",...}
```

### Tạo System Owner đầu tiên

Database staging trống nên phải seed một lần. Chạy script đã build sẵn trong container, mật khẩu nhập ẩn (không vào lịch sử shell):

```bash
ielts-master@vps2$ read -rs SEED_OWNER_PASSWORD && export SEED_OWNER_PASSWORD
ielts-master@vps2$ docker exec \
  -e SEED_OWNER_EMAIL='owner@example.com' \
  -e SEED_OWNER_NAME='Tên System Owner' \
  -e SEED_OWNER_DOB='1990-01-31' \
  -e SEED_OWNER_PASSWORD \
  lang-simulator-staging-app node api/dist/database/seed-owner.js
ielts-master@vps2$ unset SEED_OWNER_PASSWORD
```

Mật khẩu 8–72 ký tự. Chạy lại không tạo trùng.

Truy cập: `http://<ip-vps2>:3000`, rồi làm lượt kiểm tra nhanh như mục 3 của [deploy.md](deploy.md) (thay cổng 3001 bằng 3000). Ghi âm Speaking qua HTTP cần cờ Chrome như [deploy.md](deploy.md#ghi-âm-speaking-trên-http).

## Bước 8. Vận hành

### Deploy bản mới

Actions → **Deploy Staging** → Run workflow (chọn nhánh). Không có gì tự chạy.

### Rollback

Actions → **Deploy Staging** → Run workflow với `image_tag = sha-<commit đầy đủ>` (xem tag trong GitHub → Packages → lang-simulator). Rollback image **không** hoàn tác migration.

### Đổi `.env`

```bash
ielts-master@vps2$ cd /opt/lang-simulator && docker compose up -d --force-recreate app
```

### Backup database

```bash
ielts-master@vps2$ mkdir -p ~/backups
ielts-master@vps2$ crontab -e
# thêm dòng (2h sáng mỗi ngày, giữ 14 bản):
0 2 * * * cd /opt/lang-simulator && docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > ~/backups/staging-$(date +\%F).dump && find ~/backups -name 'staging-*.dump' -mtime +14 -delete
```

Khôi phục: `docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < ~/backups/staging-<ngày>.dump`.

Chép dữ liệu từ VPS 1 sang staging (nếu cần): `pg_dump -Fc` database `lang-simulator` trên VPS 1 rồi `pg_restore` như trên – sau đó mọi người dùng VPS 1 đăng nhập được staging bằng mật khẩu cũ, cân nhắc trước khi làm.

### Sự cố thường gặp

Ngoài bảng sự cố ở [deploy.md](deploy.md#5-sự-cố-thường-gặp):

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Job báo `Permission denied (publickey)` | Sai `STAGING_VPS_SSH_KEY`/`STAGING_VPS_USER`, hoặc public key chưa vào `~ielts-master/.ssh/authorized_keys` |
| `permission denied … docker.sock` | `ielts-master` chưa thuộc nhóm `docker` (bước 2), hoặc chưa đăng nhập lại |
| `Thiếu DB_PASSWORD trong .env` | `.env` thiếu biến `DB_*` mà compose cần |
| App `password authentication failed` | Đổi `DB_PASSWORD` trong `.env` sau khi volume đã tạo – đổi bằng `ALTER USER` hoặc xoá volume (mất dữ liệu) |
| `image_tag không hợp lệ` | Nhập sai dạng; phải là `sha-` + 40 ký tự hex |
| `manifest unknown` khi pull | Tag `sha-<commit>` chưa từng được build (chạy workflow với `image_tag` trống trên đúng commit đó) |
| `failed to bind host port 0.0.0.0:3000/tcp: address already in use` | VPS đã có dịch vụ khác ở cổng 3000 (`sudo ss -ltnp \| grep :3000`). Đặt `APP_PORT=<cổng trống>` trong `.env`, `ufw allow <cổng>/tcp`, rồi `docker compose up -d --wait` hoặc chạy lại workflow (workflow chỉ sửa dòng `IMAGE_TAG`, giữ `APP_PORT`) |
| Không vào được `http://<ip-vps2>:3000` | Chưa `ufw allow 3000/tcp`, hoặc firewall của nhà cung cấp VPS chặn |
