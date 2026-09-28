# KẾ HOẠCH TRIỂN KHAI MÃ NGUỒN
## Hệ thống luyện thi và học tập thông minh

> Tài liệu kỹ thuật dùng khi code. Nguồn gốc nghiệp vụ nằm ở 5 tài liệu phân tích thiết kế trong `doc/` (thư mục cha); tài liệu này **được phép lệch** khỏi chúng khi cần cho phù hợp thực tế code. Mọi chỗ lệch được ghi ở Mục 2.
>
> Mốc thời gian: đồ án 3/8/2026 – 17/1/2027. Hiện tại (26/9/2026) là **Tuần 8**. Tuần 23–24 dành cho báo cáo và slide, nên còn **Tuần 8 → Tuần 22 (~15 tuần) để code**.

---

## 1. Nguyên tắc

1. **Làm theo lát dọc (vertical slice):** mỗi tính năng xong trọn DB → API → UI → test rồi mới sang tính năng khác. Không làm hết BE rồi mới làm FE.
2. **Bắt buộc trước, Nên có sau, Có thể bỏ cuối cùng.** Đến Tuần 15 mà luồng thi thử + AI phân tích chưa chạy thì cắt phần "Có thể bỏ", không kéo dài.
3. **Luôn có bản chạy được:** nhánh `develop` lúc nào cũng build và chạy được qua `docker compose up`.
4. **Swagger là nguồn chuẩn của API:** FE sinh client/type tự động từ Swagger, không gõ tay type.
5. **Bảo mật và dữ liệu cá nhân là yêu cầu xuyên suốt,** không để dồn đến cuối.

---

## 2. Điều chỉnh so với tài liệu thiết kế

| # | Tài liệu gốc | Điều chỉnh khi code | Lý do |
|---|---|---|---|
| D1 | 188 endpoint, 16 nhóm | Chia 3 mức: **MVP (~110)**, **Mở rộng (~50)**, **Cắt/đơn giản hóa (~25)** (xem Mục 10) | 1 người, ~15 tuần code |
| D2 | CSDL 26 bảng, chưa có bảng cho AI, nhật ký, cấu hình… (mục 13 tài liệu CSDL) | Bổ sung ~12 bảng (Mục 5.2) | API đã thiết kế cần các bảng này |
| D3 | `uq_users_email_lower` là chỉ mục trên biểu thức `lower(email)` | Chuẩn hóa email về chữ thường **khi ghi**, dùng `@unique` bình thường | Prisma không khai báo được chỉ mục trên biểu thức; cách này đơn giản và tương đương |
| D4 | Không có liên kết đề thi – môn học | Thêm `exams.subject_id` và `exams.kind` (`STANDARD`, `AI_PRACTICE`) | Lọc đề theo môn; bộ luyện tập do AI tạo được lưu như một đề thi đặc biệt, dùng lại luồng làm bài |
| D5 | LangChain + adapter | **Chỉ dùng adapter tự viết** (`AiProvider` interface) + SDK `@google/genai` + Zod | Chỉ cần gọi 1 nhà cung cấp, sinh JSON theo schema, streaming. LangChain thêm độ phức tạp mà không đem lại gì ở đây |
| D6 | Redux Toolkit / TanStack Query | **TanStack Query** (dữ liệu từ server) + **Zustand** (auth, UI) | Không cần Redux |
| D7 | Sao lưu / phục hồi qua API (7 endpoint, phục hồi 2 bước) | Chỉ làm **danh sách + tạo bản sao lưu thủ công** (gọi `pg_dump` qua job). Phục hồi thực hiện bằng script CLI có hướng dẫn | Phục hồi qua giao diện web rủi ro cao, khó kiểm thử |
| D8 | Mã mời admin, 2FA admin | Chuyển sang **Có thể bỏ**. Admin đầu tiên do seed tạo, admin sau do admin tạo qua `/admin/users` | Không phải chức năng cốt lõi |
| D9 | Xuất báo cáo bất đồng bộ (202 + jobId) | Xuất **CSV/XLSX đồng bộ** với dữ liệu vừa phải; chỉ dùng hàng đợi nếu đo thấy chậm | Giảm hạ tầng không cần thiết |
| D10 | Kho tệp (FileStorageService) | Interface `StorageService`: bản `LocalDiskStorage` cho dev; `S3Storage` (MinIO) nếu còn thời gian | Chạy ngay, dễ thay sau |
| D11 | Nhiều loại câu hỏi | MVP: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`. `FILL_IN_BLANK`: Có thể bỏ | TOEIC LR chỉ có một đáp án |
| D12 | Lịch sử chỉnh sửa câu hỏi | Bảng `question_revisions` lưu snapshot JSON mỗi lần sửa | Cách đơn giản nhất để có lịch sử |
| D13 | Quy đổi điểm TOEIC 990 | Bảng quy đổi raw → scaled theo từng kỹ năng, lưu dạng JSON trong `system_settings` (seed bảng tham khảo, ghi rõ **không phải bảng chính thức của ETS**) | Admin chỉnh được mà không phải sửa code |
| D14 | Luật BVDLCN 91/2025/QH15, NĐ 356/2025 (tài liệu phân tích) và NĐ 13/2023 (M1) | Theo tài liệu phân tích (bản mới hơn). Ẩn danh hóa bắt buộc trước khi gọi AI | Thống nhất một căn cứ |
| D15 | `questions` chỉ có `content` + `media_url` cho từng câu | Thêm bảng `question_groups` (passage, transcript, audio, ảnh) + `questions.group_id`, `order_in_group`; nhập câu hỏi bằng `.zip` (xlsx + media) | TOEIC Part 3, 4, 6, 7 là nhóm câu dùng chung một đoạn văn/audio. Chi tiết ở `Ke_hoach_soan_cau_hoi.md` Mục 2 |

### 2.1. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Quản lý công việc | **Jira** (theo M1). Mỗi sprint là 1 Epic, mỗi dòng việc ở Mục 11 là 1 task |
| Môi trường | **Code và chạy hoàn chỉnh ở local** bằng Docker Compose. Nơi deploy bản demo chốt sau |
| Gemini API key | Chưa cần. Từ Sprint 0 đến Sprint 4 dùng `FakeAiProvider`; lấy key trước Sprint 5 (16/11) |
| Dữ liệu câu hỏi | 300 TOEIC + 300 CNTT, soạn song song Tuần 8–13 theo `Ke_hoach_soan_cau_hoi.md` |
| Phiên bản công cụ (chốt ở SPRINT-20, 27/9/2026) | Dùng bản mới nhất khi khởi tạo: **NestJS 12 (ESM)**, **Vite 8**, React 19, **Vitest 4**, ESLint 10, Prettier 3. Riêng **TypeScript ghim `~6.0`** (khai báo một lần ở root `package.json`): `typescript-eslint` chỉ hỗ trợ `<6.1`, Nest CLI 12 build bằng `~6.0`, còn TypeScript 7 không còn JS API |
| Công cụ lint | Template của NestJS 12 và create-vite 9 mặc định dùng **oxlint**; dự án bỏ oxlint, dùng **một `eslint.config.mjs` ở gốc** cho cả BE (có kiểm tra kiểu, bắt `no-floating-promises`) và FE (luật React Hooks, React Refresh) + Prettier |
| Tiền tố API | `/api/v1` = `setGlobalPrefix('api')` + URI versioning `defaultVersion: '1'`. Khi cần v2 cho một route thì gắn `@Version('2')`, không đổi toàn bộ tiền tố |
| Gọi API ở dev | Vite proxy `/api` → `http://localhost:3000`; FE gọi đường dẫn tương đối `VITE_API_BASE_URL=/api/v1` nên cùng origin, cookie refresh token không cần CORS có credentials |

---

## 3. Kiến trúc tổng thể

```
┌──────────────┐   HTTPS/JSON   ┌───────────────────────────────┐
│ React (Vite) │ ─────────────▶ │ NestJS API  (/api/v1)         │
│  SPA         │ ◀── Socket.IO ─│  ├─ REST controllers          │
└──────────────┘                │  ├─ WS gateways (/chat, /jobs,│
                                │  │   /notifications)          │
                                │  └─ BullMQ workers (cùng      │
                                │      process ở dev, tách được)│
                                └───┬──────────┬──────────┬─────┘
                                    │          │          │
                              PostgreSQL 16   Redis 7   Gemini API
                              (Prisma)        (cache,   (qua AiProvider)
                                              queue,
                                              token)
```

- **Monolith module hóa** (modular monolith): 1 ứng dụng NestJS, chia module theo nghiệp vụ. Worker hàng đợi chạy chung process ở dev, có thể tách ra bằng entrypoint riêng `main.worker.ts` khi deploy.
- **Kiến trúc phân tầng trong mỗi module:** `Controller` (HTTP, DTO, Swagger) → `Service` (nghiệp vụ, transaction) → `Repository` (Prisma, chỉ ở chỗ truy vấn phức tạp; CRUD đơn giản gọi Prisma trực tiếp trong Service để khỏi viết lớp bọc thừa).

### 3.1. Công nghệ

| Tầng | Lựa chọn |
|---|---|
| Runtime | Node.js 24 LTS, npm workspaces, TypeScript 6.0 strict (ghim `~6.0`, xem Mục 2.1) |
| Backend | NestJS 12 (ESM, `module: nodenext`), `@nestjs/config` + Zod (kiểm tra biến môi trường), `class-validator`/`class-transformer`, `@nestjs/swagger`, `@nestjs/jwt`, `passport-google-oauth20`, `bcrypt`, `@nestjs/throttler`, `helmet`, `cookie-parser`, `nestjs-pino` |
| DB | PostgreSQL 16, Prisma ORM (migrate + client extension cho xóa mềm), extension `pg_trgm` |
| Cache/Queue | Redis 7, `ioredis`, `@nestjs/bullmq` |
| Realtime | `@nestjs/websockets` + Socket.IO (adapter Redis nếu chạy nhiều instance) |
| AI | `@google/genai` (Gemini Flash), Zod để kiểm tra JSON đầu ra |
| Tệp | `multer`, `pdf-parse`, `mammoth` (DOCX), `exceljs` (nhập/xuất câu hỏi) |
| Email | `nodemailer`; **Mailpit** ở dev để xem email |
| Frontend | React 19, Vite 8, TypeScript, React Router, TanStack Query, Zustand, React Hook Form + Zod, Tailwind CSS + shadcn/ui, Recharts, `socket.io-client` |
| Sinh client API | **Orval**: sinh hook TanStack Query + type từ `openapi.json` |
| Kiểm thử | Vitest + Supertest (BE), Vitest + Testing Library (FE), Playwright (E2E luồng chính), k6 (tải) |
| Hạ tầng dev | Docker Compose: postgres, redis, mailpit (+ minio tùy chọn) |
| CI | GitHub Actions: lint → typecheck → test → build |

---

## 4. Cấu trúc thư mục

```
smart-exam-learning-system/
├─ doc/                         # tài liệu phân tích thiết kế (.md)
│  └─ ke-hoach/                 # kế hoạch triển khai, kế hoạch soạn câu hỏi
├─ backend/
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  ├─ migrations/            # gồm cả SQL viết tay (CHECK, partial index, trgm)
│  │  └─ seed/                  # roles, permissions, admin, subjects, topics, câu hỏi mẫu
│  ├─ src/
│  │  ├─ main.ts / main.worker.ts
│  │  ├─ app.module.ts
│  │  ├─ config/                # env schema (Zod), config theo nhóm
│  │  ├─ common/                # decorators, guards, filters, interceptors, pipes, dto phân trang
│  │  ├─ infra/                 # prisma, redis, queue, mail, storage, ai (adapter)
│  │  └─ modules/
│  │     ├─ auth/  me/  users/  rbac/
│  │     ├─ subjects/  courses/  enrollments/
│  │     ├─ questions/  exams/  attempts/  grading/  progress/
│  │     ├─ flashcards/
│  │     ├─ ai/ (analysis, recommendation, explanation, chat, generation, quota)
│  │     ├─ admin-stats/  settings/  audit/  backups/
│  │     └─ uploads/  notifications/  system/
│  ├─ test/                     # e2e (Vitest + Supertest)
│  └─ vitest.config.ts, vitest.config.e2e.ts
├─ frontend/
│  ├─ src/
│  │  ├─ app/                   # router, providers, layouts theo vai trò
│  │  ├─ api/                   # orval sinh ra (không sửa tay) + axios instance
│  │  ├─ features/              # auth, courses, exam-taking, results, ai, flashcards, teacher, admin
│  │  ├─ components/            # ui (shadcn), dùng chung
│  │  ├─ stores/                # zustand: auth, exam-session
│  │  ├─ hooks/  lib/  styles/
│  └─ e2e/                      # Playwright
├─ docker-compose.yml
├─ .github/workflows/ci.yml
├─ .vscode/                     # settings (LF, format on save), extensions gợi ý
├─ eslint.config.mjs            # ESLint dùng chung cho backend + frontend
├─ .prettierrc, .prettierignore, .editorconfig, .gitattributes
├─ package.json                 # npm workspaces: backend, frontend; công cụ dùng chung (ESLint, Prettier, TypeScript)
└─ README.md                    # hướng dẫn cài đặt, chạy
```

---

## 5. Cơ sở dữ liệu

### 5.1. Giữ nguyên từ tài liệu (26 bảng)

Giữ nguyên tên bảng, cột, ENUM, chính sách ON DELETE, chỉ mục như tài liệu `../Thiet_ke_co_so_du_lieu.md`. Cách ánh xạ sang Prisma:

- Model tên PascalCase số ít, dùng `@@map("snake_case_plural")` và `@map("snake_case")` cho cột → code TypeScript dùng camelCase, DB đúng quy ước tài liệu.
- Kế thừa User: `User` 1–1 `Student?` / `Teacher?` / `Admin?` (khóa chính của bảng con là `user_id`). Tạo trong cùng `prisma.$transaction`.
- Xóa mềm (`courses`, `questions`, `exams`): Prisma Client extension tự thêm `deletedAt: null` vào truy vấn đọc; có hàm riêng `withDeleted()` cho admin.
- **Những gì Prisma không khai báo được → viết SQL tay** trong migration tạo bằng `prisma migrate dev --create-only`:
  - Toàn bộ ràng buộc `CHECK` (Bảng 3.34 và CHECK từng cột).
  - Chỉ mục một phần: `uq_attempts_one_in_progress`, `ix_courses_status_published`, `ix_exams_status_published`, `ix_questions_filter`, `ix_attempts_expiring`.
  - `CREATE EXTENSION pg_trgm` + 3 chỉ mục GIN trigram.
  - Trigger `updated_at` là không cần thiết: dùng `@updatedAt` của Prisma.
- Tiền: không có. Điểm: `Decimal` (NUMERIC) như tài liệu.

### 5.2. Bảng bổ sung

| Bảng | Mục đích | API liên quan |
|---|---|---|
| `teacher_applications` | Minh chứng chuyên môn, trạng thái duyệt, lý do từ chối | `/auth/register/teacher`, `/admin/teacher-applications/*` |
| `login_histories` | Thời điểm, IP, user-agent, thành công/thất bại | `/me/login-history` |
| `audit_logs` | actor, action, entity, entity_id, before/after (JSONB), ip; giữ ≥ 6 tháng (NFR-09) | `/admin/audit-logs/*` |
| `system_settings` | `group`, `key`, `value` JSONB, giá trị mặc định | `/admin/settings/*`, bảng quy đổi điểm, hạn mức AI |
| `media_files` | key, mime, size, owner, mục đích | `/uploads`, `/media/{key}` |
| `question_revisions` | snapshot JSON câu hỏi + options mỗi lần sửa | `/teacher/questions/{id}/history` |
| `question_imports` | tệp nhập, số dòng hợp lệ/lỗi, dữ liệu xem trước, lỗi từng dòng (JSONB), trạng thái | `/teacher/questions/import/*` |
| `ai_analyses` | student, phạm vi dữ liệu, kết quả JSONB (điểm mạnh/yếu theo topic/part), model, token | `/ai/analyses*`, `/ai/recommendations`, `/ai/learning-path` |
| `ai_explanations` | cache giải thích theo `question_id` (dùng chung mọi học viên) | `/questions/{id}/ai-explanation` |
| `chat_conversations`, `chat_messages` | Hội thoại chatbot, ngữ cảnh (question/attempt), token | `/ai/chat/*`, WS `/chat` |
| `ai_generation_jobs`, `ai_generated_items` | Tác vụ sinh câu hỏi/flashcard từ tài liệu, nội dung chờ duyệt | `/teacher/ai/*` |
| `ai_usage_logs` | Mỗi lượt gọi AI: user, tính năng, token vào/ra, độ trễ, trạng thái | `/me/ai-usage`, `/admin/ai/usage` |
| `notifications` | Thông báo đã gửi, đã đọc | WS `/notifications` |
| `backups` (Mở rộng) | tên tệp, kích thước, trạng thái, người tạo | `/admin/backups` |

Cột bổ sung: `exams.subject_id`, `exams.kind`; `users.must_change_password` (admin mặc định trong seed).

### 5.3. Redis

Giữ nguyên Bảng 3.39 (refresh token, token xác minh email, token đặt lại mật khẩu, đếm đăng nhập sai, giới hạn yêu cầu đặt lại mật khẩu) và bổ sung:

- `attempt:{id}:draft`: bản nháp câu trả lời để tự động lưu nhanh; ghi xuống PostgreSQL theo lô mỗi N giây và khi nộp bài. *(Chỉ làm nếu đo thấy ghi thẳng vào DB chậm; mặc định ghi thẳng vào DB.)*
- `ai:cache:{hash}` (TTL 24 giờ), `ai:quota:{userId}:{yyyy-mm-dd}`.
- Hàng đợi BullMQ: `ai-analysis`, `ai-generation`, `attempt-autosubmit`, `mail`, `export`.

### 5.4. Seed

`npm run db:seed` tạo được bộ dữ liệu demo chạy lại nhiều lần không lỗi (idempotent): 3 vai trò + ma trận quyền; 1 admin, 2 giáo viên, 5 học viên; môn TOEIC + 4 môn CNTT kèm chủ đề; **≥ 300 câu mỗi nhóm** (nạp từ tệp Excel trong `prisma/seed/data/` bằng chính code của chức năng nhập câu hỏi); 2 đề TOEIC mẫu, 4 đề CNTT; bảng quy đổi điểm.

---

## 6. Backend: các thành phần dùng chung (làm trong Sprint 0–1)

| Thành phần | Nội dung |
|---|---|
| Định dạng phản hồi | `TransformInterceptor` bọc `{ success, status, data, meta }`; `AllExceptionsFilter` trả `{ success:false, status, error:{ code, message, details } }`; `status` luôn trùng HTTP status code. Mã lỗi là hằng số dạng `AUTH_INVALID_CREDENTIALS`, `EXAM_NOT_PUBLISHED`, `VERSION_CONFLICT`… trong `common/errors` |
| Validation | `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` toàn cục |
| Phân trang | `PaginationQueryDto` (`page`, `limit ≤ 100`, `sort=field:dir` có danh sách trường cho phép), helper `paginate()` trả `meta:{page,limit,total}` |
| Xác thực | `JwtAuthGuard` toàn cục; decorator `@Public()` để bỏ qua; `@CurrentUser()` |
| Phân quyền | `@Roles(...)` + `@RequirePermission('question','UPDATE')`; `PermissionGuard` đọc quyền của vai trò (cache Redis, xóa cache khi admin sửa ma trận quyền). **Kiểm tra quyền sở hữu nằm trong Service** (ví dụ `assertCourseOwner`), không để trong guard |
| Xung đột đồng thời | DTO cập nhật nhận `updatedAt`; Service `updateMany where {id, updatedAt}`, nếu 0 dòng → 409 `VERSION_CONFLICT` |
| Nhật ký kiểm toán | Decorator `@Audit('course.publish')` + interceptor ghi `audit_logs` sau khi xử lý thành công |
| Rate limit | Throttler toàn cục; giới hạn chặt cho `/auth/*` và `/ai/*` |
| Bảo mật | Helmet, CORS theo whitelist, cookie refresh `httpOnly; Secure; SameSite=Strict; path=/api/v1/auth`, bcrypt cost 12, token email/reset lưu SHA-256 |
| Swagger | `/api/docs`; script `npm run openapi:export` ghi `openapi.json` để FE sinh client |
| Logging | pino JSON, request-id, không log mật khẩu/token/nội dung gửi AI |
| Health | `/system/status` kiểm tra DB, Redis, trạng thái AI |

---

## 7. Các luồng nghiệp vụ trọng tâm (thiết kế code)

### 7.1. Xác thực
- Đăng nhập → access token 15 phút (trả trong body, FE giữ **trong bộ nhớ**, không lưu localStorage) + refresh token 7 ngày (cookie httpOnly, Redis `refresh:{userId}:{tokenId}`).
- **Xoay vòng refresh token**: mỗi lần `/auth/refresh` cấp token mới và hủy token cũ; nếu token cũ bị dùng lại → thu hồi toàn bộ phiên của user.
- FE: interceptor axios bắt 401 → gọi refresh một lần (khóa bằng promise dùng chung) → gửi lại request.
- Sai mật khẩu 5 lần → khóa 15 phút; quên mật khẩu tối đa 3 lần/15 phút; thông báo lỗi chung chung để không lộ email nào đã tồn tại.

### 7.2. Làm bài thi (phần cốt lõi, cần làm kỹ nhất)
- `POST /exams/{id}/attempts`: kiểm tra đã xuất bản, số lượt tối đa (`max_attempts`), bài làm dở (chỉ mục duy nhất một phần là chốt chặn cuối) → tạo attempt với `expires_at = now + duration` (**đồng hồ tính ở server**). Trả nội dung đề **không kèm đáp án**.
- Lên lịch job BullMQ trễ đến `expires_at` để tự nộp bài; thêm cron quét mỗi phút làm dự phòng (dùng `ix_attempts_expiring`).
- Tự động lưu: `PUT /attempts/{id}/answers/{eqId}` (idempotent, upsert). FE debounce 500ms; mất mạng → xếp hàng trong IndexedDB/localStorage → khi có mạng gọi `PATCH /attempts/{id}/answers` (đồng bộ lô, bản mới nhất theo `answeredAt` được giữ).
- Heartbeat 30 giây: lưu vị trí câu hiện tại; server trả thời gian còn lại để FE chỉnh đồng hồ.
- Nộp bài: transaction khóa attempt (`SELECT … FOR UPDATE`), chuyển trạng thái SUBMITTED → `GradingService` chấm → GRADED. Nếu nộp 2 lần (ví dụ tự nộp và người dùng bấm nộp cùng lúc) thì lần sau trả về kết quả của lần trước, không chấm lại.
- `ScoringStrategy` (Strategy pattern): `Toeic990Strategy` (quy đổi Listening/Reading theo bảng), `Scale10Strategy`, `Scale100Strategy`.
- Tài nguyên nghe: `/media/{key}` có kiểm tra quyền, hỗ trợ HTTP Range để tua audio.

### 7.3. AI
- `AiProvider` interface: `generateJson(schema, prompt)`, `streamChat(messages)`. Bản cài đặt `GeminiProvider`; `FakeAiProvider` cho test và khi chưa có key.
- **Ẩn danh hóa** (`AnonymizerService`): chỉ gửi mã giả, thống kê theo topic/part, nội dung câu hỏi. Không gửi tên, email, id thật. Có unit test kiểm chứng.
- **Phân tích năng lực**: Service tự tính thống kê bằng SQL (tỉ lệ đúng theo topic/part/độ khó, xu hướng) → gửi bảng số liệu cho AI để diễn giải và đề xuất. **Điểm yếu xác định bằng số liệu, AI chỉ giải thích.** Nhờ vậy vẫn có kết quả khi AI lỗi (fallback: chỉ hiện thống kê + gợi ý theo quy tắc).
- **Gợi ý bài tập**: chọn câu hỏi ACTIVE trong các topic yếu, ưu tiên câu chưa làm/đã sai → tạo `Exam(kind=AI_PRACTICE)` → dùng lại luồng làm bài. Học viên vẫn tự chọn được topic (bài học rút từ Santa trong báo cáo khảo sát).
- **Giải thích đáp án**: cache theo câu hỏi trong `ai_explanations`, sinh lần đầu rồi dùng chung.
- **Chatbot**: WS `/chat`, stream từng đoạn; system prompt kiểu Khanmigo (gợi ý hướng làm, không giải hộ); ngữ cảnh gồm câu hỏi đang xem và đáp án học viên đã chọn. **Không cho hỏi đáp án khi bài thi đang IN_PROGRESS.**
- **Sinh câu hỏi từ tài liệu**: upload → trích văn bản → chia đoạn → job `ai-generation` → lưu `ai_generated_items` (DRAFT) → giáo viên sửa/duyệt → tạo `questions`. Báo tiến độ qua WS `/jobs`.
- Tất cả lượt gọi đi qua `AiGateway`: kiểm tra hạn mức → cache → gọi provider (retry exponential backoff + jitter khi gặp 429/503, timeout) → validate Zod → ghi `ai_usage_logs`.

### 7.4. Flashcard
Thuật toán lặp lại ngắt quãng rút gọn (dựa trên SM-2, 2 mức "Đã thuộc/Chưa thuộc" như use case) → tính `next_review_at`. Viết thành hàm thuần (pure function) để unit test.

---

## 8. Frontend

### 8.1. Định tuyến theo vai trò

| Khu vực | Layout | Trang chính |
|---|---|---|
| Công khai | `PublicLayout` | Landing, Đăng nhập, Đăng ký (học viên/giáo viên), Quên/đặt lại mật khẩu, Xác minh email, Danh sách & chi tiết khóa học/đề thi |
| Học viên `/app/*` | `StudentLayout` | Dashboard (tiến độ, bài làm dở, gợi ý AI), Khóa học của tôi, Học bài, **Làm bài thi (toàn màn hình)**, Kết quả & xem lại, Tiến độ (biểu đồ), Phân tích AI, Chatbot, Flashcard, Hồ sơ |
| Giáo viên `/teacher/*` | `TeacherLayout` | Dashboard, Khóa học (cây chương/bài kéo thả), Ngân hàng câu hỏi (bảng lọc, form, nhập Excel), Đề thi (builder theo Part, rút theo ma trận, xem trước), Sinh câu hỏi AI (duyệt) |
| Admin `/admin/*` | `AdminLayout` | Dashboard thống kê, Người dùng, Duyệt giáo viên, Vai trò & ma trận quyền, Báo cáo, Hạn mức AI, Cấu hình, Nhật ký kiểm toán, Sao lưu |

- `RequireAuth` + `RequireRole` bọc route; tải chậm (lazy load) từng khu vực.
- Kiểm tra quyền ở FE chỉ để ẩn/hiện giao diện; server mới là nơi quyết định.

### 8.2. Quy ước
- Dữ liệu từ server chỉ đi qua hook do Orval sinh (TanStack Query). Không copy dữ liệu server vào Zustand.
- Form: React Hook Form + Zod; lỗi từ server (`error.details`) gắn vào từng trường.
- Màn hình làm bài: store riêng `exam-session` (câu hiện tại, câu đánh dấu, hàng đợi offline), đồng hồ dựa trên `expires_at` từ server, cảnh báo khi rời trang, phím tắt chọn đáp án.
- Responsive từ đầu (mobile-first); kiểm tra màn làm bài ở 375px.
- Giao diện tiếng Việt, ngày giờ hiển thị theo `Asia/Ho_Chi_Minh`.

---

## 9. Chất lượng, kiểm thử, quy trình

| Hạng mục | Tiêu chí |
|---|---|
| Unit test (BE) | Bắt buộc cho: chấm điểm + quy đổi, SM-2, ẩn danh hóa, kiểm tra điều kiện xuất bản, rút đề theo ma trận, xoay vòng refresh token. Coverage ≥ 70% cho `grading`, `attempts`, `auth` |
| E2E API | Supertest trên DB test (docker, reset mỗi lần chạy): đăng ký → đăng nhập → làm bài → nộp → xem kết quả; phân quyền (403 khi truy cập tài nguyên người khác) |
| E2E UI | Playwright: 3 luồng (học viên thi thử, giáo viên tạo đề, admin khóa tài khoản) |
| Hiệu năng | k6: 50 VU làm bài đồng thời (tự động lưu + heartbeat + nộp), p95 < 500ms không tính AI (NFR-01, NFR-02). Chạy trong Tuần 21 |
| Git | `main` (bản bảo vệ/demo) ← `develop` ← `feature/SPRINT-<số>-<mô-tả>`; Conventional Commits; PR tự review + CI xanh mới merge |
| CI | `npm run lint` (ESLint + Prettier), `npm run typecheck`, `npm test`, `npm run build` cả BE và FE; job e2e dùng service postgres/redis |
| Theo dõi | Jira: mỗi sprint là 1 Epic, mỗi mục trong Mục 11 là 1 task; tên nhánh và commit gắn mã task (ví dụ `feature/SPRINT-28-auth-api`) |

**Definition of Done cho một tính năng:** migration + seed (nếu cần) · API có Swagger + DTO validate · kiểm tra quyền và quyền sở hữu · unit/e2e test cho logic chính · UI có trạng thái loading/empty/error · chạy tốt ở màn hình di động · ghi audit log nếu là thao tác quản trị.

---

## 10. Phân loại phạm vi API

| Nhóm | MVP (Bắt buộc) | Mở rộng (Nên có) | Cắt / đơn giản hóa |
|---|---|---|---|
| Auth | register, verify, resend, login, refresh, logout, forgot/reset | Google OAuth, register teacher | admin-invitations, 2FA |
| Me | GET/PATCH me, avatar, password | login-history, teacher-credentials | 2FA setup/enable/disable |
| Subjects | toàn bộ (8) | | |
| Courses (HV) | toàn bộ (6) | | |
| Teacher Courses | CRUD, chapters, lessons, publish/unpublish, gán đề | thumbnail, material, sắp xếp thứ tự, close | |
| Questions | CRUD, status, clone, import (template/preview/confirm/errors) | check-duplicate (trigram), bulk, history | |
| Teacher Exams | CRUD, sections, add questions, validation, preview, publish/unpublish | auto-fill theo ma trận, order | |
| Attempts | toàn bộ (11) | | |
| Results & Progress | result, review, attempts, score-trend, skills | courses, streak | |
| Flashcards | | toàn bộ nếu còn thời gian | (Có thể bỏ theo M1) |
| AI | analyses, latest, recommendations, practice-sets, ai-explanation, me/ai-usage | chat (REST + WS), generation-jobs | learning-path hoàn toàn tự động (giữ bản đơn giản: sắp xếp topic yếu theo thứ tự) |
| WebSocket | /notifications (chấm xong bài) | /chat, /jobs | |
| Admin Users & RBAC | users CRUD, lock/unlock, role, teacher-applications, roles/permissions | export, resend-credentials, reset-password | invitations |
| Admin Stats | overview, trends | reports, ai usage/quotas | export bất đồng bộ (đổi sang đồng bộ) |
| Admin System | settings, audit-logs, system/status | backups (list/create) | restore qua API, lịch sao lưu |
| Upload | /uploads | | |

---

## 11. Lộ trình theo sprint (Tuần 8 → 24)

Ký hiệu mức ưu tiên: 🔴 Bắt buộc · 🟡 Nên có · ⚪ Có thể bỏ

### Sprint 0 — Nền móng (Tuần 8: 21/9 – 27/9)
- 🔴 Khởi tạo npm workspaces, NestJS, Vite React; ESLint/Prettier/tsconfig strict; `.env.example`.
- 🔴 `docker-compose.yml`: postgres 16, redis 7, mailpit.
- 🔴 `schema.prisma` đầy đủ 26 bảng gốc + `question_groups` (D15) + bảng bổ sung cho Auth/Audit/Settings/Media; migration SQL tay (CHECK, partial index, trgm).
- 🔴 Chốt tệp mẫu Excel nhập câu hỏi (`Ke_hoach_soan_cau_hoi.md` Mục 5) để bắt đầu soạn dữ liệu song song.
- 🔴 Module hạ tầng: Prisma, Redis, Config, Logger; thành phần dùng chung ở Mục 6 (response envelope, filter, pagination, Swagger).
- 🔴 CI GitHub Actions; README chạy dự án.
- **Kết quả:** `docker compose up` + `npm run dev` chạy được BE (Swagger) + FE (trang trắng có layout).

### Sprint 1 — Xác thực, hồ sơ, RBAC (Tuần 9–10: 28/9 – 11/10)
- 🔴 BE: Auth đầy đủ (MVP), Me, PermissionGuard + seed quyền, audit interceptor, mail queue.
- 🔴 FE: Tailwind + shadcn, 4 layout, router + guard, axios + refresh interceptor, Orval pipeline; các trang Đăng ký/Đăng nhập/Quên mật khẩu/Xác minh/Hồ sơ/Đổi mật khẩu.
- 🟡 Google OAuth; đăng ký giáo viên + `teacher_applications`.
- **Kết quả:** 3 vai trò đăng nhập được và thấy đúng khu vực của mình.

### Sprint 2 — Môn học, khóa học (Tuần 11: 12/10 – 18/10)
- 🔴 BE: Subjects/Topics (admin), Teacher Courses (CRUD, chương, bài, publish), Courses cho học viên (tìm kiếm trigram, chi tiết, ghi danh có khóa dòng, hoàn thành bài học → progress).
- 🔴 FE: quản lý khóa học của giáo viên (cây chương/bài), danh sách/chi tiết/học bài của học viên; Upload + `/media`.
- **Kết quả:** giáo viên tạo và xuất bản khóa học, học viên ghi danh và học.

### Sprint 3 — Ngân hàng câu hỏi & đề thi (Tuần 12–13: 19/10 – 1/11)
- 🔴 BE: Questions + Question Groups (CRUD + options, ràng buộc skill–part, ≥1 đáp án đúng, quy tắc chỉ sửa được giải thích nếu câu đã có người trả lời → clone), import `.zip` gồm xlsx 2 sheet `groups`/`questions` + `media/` (template/preview/confirm/errors), revisions.
- 🔴 BE: Exams (sections, thêm câu thủ công, kiểm tra trùng trong đề, validation, preview, publish/unpublish, gán vào khóa học).
- 🟡 Rút câu tự động theo ma trận (topic × độ khó × số câu); check-duplicate.
- 🔴 FE: bảng câu hỏi có bộ lọc, form câu hỏi (media, options), màn hình nhập Excel có xem trước lỗi; builder đề thi.
- 🔴 Seed 300 câu TOEIC + 300 câu CNTT bằng chức năng nhập (dữ liệu từ kế hoạch soạn câu hỏi, hạn 1/11).
- **Kết quả:** có đề TOEIC và đề CNTT đã xuất bản với dữ liệu thật.

### Sprint 4 — Làm bài, chấm điểm, kết quả (Tuần 14–15: 2/11 – 15/11) ⭐ phần quan trọng nhất
- 🔴 BE: toàn bộ nhóm Attempts (Mục 7.2), GradingService + ScoringStrategy, job tự nộp bài, Results & Progress (result, review, history, score-trend, skills).
- 🔴 FE: màn làm bài (đồng hồ, bảng điều hướng, đánh dấu câu, audio player, tự động lưu, hàng đợi offline, khôi phục bài làm dở), trang kết quả, xem lại có lọc câu sai, trang tiến độ (Recharts: line + radar).
- 🔴 WS `/notifications`: báo đã chấm xong.
- 🔴 Test: unit chấm điểm; e2e luồng thi; thử rút mạng giữa chừng.
- **Kết quả:** demo trọn luồng thi thử TOEIC. **Mốc kiểm soát phạm vi: nếu chậm, cắt Flashcard và sinh câu hỏi AI.**

### Sprint 5 — AI phân tích & gợi ý (Tuần 16–17: 16/11 – 29/11)
- 🔴 `infra/ai`: AiProvider, GeminiProvider, FakeAiProvider, AiGateway (quota, cache, retry, Zod, usage log), AnonymizerService.
- 🔴 Phân tích năng lực (job + WS/polling), gợi ý bài tập, tạo bộ luyện tập (`AI_PRACTICE`), giải thích đáp án bằng AI; `/me/ai-usage`.
- 🔴 FE: trang Phân tích năng lực (radar + nhận xét AI + danh sách topic yếu + nút "Luyện ngay"), nút "Giải thích bằng AI" ở trang xem lại.
- **Kết quả:** đạt mục tiêu AI bắt buộc của M1.

### Sprint 6 — Chatbot trợ giảng (Tuần 18: 30/11 – 6/12) 🟡
- WS `/chat` stream, lưu hội thoại, system prompt theo ngữ cảnh câu hỏi, chặn khi đang thi; FE widget chat ở trang xem lại và trang học bài.

### Sprint 7 — Quản trị (Tuần 19: 7/12 – 13/12)
- 🔴 Admin users (CRUD, khóa/mở, gán vai trò), duyệt giáo viên, ma trận quyền, dashboard tổng quan + xu hướng, settings, audit logs.
- 🟡 Báo cáo (hoạt động học viên, mức độ sử dụng nội dung, nội dung AI), xuất CSV/XLSX, thống kê và hạn mức AI, danh sách/tạo bản sao lưu.

### Sprint 8 — Phần mở rộng (Tuần 20: 14/12 – 20/12) 🟡/⚪
- 🟡 Sinh câu hỏi từ PDF/DOCX + màn hình duyệt (WS `/jobs`).
- ⚪ Flashcard (bộ thẻ, ôn tập SM-2, thêm nhanh từ kết quả), streak, learning-path.
- *Làm theo thứ tự này, hết tuần thì dừng.*

### Sprint 9 — Hoàn thiện (Tuần 21–22: 21/12 – 3/1/2027)
- 🔴 Kiểm thử tích hợp toàn hệ thống, Playwright 3 luồng, k6 50 người dùng đồng thời, tối ưu truy vấn (`EXPLAIN ANALYZE` các truy vấn thống kê), rà soát bảo mật (OWASP checklist, phân quyền từng endpoint), sửa lỗi.
- 🔴 Đóng gói: Dockerfile BE/FE, `docker-compose.prod.yml` chạy toàn bộ hệ thống trên một máy local bằng một lệnh, hướng dẫn cài đặt, bộ dữ liệu demo.
- 🟡 Triển khai bản demo online: nơi deploy **chốt sau** (VPS hoặc dịch vụ miễn phí); nhờ đã có Docker nên chuyển sang môi trường nào cũng không phải sửa code.
- **Code freeze cuối Tuần 22.**

### Tuần 23–24 (4/1 – 17/1/2027)
- Báo cáo ĐATN, hướng dẫn sử dụng, slide, tổng duyệt demo. Chỉ sửa lỗi nghiêm trọng.

---

## 12. Rủi ro và cách xử lý

| Rủi ro | Dấu hiệu | Cách xử lý |
|---|---|---|
| Trễ tiến độ | Cuối Sprint 4 chưa demo được luồng thi | Cắt Sprint 8; chatbot chỉ làm REST, không streaming |
| Gemini bị giới hạn tốc độ (429) / đổi gói miễn phí | Tỉ lệ lỗi AI cao | Hàng đợi có giới hạn tốc độ, cache, `FakeAiProvider` cho demo offline, fallback thống kê |
| Thiếu dữ liệu câu hỏi | Chậm so với lịch ở `Ke_hoach_soan_cau_hoi.md` Mục 4 | Ưu tiên đủ CNTT + Reading; Listening giảm về mức đủ 1 đề full test |
| Bản quyền đề TOEIC | Dùng đề ETS thật | Chỉ dùng câu tự soạn hoặc theo định dạng TOEIC; ghi nguồn |
| Mất dữ liệu bài làm | Lỗi mạng khi thi | Server tính giờ, tự động lưu idempotent, hàng đợi offline, test rút mạng |
| Prisma thiếu tính năng (partial index, CHECK) | Migration bị drift | Toàn bộ SQL tay nằm trong migration; không sửa DB bằng tay |

---

## 13. Việc cần làm ngay (Sprint 0)

1. Tạo nhánh `feature/SPRINT-20-project-setup` từ `develop`.
2. Dựng khung `backend/` (NestJS) và `frontend/` (Vite React TS), root `package.json` dạng workspaces, `docker-compose.yml`.
3. Viết `schema.prisma` từ Mục 5 và tài liệu CSDL → `prisma migrate dev` → bổ sung SQL tay → seed tối thiểu (roles, permissions, admin, subjects, topics).
4. Làm các thành phần dùng chung ở Mục 6 + `/system/status`.
5. CI xanh → merge vào `develop`.
