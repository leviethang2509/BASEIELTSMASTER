# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Lang Simulator – một image chứa cả lang-api (NestJS) và lang-app (Next.js).
# Next.js nghe cổng 3000 và rewrite /api -> 127.0.0.1:3002 (cố định lúc build),
# nên chỉ expose cổng 3000. Xem docs/setup/deploy.md.
# ---------------------------------------------------------------------------

ARG NODE_IMAGE=node:24-bookworm-slim

# ----------------------------- 0. Base -------------------------------------
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
# pnpm lấy đúng phiên bản theo "packageManager" trong package.json.
RUN corepack enable
WORKDIR /repo

# ----------------------------- 1. Prune ------------------------------------
# Chỉ giữ phần monorepo lang-api, lang-app cần: out/json (package.json + lockfile)
# để cache layer install, out/full (mã nguồn) để build.
FROM base AS prune
COPY . .
# Phiên bản turbo khớp catalog trong pnpm-workspace.yaml.
RUN pnpm dlx turbo@2.10.12 prune lang-api lang-app --docker

# ----------------------------- 2. Build ------------------------------------
FROM base AS build
COPY --from=prune /repo/out/json/ ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY --from=prune /repo/out/full/ ./
# Rewrite /api của Next.js bị cố định lúc build: trỏ tới lang-api trong container.
ENV BACKEND_INTERNAL_URL=http://127.0.0.1:3002 \
    NEXT_PUBLIC_API_URL=/api
RUN pnpm turbo run build --filter=lang-api --filter=lang-app

# lang-api kèm node_modules production (đã gồm @lang/shared bản build).
# pnpm ≥ 10 cần --legacy khi workspace không bật inject-workspace-packages.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter lang-api deploy --prod --legacy /out/api

# ----------------------------- 3. Runtime ----------------------------------
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=Asia/Ho_Chi_Minh
WORKDIR /app

COPY --from=build /out/api/package.json ./api/package.json
COPY --from=build /out/api/dist ./api/dist
COPY --from=build /out/api/node_modules ./api/node_modules

# Next standalone giữ cấu trúc monorepo: server.js nằm ở web/apps/lang-app.
COPY --from=build --chown=node:node /repo/apps/lang-app/.next/standalone ./web
COPY --from=build --chown=node:node /repo/apps/lang-app/.next/static ./web/apps/lang-app/.next/static

COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh

USER node
EXPOSE 3000

# Gọi qua Next (3000) -> rewrite -> lang-api (3002) -> database: kiểm tra cả chuỗi.
# start-period dài vì migration chạy trước khi app lên.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["/usr/local/bin/entrypoint.sh"]
