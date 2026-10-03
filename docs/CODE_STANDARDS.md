# Cơ chế bắt buộc source code tuân theo một chuẩn

## Nguyên tắc

Một chuẩn code chỉ có ý nghĩa khi **máy kiểm tra được** và **không thể lách**. Tài liệu quy ước (style guide) mà không có công cụ thực thi sẽ trôi dần theo thời gian. Vì vậy repo này áp dụng mô hình **phòng thủ nhiều lớp**: lớp càng gần dev thì feedback càng nhanh nhưng càng dễ bỏ qua; lớp càng gần nhánh `main` thì càng chậm nhưng **không thể bypass**.

```
 Editor ──► pre-commit ──► commit-msg ──► pre-push ──► CI ──► Branch ruleset ──► main
 (gợi ý)    (lint-staged)  (commitlint)   (pnpm check)  (bắt buộc)  (chặn merge)
  nhanh, lách được  ◄──────────────────────────────────────────►  chậm, không lách được
```

## Các lớp trong repo này

### 1. Chuẩn được định nghĩa bằng code, ở một nơi duy nhất

| Thành phần             | Vị trí                                     | Vai trò                                                             |
| ---------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| ESLint rule dùng chung | `packages/eslint-config/src/base.js`       | Rule cho **mọi** package (TS strict, import, complexity, unicorn…)  |
| ESLint backend         | `packages/eslint-config/src/node.js`       | Node runtime, security, quy ước NestJS                              |
| ESLint frontend        | `packages/eslint-config/src/react.js`      | React, hooks + React Compiler, a11y, browser                        |
| TypeScript strict      | `packages/tsconfig/{base,node,react}.json` | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`… |
| Format                 | `prettier.config.mjs`                      | Một format duy nhất, không tranh luận trong review                  |
| Commit message         | `commitlint.config.mjs`                    | Conventional Commits + `scope-enum`                                 |
| Editor                 | `.editorconfig`, `.vscode/`                | Format/fix khi save                                                 |

Mỗi app chỉ có một dòng config (`node(...)` hoặc `react(...)`), nên không app nào tự nới lỏng rule một cách âm thầm. Muốn đổi rule phải sửa package dùng chung → bị **CODEOWNERS** bắt review.

**Phân công rõ ràng:** Prettier lo _format_, ESLint lo _đúng/sai & thiết kế_, TypeScript lo _kiểu_. `eslint-config-prettier` tắt mọi rule ESLint xung đột với Prettier.

### 2. Rule "gắt" đang bật (tóm tắt)

- **TypeScript:** `strictTypeChecked` + `stylisticTypeChecked`, `strict-boolean-expressions`, `switch-exhaustiveness-check`, `explicit-function-return-type`, `explicit-member-accessibility`, `consistent-type-imports`, `naming-convention` (boolean phải có tiền tố `is/has/should…`), cấm `enum`.
- **Độ phức tạp:** `complexity ≤ 10`, `sonarjs/cognitive-complexity ≤ 10`, `max-depth ≤ 3`, `max-params ≤ 4`, `max-lines-per-function ≤ 80`, `max-lines ≤ 300`, `max-statements ≤ 20`.
- **Import:** cấm vòng phụ thuộc (`no-cycle`), cấm `default export`, cấm dependency không khai báo, thứ tự import tự động (`perfectionist`). Backend cấm import frontend và ngược lại.
- **Escape hatch phải có lý do:** `// eslint-disable-next-line <rule> -- <lý do>`; cấm disable toàn file, cấm disable `no-explicit-any`, `no-unsafe-*`, `react-hooks/*`, `no-cycle`. Directive thừa → lỗi.
- **Zero warning:** mọi lệnh lint chạy với `--max-warnings=0`, nên "warning" cũng làm fail.
- **Test:** cấm `it.only` / `it.skip`, bắt buộc có `expect`.

### 3. Git hooks (Husky) — feedback trước khi code rời máy

| Hook         | Lệnh                | Kiểm tra                                                             |
| ------------ | ------------------- | -------------------------------------------------------------------- |
| `pre-commit` | `lint-staged`       | Prettier + ESLint `--fix` trên file staged; typecheck nếu có file TS |
| `commit-msg` | `commitlint --edit` | `type(scope): subject` theo Conventional Commits                     |
| `pre-push`   | `pnpm check`        | format + lint + typecheck + test toàn repo                           |

Hook cài tự động qua script `prepare` khi `pnpm install`. **Lưu ý:** hook có thể bị bỏ qua bằng `git commit --no-verify`, nên chúng chỉ là lớp tiện lợi — lớp bắt buộc là CI.

### 4. CI (GitHub Actions) — nguồn sự thật duy nhất

`.github/workflows/ci.yml` chạy trên mọi PR và push lên `main`:

1. **commitlint** — kiểm tra _mọi_ commit trong PR (bắt cả commit đã `--no-verify`).
2. **quality** — `install --frozen-lockfile` → Prettier → ESLint → typecheck → unit test → e2e → build.
3. **docker** — build image và smoke test `GET /api/health`.

### 5. Branch ruleset trên GitHub — biến CI thành "bắt buộc"

CI chỉ _báo_ đỏ; **ruleset** mới _chặn merge_. Cần bật cho `main` (Settings → Rules → Rulesets, hoặc dùng lệnh bên dưới):

- Bắt buộc Pull Request, ≥ 1 approval, **Require review from Code Owners**, dismiss approval cũ khi có commit mới, phải resolve hết conversation.
- **Required status checks:** `Commit messages`, `Format · Lint · Typecheck · Test · Build`, `Docker image`; yêu cầu nhánh up-to-date trước khi merge.
- Cấm force-push và xoá nhánh; linear history (squash/rebase merge).
- Không cho bypass (kể cả admin).

```bash
gh api -X POST repos/janglee83/agent_chat/rulesets --input - <<'JSON'
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 1,
        "require_code_owner_review": true,
        "dismiss_stale_reviews_on_push": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "Commit messages" },
          { "context": "Format · Lint · Typecheck · Test · Build" },
          { "context": "Docker image" } ] } }
  ]
}
JSON
```

> Repo một người: `required_approving_review_count: 1` sẽ chặn chính bạn (không tự approve PR của mình được). Khi làm một mình, đặt `0` nhưng giữ nguyên required status checks.

### 6. Chuỗi cung ứng & môi trường

- `engineStrict` + `engines` + `packageManager`: sai Node/pnpm là `install` fail.
- `strictPeerDependencies`: peer dependency lệch là fail.
- `allowBuilds`: chỉ package được duyệt mới được chạy install script.
- pnpm 12 kiểm tra _supply-chain policy_ (độ tuổi tối thiểu của bản release) nên đôi khi cài bản mới nhất trừ vài ngày gần đây — đó là cố ý.
- `--frozen-lockfile` trong CI/Docker: lockfile phải khớp `package.json`.
- Dependabot cập nhật hàng tuần, commit message cũng theo Conventional Commits.

## Áp dụng rule mới vào code đã có (ratchet)

Khi bật rule mới mà code cũ còn vi phạm, đừng tắt rule — dùng **bulk suppressions** của ESLint:

```bash
pnpm exec eslint . --suppress-rule <rule-name>   # ghi vi phạm hiện có vào eslint-suppressions.json
```

Vi phạm cũ được "đóng băng", vi phạm **mới** vẫn fail. Mỗi lần sửa bớt, chạy `eslint --prune-suppressions` để siết lại. Chuẩn chỉ đi một chiều: chặt hơn.

## Hướng mở rộng khi dự án lớn lên

| Nhu cầu                                     | Công cụ gợi ý                                            |
| ------------------------------------------- | -------------------------------------------------------- |
| Ranh giới kiến trúc giữa các module/feature | `dependency-cruiser` hoặc `import-x/no-restricted-paths` |
| Phát hiện file/export/dependency không dùng | `knip`                                                   |
| Ngưỡng coverage                             | `vitest --coverage` với `thresholds`                     |
| Quality gate tổng hợp (smell, duplication)  | SonarQube / SonarCloud                                   |
| Quy tắc review tự động trên PR              | Danger.js (VD: PR đổi API phải đổi test)                 |
| Ghi lại quyết định kiến trúc                | ADR trong `docs/adr/`                                    |

## Quy trình đổi chuẩn

1. Mở PR sửa `packages/eslint-config` / `packages/tsconfig` / `prettier.config.mjs` với scope `eslint-config` hoặc `tsconfig`.
2. Mô tả lý do + ví dụ code tốt/xấu. Sửa hoặc suppress toàn bộ vi phạm trong cùng PR (CI phải xanh).
3. Code Owner review và merge.
