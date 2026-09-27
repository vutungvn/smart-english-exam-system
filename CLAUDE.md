# Smart Exam Learning System

Đồ án tốt nghiệp (1 sinh viên, hạn 17/1/2027): web luyện thi TOEIC Listening & Reading và các môn CNTT, có AI phân tích năng lực, gợi ý bài tập, chatbot trợ giảng. Trả lời người dùng bằng tiếng Việt.

## ⚠️ Quy tắc làm việc: KHÔNG vibe coding
- **Mặc định chỉ hướng dẫn:** với mọi việc liên quan đến code, chỉ đọc (code, tài liệu, Jira) rồi trả lời bằng **các bước chi tiết + code đầy đủ cho từng file** (đường dẫn, code block, giải thích ngắn vì sao làm vậy).
- **Không** tạo/sửa file trong dự án, **không** chạy lệnh làm thay đổi dự án (cài package, scaffold, migrate, tạo nhánh, commit), **không** chuyển trạng thái task Jira khi đang ở chế độ hướng dẫn.
- Người dùng tự kiểm tra rồi tự gõ lại, hoặc **nói rõ** nhờ code (ví dụ "oke, code đi", "nhờ bạn code phần này"). Chỉ khi đó mới được sửa file cho đúng phần đã duyệt, và phải nêu rõ chỗ nào khác với hướng dẫn.
- Tài liệu trong `doc/`, `CLAUDE.md`, `.claude/` không phải code dự án, được sửa khi người dùng yêu cầu.

## Tài liệu (đọc trước khi code tính năng mới)
- **Kế hoạch triển khai (nguồn chuẩn khi code):** `doc/ke-hoach/Ke_hoach_trien_khai.md`. Các điều chỉnh D1–D15 ở Mục 2 **được ưu tiên hơn** tài liệu thiết kế gốc.
- Kế hoạch soạn câu hỏi, định dạng tệp nhập Excel: `doc/ke-hoach/Ke_hoach_soan_cau_hoi.md`
- Use case: `doc/Phân tích thiết kế hệ thống.md` · API: `doc/Thiet_ke_API.md` · CSDL: `doc/Thiet_ke_co_so_du_lieu.md`
- Chỉ đọc đoạn cần thiết (dùng Grep theo tên bảng, endpoint, use case), không đọc cả file dài.

## Công nghệ
- **Backend** `backend/`: NestJS 11 + TypeScript strict, Prisma + PostgreSQL 16, Redis 7 (cache, token, BullMQ), Socket.IO, Swagger.
- **Frontend** `frontend/`: React 19 + Vite, TanStack Query, Zustand, React Hook Form + Zod, Tailwind + shadcn/ui, Recharts.
- **AI:** Gemini qua `@google/genai`, bọc bởi interface `AiProvider`. **Không dùng LangChain.** Khi chưa có API key thì dùng `FakeAiProvider`.
- npm workspaces (không dùng pnpm/yarn), Docker Compose chạy postgres, redis, mailpit. Chạy hoàn toàn ở local.

## Lệnh (có từ Sprint 0)
```bash
docker compose up -d                       # postgres, redis, mailpit
npm install
npm run dev -w backend                     # API: http://localhost:3000/api/v1, Swagger: /api/docs
npm run dev -w frontend                    # http://localhost:5173
npm run db:migrate -w backend              # prisma migrate dev
npm run db:seed -w backend
npm run openapi:export -w backend && npm run api:gen -w frontend   # sinh lại client Orval
npm run lint && npm run typecheck && npm test
```

## Quy ước Backend
- Module theo nghiệp vụ trong `src/modules/<name>/`: Controller (DTO + Swagger) → Service (nghiệp vụ, transaction) → Prisma. Chỉ tách Repository khi truy vấn phức tạp.
- Tiền tố `/api/v1`. Route công khai và học viên ở gốc, `/teacher/*`, `/admin/*`. Tên endpoint là danh từ số nhiều, kebab-case; hành động nghiệp vụ đặt ở cuối (`/publish`, `/submit`).
- Phản hồi thành công `{ success, data, meta }`, lỗi `{ success: false, error: { code, message, details } }`. Mã lỗi là hằng số `UPPER_SNAKE` khai báo trong `src/common/errors`, không ném chuỗi tự do.
- Mặc định mọi route cần JWT; route công khai đánh dấu `@Public()`. Phân quyền bằng `@Roles` / `@RequirePermission(module, action)`. **Quyền sở hữu tài nguyên kiểm tra trong Service.**
- Cập nhật có khóa lạc quan qua `updatedAt`, xung đột trả 409 `VERSION_CONFLICT`. Phân trang bằng `page`, `limit` (≤ 100), `sort=field:dir`.
- Thao tác quản trị gắn `@Audit('<entity>.<action>')`.

## Quy ước CSDL (Prisma)
- Model PascalCase trong code, `@@map`/`@map` sang snake_case số nhiều đúng như tài liệu CSDL. Khóa chính UUID, thời gian `TIMESTAMPTZ` lưu UTC, điểm số dùng `Decimal`.
- Email chuẩn hóa về chữ thường khi ghi. Xóa mềm (`deleted_at`) cho `courses`, `questions`, `exams` qua Prisma Client extension.
- CHECK, chỉ mục một phần, trigram GIN: viết SQL tay trong migration tạo bằng `--create-only`. **Không sửa migration đã áp dụng, không sửa DB bằng tay.**
- Đồng hồ làm bài tính ở server (`expires_at`). Lưu câu trả lời phải idempotent (upsert).

## Quy ước Frontend
- Dữ liệu từ server chỉ lấy qua hook do Orval sinh trong `src/api/` (**không sửa tay thư mục này**), không chép dữ liệu server vào Zustand.
- Access token giữ trong bộ nhớ, refresh token nằm ở cookie httpOnly, không dùng localStorage cho token.
- Code theo feature trong `src/features/<name>/`. Giao diện tiếng Việt, responsive từ 375px, có đủ trạng thái loading, empty, error.

## Bảo mật & AI
- Mọi lượt gọi AI đi qua `AiGateway` (hạn mức, cache, retry, validate Zod, ghi usage log). Dữ liệu gửi AI phải qua `AnonymizerService`: không gửi tên, email, id thật.
- Không log mật khẩu, token, nội dung gửi AI. Không commit `.env` hay secret; biến môi trường mới phải thêm vào `.env.example` và schema kiểm tra env.

## Git & công việc
- Nhánh: `main` ← `develop` ← `feature/SPRINT-<số>-<mo-ta>` (ví dụ `feature/SPRINT-28-auth-api`). Mở PR vào `develop`, CI xanh mới merge. Không commit thẳng lên `main`.
- Commit theo Conventional Commits, tiếng Anh: `feat(auth): SPRINT-28 add login API`.
- **Làm task:** khi người dùng gõ `/next-task [SPRINT-xx]`, nói "làm task tiếp theo" hoặc "làm SPRINT-xx", dùng skill `next-task` (`.claude/skills/next-task/SKILL.md`): lấy task từ Jira → đọc tài liệu và code → **viết hướng dẫn từng bước kèm code** (không sửa dự án) → chỉ code khi người dùng nhờ rõ ràng.
- Quản lý task trên **Jira**, project key `SPRINT` (https://tungvuvanthanh.atlassian.net). Mỗi sprint là 1 Epic, mỗi việc là 1 Task; label mức ưu tiên `bat-buoc` / `nen-co` / `co-the-bo`. Không dùng GitHub Issues.

## Definition of Done
Migration/seed (nếu có) · DTO validate + Swagger · kiểm tra quyền và quyền sở hữu · test cho logic chính (bắt buộc với chấm điểm, attempts, auth) · UI đủ các trạng thái · `lint`, `typecheck`, `test` đều pass.
