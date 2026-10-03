# agent_chat

Monolith gồm **NestJS backend** (PostgreSQL qua Prisma, Redis) + **React (Vite) frontend** trong một pnpm workspace. Docker chỉ dùng cho **môi trường dev** (dự án không deploy production). Khi build, NestJS phục vụ API tại `/api/*` và SPA đã build cho mọi đường dẫn còn lại.

## Cấu trúc

```
.
├── apps/
│   ├── backend/            # NestJS 12 (ESM, Node 24) · Prisma 7 · Redis
│   └── frontend/           # React 19 + Vite 8
├── packages/
│   ├── eslint-config/      # Rule ESLint dùng chung: base / node / react
│   └── tsconfig/           # tsconfig strict dùng chung: base / node / react
├── .husky/                 # pre-commit, commit-msg, pre-push
├── .github/                # CI, PR template, CODEOWNERS, Dependabot
├── docs/
│   ├── BACKEND_ARCHITECTURE.md  # Cấu trúc backend, Prisma, RedisService
│   └── CODE_STANDARDS.md        # Cơ chế bắt buộc tuân thủ chuẩn code
├── Dockerfile              # Image dev: chỉ có Node + pnpm (source được mount vào)
└── docker-compose.yml
```

## Yêu cầu

- Node **24 LTS** (`nvm use` đọc `.nvmrc`)
- pnpm **12** — version được pin trong `packageManager`, pnpm tự chuyển đúng version
- Docker (để chạy PostgreSQL + Redis local)

## Bắt đầu

```bash
pnpm install                                   # cài deps, sinh Prisma Client, cài git hooks
cp apps/backend/.env.example apps/backend/.env
pnpm infra:up                                  # PostgreSQL 18 + Redis 8 (docker compose)
pnpm --filter backend db:migrate               # apply migrations vào DB dev
pnpm dev                                       # backend :3000 + frontend :5173 (proxy /api → backend)
```

Cổng 5432/6379 đã bị chiếm? `POSTGRES_HOST_PORT=55432 REDIS_HOST_PORT=56379 pnpm infra:up` rồi sửa URL trong `.env`.

## Scripts

| Lệnh                 | Mô tả                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`           | Chạy song song backend + frontend ở chế độ watch                             |
| `pnpm build`         | Build cả hai app                                                             |
| `pnpm start`         | Chạy backend đã build (phục vụ luôn `apps/frontend/dist`)                    |
| `pnpm lint`          | ESLint toàn repo, **0 warning**                                              |
| `pnpm format:check`  | Kiểm tra Prettier                                                            |
| `pnpm typecheck`     | `tsc` cho mọi package                                                        |
| `pnpm test`          | Vitest cho mọi package                                                       |
| `pnpm check`         | format + lint + typecheck + test (giống CI)                                  |
| `pnpm docker:up`     | Toàn bộ dev trong Docker: postgres + redis + backend + frontend (hot reload) |
| `pnpm docker:up:obs` | Như trên + Grafana/Loki/Tempo/Prometheus/Pyroscope (`grafana/otel-lgtm`)     |
| `pnpm docker:down`   | Dừng toàn bộ                                                                 |

## Docker (môi trường dev)

```bash
pnpm docker:up:obs                                   # hoặc pnpm docker:up nếu không cần observability
docker compose exec backend pnpm db:migrate          # migration chạy tay, khi cần
```

| Service  | URL                       | Ghi chú                                                                 |
| -------- | ------------------------- | ----------------------------------------------------------------------- |
| frontend | http://localhost:5173     | Vite dev server, HMR, proxy `/api` → backend                            |
| backend  | http://localhost:3000/api | `nest --watch`, đã gắn OpenTelemetry                                    |
| Grafana  | http://localhost:3001     | admin / admin; Explore → Loki (log), Tempo (trace), Prometheus (metric) |
| postgres | localhost:5432            | agent_chat / agent_chat                                                 |
| redis    | localhost:6379            |                                                                         |

- Source được bind-mount vào container, sửa code là reload ngay. `node_modules` nằm trong named volume nên binary Linux không ghi đè lên bản macOS ở máy bạn.
- Service `deps` chạy `pnpm install` một lần trước, backend và frontend chờ nó xong. Đổi dependency thì chạy lại: `docker compose up deps`.
- Cổng trên máy đã bị chiếm thì đổi qua biến môi trường: `POSTGRES_HOST_PORT`, `REDIS_HOST_PORT`, `BACKEND_HOST_PORT`, `FRONTEND_HOST_PORT`, `GRAFANA_HOST_PORT`, `OTLP_GRPC_HOST_PORT`, `OTLP_HTTP_HOST_PORT`.
- Log Pyroscope có `leadership lost` / `503` trong vài giây đầu khi khởi động. Đó là bình thường, không phải lỗi.

## Quy chuẩn code

Xem [docs/CODE_STANDARDS.md](docs/CODE_STANDARDS.md).
