# Kiến trúc backend

NestJS 12 · PostgreSQL 18 qua Prisma 7 · Redis 8 qua node-redis 6.

## Cấu trúc thư mục

```
apps/backend/
├── prisma/
│   ├── schema.prisma            # Nguồn sự thật của DB schema
│   └── migrations/              # SQL migration (commit vào git, không sửa tay sau khi merge)
├── prisma.config.ts             # Config cho Prisma CLI (schema, migrations, DATABASE_URL)
└── src/
    ├── main.ts                  # Bootstrap: global prefix /api, shutdown hooks
    ├── app.module.ts            # Ghép module: infrastructure → features
    ├── config/                  # Đọc + validate env MỘT lần, inject bằng APP_ENV
    ├── infrastructure/          # Lớp duy nhất được chạm vào driver
    │   ├── database/            # DatabaseModule (global) → PrismaService
    │   └── redis/               # RedisModule (global)    → RedisService
    ├── health/                  # /api/health (liveness), /api/health/ready (readiness)
    ├── generated/prisma/        # Prisma Client (sinh tự động, không commit)
    └── <feature>/               # Mỗi feature một module: controller → service → PrismaService/RedisService
```

## Quy tắc (được ESLint ép buộc, không chỉ là quy ước)

| Quy tắc                                                                                 | Ép bằng                                                        |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Chỉ `src/infrastructure/**` được import `redis`, `@redis/*`, `pg`, `@prisma/adapter-pg` | `no-restricted-imports` trong `apps/backend/eslint.config.mjs` |
| Không ai `new PrismaClient()` ngoài `PrismaService` (mỗi instance = 1 connection pool)  | như trên (`importNames: ['PrismaClient']`)                     |
| Không đọc `process.env` rải rác — inject `APP_ENV`                                      | review + `config/env.ts` là nơi duy nhất parse env             |
| Log qua `Logger` của Nest, không `console`                                              | `no-console`                                                   |

Import **type** model từ Prisma vẫn được phép (VD `import type { Message } from '../generated/prisma/client.js'`).

## Config

`src/config/env.ts` parse và validate toàn bộ env khi khởi động. Thiếu hoặc sai `DATABASE_URL` / `REDIS_URL` thì process **không start** (fail fast).

| Biến               | Bắt buộc | Mặc định           |
| ------------------ | -------- | ------------------ |
| `DATABASE_URL`     | ✔        | —                  |
| `REDIS_URL`        | ✔        | —                  |
| `REDIS_KEY_PREFIX` |          | `agent-chat:`      |
| `PORT`             |          | `3000`             |
| `STATIC_DIR`       |          | `../frontend/dist` |
| `NODE_ENV`         |          | `development`      |

```ts
constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}
```

## Database (Prisma)

- **Một** `PrismaService` (kế thừa `PrismaClient`, dùng driver adapter `@prisma/adapter-pg`), là `@Global`. Connect ngay khi boot, disconnect khi shutdown.
- Quy ước schema: model PascalCase số ít; bảng `snake_case` số nhiều (`@@map`); cột `snake_case` (`@map`); id `uuid(7)` (sắp xếp được theo thời gian); thời gian `Timestamptz`.

```ts
@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  public async findWithMessages(id: string) {
    return await this.prisma.conversation.findUnique({
      where: { id },
      include: { messages: true },
    });
  }
}
```

### Quy trình migration

```bash
# 1. sửa prisma/schema.prisma
pnpm --filter backend db:migrate --name add_user_table   # tạo SQL + apply vào DB local
# 2. commit cả schema.prisma lẫn thư mục migration mới
```

- Production: service `migrate` (Docker target `migrator`) chạy `prisma migrate deploy` **trước** khi app start; app chỉ start khi migrate thành công.
- CI fail nếu `schema.prisma` thay đổi mà không có migration (`prisma migrate diff --exit-code`).
- Không sửa migration đã merge — luôn tạo migration mới.

## Redis (`RedisService`)

Một điểm truy cập Redis duy nhất cho toàn app. Inject ở bất kỳ đâu (module global):

```ts
constructor(private readonly redis: RedisService) {}
```

| Nhóm    | API                                                                           |
| ------- | ----------------------------------------------------------------------------- |
| String  | `get(key)`, `set(key, value, ttlSeconds?)`                                    |
| JSON    | `getJson(key, parse)`, `setJson(key, value, ttlSeconds?)`                     |
| Cache   | `remember({ key, ttlSeconds, load, parse })` (cache-aside)                    |
| Key     | `delete(...keys)`, `exists`, `expire`, `ttl`, `increment(key, by?)`           |
| Pub/Sub | `publish(channel, message)`, `subscribe(channel, listener)` → `unsubscribe()` |
| Health  | `ping()`                                                                      |

Thiết kế:

- **Namespace tự động:** mọi key/channel được thêm `REDIS_KEY_PREFIX`. Code chỉ dùng key logic (`conversation:42`), nên nhiều app/môi trường dùng chung một Redis vẫn an toàn.
- **Đọc JSON phải validate:** `getJson`/`remember` bắt buộc truyền `parse: (value: unknown) => T`. Dữ liệu trong cache được coi là không tin cậy (có thể cũ hoặc sai schema sau khi deploy).
- **TTL được kiểm tra:** TTL phải là số nguyên dương, sai thì ném `RangeError`, không âm thầm tạo key không hết hạn.
- **Pub/Sub dùng connection riêng:** connection đã `SUBSCRIBE` không chạy được lệnh khác, nên `RedisService` tạo một subscriber (`duplicate()`) khi cần. Nhiều lời gọi đồng thời dùng chung một connection.
- **Lifecycle:** client connect khi boot (Redis sai cấu hình là fail ngay), có listener `error` (nếu không có, node-redis sẽ làm crash process), reconnect với backoff tối đa 3s, đóng sạch khi nhận SIGTERM.
- **Escape hatch:** cần lệnh chưa được wrap (stream, sorted set…) thì inject `@Inject(REDIS_CLIENT)` **bên trong** `src/infrastructure/redis`, rồi bổ sung method vào `RedisService`. Không dùng client thô ở feature.

Ví dụ: cache 50 tin nhắn mới nhất của một hội thoại trong 60 giây.

```ts
const messages = await this.redis.remember({
  key: `conversation:${conversationId}:recent-messages`,
  ttlSeconds: 60,
  load: async () =>
    await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  parse: parseMessageList, // (value: unknown) => Message[], ném lỗi nếu sai shape
});
```

## Health check

| Endpoint                | Ý nghĩa                                                       | Dùng cho                           |
| ----------------------- | ------------------------------------------------------------- | ---------------------------------- |
| `GET /api/health`       | Liveness: process còn sống. **Không** kiểm tra dependency     | Docker `HEALTHCHECK`, k8s liveness |
| `GET /api/health/ready` | Readiness: PostgreSQL + Redis phản hồi, nếu không thì trả 503 | Load balancer, k8s readiness       |

Tách hai endpoint để khi DB sập thì orchestrator chỉ **ngừng route traffic** tới instance, không restart hàng loạt container.

## Test

| Loại                                        | Lệnh                             | Phụ thuộc                                 |
| ------------------------------------------- | -------------------------------- | ----------------------------------------- |
| Unit (`src/**/*.spec.ts`)                   | `pnpm --filter backend test`     | Không cần gì — driver được mock           |
| E2E / integration (`test/**/*.e2e-spec.ts`) | `pnpm --filter backend test:e2e` | PostgreSQL + Redis thật (`pnpm infra:up`) |
