# agent_chat

Monolith gồm **NestJS backend** (PostgreSQL qua Prisma, Redis) + **React (Vite) frontend** trong một pnpm workspace, đóng gói thành **một Docker image**: NestJS phục vụ API tại `/api/*` và SPA đã build cho mọi đường dẫn còn lại.

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
├── Dockerfile              # Multi-stage build → 1 image monolith
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
pnpm --filter backend db:deploy                # apply migrations
pnpm dev                                       # backend :3000 + frontend :5173 (proxy /api → backend)
```

Cổng 5432/6379 đã bị chiếm? `POSTGRES_HOST_PORT=55432 REDIS_HOST_PORT=56379 pnpm infra:up` rồi sửa URL trong `.env`.

## Scripts

| Lệnh                | Mô tả                                                     |
| ------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Chạy song song backend + frontend ở chế độ watch          |
| `pnpm build`        | Build cả hai app                                          |
| `pnpm start`        | Chạy backend đã build (phục vụ luôn `apps/frontend/dist`) |
| `pnpm lint`         | ESLint toàn repo, **0 warning**                           |
| `pnpm format:check` | Kiểm tra Prettier                                         |
| `pnpm typecheck`    | `tsc` cho mọi package                                     |
| `pnpm test`         | Vitest cho mọi package                                    |
| `pnpm check`        | format + lint + typecheck + test (giống CI)               |
| `pnpm docker:up`    | Build image và chạy bằng docker compose tại :3000         |

## Docker

```bash
pnpm docker:up                          # postgres → migrate (prisma migrate deploy) → app
curl localhost:3000/api/health/ready    # {"status":"ok", ... database: up, redis: up}
```

Image có 2 target: `runtime` (app) và `migrator` (chạy migration một lần trước mỗi lần release).

## Quy chuẩn code

Xem [docs/CODE_STANDARDS.md](docs/CODE_STANDARDS.md).
