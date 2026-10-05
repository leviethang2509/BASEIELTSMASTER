#!/bin/bash
# Chạy trong container, thư mục làm việc /app (WORKDIR của Dockerfile):
#   1. Chạy migration database; lỗi thì thoát để container không lên với schema cũ.
#   2. Chạy song song lang-api (:3002, nội bộ) và lang-app (:3000, expose).
#      Một tiến trình dừng -> tắt cả hai để Docker restart container.
set -uo pipefail

API_PORT=3002
APP_PORT=3000

echo "[entrypoint] chạy migration"
if ! node api/dist/database/migrate.js; then
  echo "[entrypoint] migration thất bại, dừng container"
  exit 1
fi

api_pid=""
app_pid=""

shutdown() {
  trap - TERM INT
  [ -n "$api_pid" ] && kill -TERM "$api_pid" 2>/dev/null
  [ -n "$app_pid" ] && kill -TERM "$app_pid" 2>/dev/null
  wait 2>/dev/null
}
trap shutdown TERM INT

echo "[entrypoint] chạy lang-api tại :${API_PORT}"
PORT="$API_PORT" node api/dist/main.js &
api_pid=$!

echo "[entrypoint] chạy lang-app tại :${APP_PORT}"
(
  cd web/apps/lang-app || exit 1
  # HOSTNAME mặc định trong container là container id -> phải ép 0.0.0.0.
  PORT="$APP_PORT" HOSTNAME=0.0.0.0 exec node server.js
) &
app_pid=$!

# Thoát ngay khi tiến trình đầu tiên kết thúc
wait -n
code=$?
echo "[entrypoint] một tiến trình đã dừng (code ${code}), tắt container"
shutdown
exit "$code"
