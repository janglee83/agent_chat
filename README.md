# agent_chat

Monolith gồm **NestJS backend** + **React (Vite) frontend** trong một pnpm workspace, đóng gói thành **một Docker image**: NestJS phục vụ API tại `/api/*` và SPA đã build cho mọi đường dẫn còn lại.

## Cấu trúc

```
.
├── apps/
│   ├── backend/            # NestJS 12 (ESM, Node 24)
│   └── frontend/           # React 19 + Vite 8
├── packages/
│   ├── eslint-config/      # Rule ESLint dùng chung: base / node / react
│   └── tsconfig/           # tsconfig strict dùng chung: base / node / react
├── .husky/                 # pre-commit, commit-msg, pre-push
├── .github/                # CI, PR template, CODEOWNERS, Dependabot
├── docs/CODE_STANDARDS.md  # Cơ chế bắt buộc tuân thủ chuẩn code
├── Dockerfile              # Multi-stage build → 1 image monolith
└── docker-compose.yml
```

## Yêu cầu

- Node **24 LTS** (`nvm use` đọc `.nvmrc`)
- pnpm **12** — version được pin trong `packageManager`, pnpm tự chuyển đúng version

## Bắt đầu

```bash
pnpm install          # cài deps + cài git hooks (husky)
pnpm dev              # backend :3000 + frontend :5173 (proxy /api → backend)
```

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
docker build -t agent-chat .
docker run -p 3000:3000 agent-chat
curl localhost:3000/api/health
```

## Quy chuẩn code

Xem [docs/CODE_STANDARDS.md](docs/CODE_STANDARDS.md).
