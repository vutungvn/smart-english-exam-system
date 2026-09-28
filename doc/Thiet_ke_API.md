# THIẾT KẾ API

Phần này trình bày thiết kế giao diện lập trình ứng dụng (API) của hệ thống, được xây dựng trực tiếp từ các use case trong tài liệu phân tích và lược đồ cơ sở dữ liệu đã thiết kế. Hệ thống cung cấp 188 điểm cuối (endpoint), gồm các RESTful API trao đổi dữ liệu dạng JSON và các kênh WebSocket phục vụ giao tiếp thời gian thực, được chia thành 16 nhóm chức năng tương ứng với các module của Backend NestJS. Tài liệu chi tiết từng API (tham số, dữ liệu mẫu, mã lỗi) được sinh tự động bằng Swagger.

## 1. Quy ước chung

Để các API nhất quán và dễ tích hợp với Frontend, thiết kế tuân theo các quy ước sau:

***Bảng 4.1.*** *Quy ước thiết kế API*

| **Nội dung** | **Quy ước áp dụng** |
|---|---|
| Địa chỉ gốc | Mọi endpoint có tiền tố /api/v1. Route công khai và của học viên đặt ở gốc; /teacher/* dành cho giáo viên; /admin/* dành cho quản trị viên |
| Đặt tên endpoint | Danh từ số nhiều, kebab-case (ví dụ /flashcard-decks); tham số đường dẫn đặt trong ngoặc nhọn {id}; hành động nghiệp vụ không thuộc CRUD dùng động từ ở cuối (ví dụ /publish, /submit) |
| Phương thức HTTP | GET – truy xuất; POST – tạo mới hoặc thực hiện hành động; PUT – thay thế toàn bộ; PATCH – cập nhật một phần; DELETE – xóa (xóa mềm với courses, questions, exams) |
| Xác thực | Access Token (15 phút) gửi qua header Authorization: Bearer <token>; Refresh Token (7 ngày) lưu trong cookie httpOnly, Secure, SameSite=Strict |
| Phân quyền | Guard RBAC kiểm tra quyền theo cặp (module, action) của bảng permissions, kết hợp kiểm tra quyền sở hữu tài nguyên |
| Định dạng phản hồi | Thành công: { success, status, data, meta }. Lỗi: { success: false, status, error: { code, message, details } }. Trường status luôn trùng với mã trạng thái HTTP của phản hồi |
| Phân trang | Tham số page, limit, sort (ví dụ sort=createdAt:desc); kết quả trả về meta: { page, limit, total }; phân trang luôn thực hiện phía máy chủ |
| Xung đột đồng thời | Client gửi kèm updatedAt khi cập nhật; nếu dữ liệu đã bị thay đổi, trả về 409 VERSION_CONFLICT |
| Tác vụ dài | Tác vụ gọi AI, xuất báo cáo, sao lưu trả về 202 Accepted kèm jobId, xử lý qua hàng đợi BullMQ và thông báo tiến độ qua WebSocket |
| Mã trạng thái | 200 OK, 201 Created, 202 Accepted, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 410 Gone, 422 Unprocessable Entity, 429 Too Many Requests, 503 Service Unavailable |

## 2. Quy ước quyền hạn

Cột Quyền hạn trong các bảng danh sách API sử dụng các giá trị sau:

***Bảng 4.2.*** *Các mức quyền hạn truy cập API*

| **Quyền hạn** | **Ý nghĩa** |
|---|---|
| Public | Không yêu cầu đăng nhập |
| Authorized User | Mọi tài khoản đã đăng nhập, không phân biệt vai trò |
| Student | Tài khoản có vai trò học viên |
| Teacher | Tài khoản có vai trò giáo viên đã được phê duyệt |
| Admin | Tài khoản có vai trò quản trị viên |
| Owner | Người sở hữu tài nguyên: giáo viên phụ trách khóa học, tác giả câu hỏi, đề thi; học viên sở hữu bài làm; chủ bộ flashcard |

## 3. Danh sách API

### 3.1. Auth – Xác thực

***Bảng 4.3.*** *Danh sách API nhóm Auth – Xác thực*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /auth/register | **POST** | Đăng ký tài khoản học viên | Public |
| /auth/register/teacher | **POST** | Đăng ký tài khoản giáo viên (kèm minh chứng) | Public |
| /auth/admin-invitations/{code} | **GET** | Kiểm tra mã mời quản trị viên | Public |
| /auth/register/admin | **POST** | Đăng ký tài khoản quản trị viên bằng mã mời | Public (có mã mời) |
| /auth/verify-email | **POST** | Xác thực email, kích hoạt tài khoản | Public |
| /auth/resend-verification | **POST** | Gửi lại email kích hoạt | Public |
| /auth/login | **POST** | Đăng nhập (cấp Access/Refresh Token) | Public |
| /auth/login/2fa | **POST** | Xác thực hai yếu tố khi đăng nhập | Admin (mfaToken) |
| /auth/refresh | **POST** | Cấp lại Access Token | Authorized User (Refresh Token) |
| /auth/logout | **POST** | Đăng xuất, thu hồi Refresh Token | Authorized User |
| /auth/forgot-password | **POST** | Yêu cầu đặt lại mật khẩu | Public |
| /auth/reset-password/validate | **GET** | Kiểm tra token đặt lại mật khẩu | Public |
| /auth/reset-password | **POST** | Đặt lại mật khẩu mới | Public |
| /auth/google | **GET** | Đăng nhập bằng Google OAuth 2.0 | Public |
| /auth/google/callback | **GET** | Xử lý kết quả trả về từ Google | Public |

### 3.2. Me – Hồ sơ cá nhân

***Bảng 4.4.*** *Danh sách API nhóm Me – Hồ sơ cá nhân*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /me | **GET** | Lấy thông tin hồ sơ cá nhân | Authorized User |
| /me | **PATCH** | Cập nhật hồ sơ cá nhân | Authorized User |
| /me/avatar | **POST** | Tải lên ảnh đại diện | Authorized User |
| /me/password | **PATCH** | Đổi mật khẩu | Authorized User |
| /me/login-history | **GET** | Xem lịch sử đăng nhập | Authorized User |
| /me/teacher-credentials | **POST** | Bổ sung minh chứng chuyên môn | Teacher |
| /me/2fa/setup | **POST** | Khởi tạo xác thực hai yếu tố | Admin |
| /me/2fa/enable | **POST** | Bật xác thực hai yếu tố | Admin |
| /me/2fa/disable | **POST** | Tắt xác thực hai yếu tố | Admin |

### 3.3. Subjects – Môn học và chủ đề

***Bảng 4.5.*** *Danh sách API nhóm Subjects – Môn học và chủ đề*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /subjects | **GET** | Truy xuất danh sách môn học (findAll) | Public |
| /subjects/{id}/topics | **GET** | Lấy danh sách chủ đề của môn học | Public |
| /admin/subjects | **POST** | Tạo mới môn học (create) | Admin |
| /admin/subjects/{id} | **PATCH** | Cập nhật môn học | Admin |
| /admin/subjects/{id} | **DELETE** | Xóa môn học | Admin |
| /admin/subjects/{id}/topics | **POST** | Tạo mới chủ đề | Admin |
| /admin/subjects/{id}/topics/{topicId} | **PATCH** | Cập nhật chủ đề | Admin |
| /admin/subjects/{id}/topics/{topicId} | **DELETE** | Xóa chủ đề | Admin |

### 3.4. Courses – Khóa học (học viên)

***Bảng 4.6.*** *Danh sách API nhóm Courses – Khóa học (học viên)*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /courses | **GET** | Tìm kiếm, lọc khóa học đã xuất bản (findAll) | Public |
| /courses/{id} | **GET** | Lấy thông tin chi tiết khóa học (Theo ID) | Public |
| /courses/{id}/enrollments | **POST** | Đăng ký tham gia khóa học | Student |
| /me/enrollments | **GET** | Lấy danh sách khóa học của tôi | Student |
| /courses/{id}/lessons/{lessonId} | **GET** | Xem nội dung bài học | Student (đã ghi danh) |
| /enrollments/{id}/lessons/{lessonId}/complete | **POST** | Đánh dấu hoàn thành bài học | Student (Owner) |

### 3.5. Teacher Courses – Quản lý khóa học

***Bảng 4.7.*** *Danh sách API nhóm Teacher Courses – Quản lý khóa học*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /teacher/dashboard | **GET** | Xem tổng quan trang làm việc giáo viên | Teacher |
| /teacher/courses | **GET** | Truy xuất danh sách khóa học phụ trách (findAll) | Teacher |
| /teacher/courses | **POST** | Tạo mới khóa học (create) | Teacher |
| /teacher/courses/{id} | **GET** | Lấy thông tin chi tiết khóa học (Theo ID) | Teacher (Owner) |
| /teacher/courses/{id} | **PATCH** | Cập nhật thông tin khóa học | Teacher (Owner) |
| /teacher/courses/{id} | **DELETE** | Xóa mềm khóa học | Teacher (Owner) |
| /teacher/courses/{id}/thumbnail | **POST** | Tải lên ảnh đại diện khóa học | Teacher (Owner) |
| /teacher/courses/{id}/publish | **POST** | Xuất bản khóa học | Teacher (Owner) |
| /teacher/courses/{id}/unpublish | **POST** | Gỡ xuất bản khóa học | Teacher (Owner) |
| /teacher/courses/{id}/close | **POST** | Đóng khóa học | Teacher (Owner) |
| /teacher/courses/{id}/chapters | **POST** | Thêm chương | Teacher (Owner) |
| /teacher/chapters/{id} | **PATCH** | Cập nhật chương | Teacher (Owner) |
| /teacher/chapters/{id} | **DELETE** | Xóa chương | Teacher (Owner) |
| /teacher/chapters/{id}/lessons | **POST** | Thêm bài học | Teacher (Owner) |
| /teacher/lessons/{id} | **PATCH** | Cập nhật bài học | Teacher (Owner) |
| /teacher/lessons/{id} | **DELETE** | Xóa bài học | Teacher (Owner) |
| /teacher/lessons/{id}/material | **POST** | Tải lên tài liệu bài học | Teacher (Owner) |
| /teacher/courses/{id}/structure/order | **PUT** | Sắp xếp thứ tự chương, bài học | Teacher (Owner) |
| /teacher/courses/{id}/exams | **POST** | Gán đề thi vào khóa học | Teacher (Owner) |
| /teacher/courses/{id}/exams/{examId} | **DELETE** | Gỡ đề thi khỏi khóa học | Teacher (Owner) |

### 3.6. Teacher Questions – Ngân hàng câu hỏi

***Bảng 4.8.*** *Danh sách API nhóm Teacher Questions – Ngân hàng câu hỏi*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /teacher/questions | **GET** | Tìm kiếm, lọc câu hỏi (findAll) | Teacher |
| /teacher/questions/{id} | **GET** | Lấy thông tin chi tiết câu hỏi (Theo ID) | Teacher |
| /teacher/questions | **POST** | Tạo mới câu hỏi (create) | Teacher |
| /teacher/questions/check-duplicate | **POST** | Kiểm tra câu hỏi trùng lặp | Teacher |
| /teacher/questions/{id} | **PATCH** | Cập nhật câu hỏi | Teacher (Owner) |
| /teacher/questions/{id}/clone | **POST** | Nhân bản câu hỏi | Teacher |
| /teacher/questions/{id}/status | **PATCH** | Thay đổi trạng thái sử dụng | Teacher (Owner) |
| /teacher/questions/{id} | **DELETE** | Xóa mềm câu hỏi | Teacher (Owner) |
| /teacher/questions/bulk | **POST** | Thao tác hàng loạt trên câu hỏi | Teacher |
| /teacher/questions/{id}/history | **GET** | Xem lịch sử chỉnh sửa câu hỏi | Teacher |
| /teacher/questions/import/template | **GET** | Tải tệp mẫu nhập câu hỏi | Teacher |
| /teacher/questions/import/preview | **POST** | Xem trước dữ liệu nhập từ tệp | Teacher |
| /teacher/questions/import/{importId}/confirm | **POST** | Xác nhận nhập câu hỏi từ tệp | Teacher |
| /teacher/questions/import/{importId}/errors | **GET** | Tải danh sách dòng lỗi khi nhập | Teacher |

### 3.7. Teacher Exams – Quản lý đề thi

***Bảng 4.9.*** *Danh sách API nhóm Teacher Exams – Quản lý đề thi*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /teacher/exams | **GET** | Truy xuất danh sách đề thi (findAll) | Teacher |
| /teacher/exams | **POST** | Tạo mới đề thi (create) | Teacher |
| /teacher/exams/{id} | **GET** | Lấy thông tin chi tiết đề thi (Theo ID) | Teacher (Owner) |
| /teacher/exams/{id} | **PATCH** | Cập nhật thông tin, cấu hình đề thi | Teacher (Owner) |
| /teacher/exams/{id} | **DELETE** | Xóa mềm đề thi | Teacher (Owner) |
| /teacher/exams/{id}/sections | **POST** | Thêm phần thi (Part) | Teacher (Owner) |
| /teacher/exam-sections/{id} | **PATCH** | Cập nhật phần thi | Teacher (Owner) |
| /teacher/exam-sections/{id} | **DELETE** | Xóa phần thi | Teacher (Owner) |
| /teacher/exam-sections/{id}/questions | **POST** | Chọn câu hỏi thủ công vào phần thi | Teacher (Owner) |
| /teacher/exams/{id}/auto-fill | **POST** | Rút câu hỏi tự động theo ma trận đề | Teacher (Owner) |
| /teacher/exam-questions/{id} | **PATCH** | Cập nhật điểm, thứ tự câu hỏi trong đề | Teacher (Owner) |
| /teacher/exam-questions/{id} | **DELETE** | Gỡ câu hỏi khỏi đề | Teacher (Owner) |
| /teacher/exams/{id}/order | **PUT** | Sắp xếp thứ tự phần thi, câu hỏi | Teacher (Owner) |
| /teacher/exams/{id}/validation | **GET** | Kiểm tra điều kiện xuất bản | Teacher (Owner) |
| /teacher/exams/{id}/preview | **GET** | Xem trước đề thi | Teacher (Owner) |
| /teacher/exams/{id}/publish | **POST** | Xuất bản đề thi | Teacher (Owner) |
| /teacher/exams/{id}/unpublish | **POST** | Gỡ xuất bản đề thi | Teacher (Owner) |

### 3.8. Exams & Attempts – Làm bài thi

***Bảng 4.10.*** *Danh sách API nhóm Exams & Attempts – Làm bài thi*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /exams | **GET** | Tìm kiếm, lọc đề thi đã xuất bản (findAll) | Public |
| /exams/{id} | **GET** | Lấy thông tin chi tiết đề thi (Theo ID) | Public |
| /exams/{id}/attempts | **POST** | Bắt đầu làm bài (tạo phiên làm bài) | Student |
| /me/attempts/in-progress | **GET** | Lấy danh sách bài làm dở dang | Student |
| /attempts/{id} | **GET** | Tải / khôi phục phiên làm bài | Student (Owner) |
| /attempts/{id}/answers/{examQuestionId} | **PUT** | Tự động lưu câu trả lời | Student (Owner) |
| /attempts/{id}/answers | **PATCH** | Đồng bộ câu trả lời sau khi mất kết nối | Student (Owner) |
| /attempts/{id}/heartbeat | **POST** | Cập nhật thời gian còn lại, vị trí làm bài | Student (Owner) |
| /attempts/{id}/submit | **POST** | Nộp bài và chấm điểm tự động | Student (Owner) |
| /attempts/{id}/cancel | **POST** | Hủy phiên làm bài để làm lại | Student (Owner) |
| /media/{key} | **GET** | Tải tài nguyên âm thanh, hình ảnh | Authorized User |

### 3.9. Results & Progress – Kết quả và tiến độ

***Bảng 4.11.*** *Danh sách API nhóm Results & Progress – Kết quả và tiến độ*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /attempts/{id}/result | **GET** | Xem kết quả tổng quan bài làm | Student (Owner) |
| /attempts/{id}/review | **GET** | Xem chi tiết đáp án và giải thích | Student (Owner) |
| /me/attempts | **GET** | Xem lịch sử làm bài | Student |
| /me/progress/score-trend | **GET** | Lấy dữ liệu biểu đồ điểm theo thời gian | Student |
| /me/progress/skills | **GET** | Thống kê năng lực theo kỹ năng, Part, chủ đề | Student |
| /me/progress/courses | **GET** | Xem tỉ lệ hoàn thành khóa học | Student |
| /me/progress/streak | **GET** | Xem chuỗi ngày học liên tiếp | Student |

### 3.10. Flashcards – Thẻ ghi nhớ

***Bảng 4.12.*** *Danh sách API nhóm Flashcards – Thẻ ghi nhớ*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /flashcard-decks | **GET** | Truy xuất danh sách bộ thẻ (findAll) | Authorized User |
| /flashcard-decks | **POST** | Tạo mới bộ thẻ (create) | Authorized User |
| /flashcard-decks/{id} | **GET** | Lấy thông tin chi tiết bộ thẻ (Theo ID) | Authorized User |
| /flashcard-decks/{id} | **PATCH** | Cập nhật bộ thẻ | Owner |
| /flashcard-decks/{id} | **DELETE** | Xóa bộ thẻ | Owner |
| /flashcard-decks/{id}/cards | **POST** | Thêm thẻ vào bộ | Owner |
| /flashcards/{id} | **PATCH** | Cập nhật thẻ | Owner |
| /flashcards/{id} | **DELETE** | Xóa thẻ | Owner |
| /flashcards/quick-add | **POST** | Thêm nhanh thẻ từ kết quả bài thi | Student |
| /flashcard-decks/{id}/study | **GET** | Lấy danh sách thẻ để ôn tập | Student |
| /flashcards/{id}/reviews | **POST** | Ghi nhận kết quả ôn tập thẻ | Student |
| /flashcard-decks/{id}/reviews/batch | **POST** | Đồng bộ kết quả ôn tập | Student |
| /flashcard-decks/{id}/stats | **GET** | Xem tổng kết phiên ôn tập | Student |

### 3.11. AI – Trí tuệ nhân tạo

***Bảng 4.13.*** *Danh sách API nhóm AI – Trí tuệ nhân tạo*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /ai/analyses | **POST** | Yêu cầu AI phân tích năng lực | Student |
| /ai/analyses/latest | **GET** | Xem kết quả phân tích năng lực gần nhất | Student |
| /ai/recommendations | **GET** | Lấy gợi ý bài tập theo lỗ hổng kiến thức | Student |
| /ai/practice-sets | **POST** | Tạo bộ luyện tập từ gợi ý AI | Student |
| /ai/learning-path | **GET** | Xem lộ trình học tập cá nhân hóa | Student |
| /questions/{id}/ai-explanation | **GET** | Lấy giải thích đáp án bằng AI | Student |
| /ai/chat/conversations | **POST** | Tạo hội thoại chatbot theo ngữ cảnh | Student |
| /ai/chat/conversations | **GET** | Truy xuất danh sách hội thoại | Student |
| /ai/chat/conversations/{id}/messages | **GET** | Xem lịch sử tin nhắn | Student (Owner) |
| /ai/chat/conversations/{id}/messages | **POST** | Gửi tin nhắn cho chatbot | Student (Owner) |
| /teacher/ai/generation-jobs | **POST** | Tạo tác vụ sinh câu hỏi / flashcard từ tài liệu | Teacher |
| /teacher/ai/generation-jobs | **GET** | Truy xuất danh sách tác vụ sinh nội dung | Teacher |
| /teacher/ai/generation-jobs/{id} | **GET** | Xem trạng thái tác vụ sinh nội dung | Teacher (Owner) |
| /teacher/ai/generation-jobs/{id}/items | **GET** | Lấy danh sách nội dung AI sinh chờ duyệt | Teacher (Owner) |
| /teacher/ai/generated-items/{id} | **PATCH** | Chỉnh sửa nội dung AI sinh | Teacher (Owner) |
| /teacher/ai/generation-jobs/{id}/approve | **POST** | Duyệt nội dung vào ngân hàng câu hỏi | Teacher (Owner) |
| /teacher/ai/generation-jobs/{id}/reject | **POST** | Từ chối nội dung AI sinh | Teacher (Owner) |
| /me/ai-usage | **GET** | Xem hạn mức sử dụng AI còn lại | Authorized User |

### 3.12. WebSocket (Socket.IO)

***Bảng 4.14.*** *Danh sách API nhóm WebSocket (Socket.IO)*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /chat (chat:send) | **WS** | Gửi câu hỏi và nhận trả lời streaming từ chatbot | Student |
| /jobs (job:subscribe) | **WS** | Theo dõi tiến độ tác vụ nền (AI, báo cáo, sao lưu) | Authorized User |
| /notifications | **WS** | Nhận thông báo (chấm xong bài, bị thu hồi phiên, được duyệt) | Authorized User |

### 3.13. Admin Users & RBAC – Người dùng và phân quyền

***Bảng 4.15.*** *Danh sách API nhóm Admin Users & RBAC – Người dùng và phân quyền*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /admin/users | **GET** | Tìm kiếm, lọc người dùng (findAll) | Admin |
| /admin/users/{id} | **GET** | Lấy thông tin chi tiết người dùng (Theo ID) | Admin |
| /admin/users | **POST** | Tạo mới tài khoản người dùng (create) | Admin |
| /admin/users/{id} | **PATCH** | Cập nhật thông tin người dùng | Admin |
| /admin/users/{id}/resend-credentials | **POST** | Gửi lại thông tin đăng nhập | Admin |
| /admin/users/{id}/reset-password | **POST** | Đặt lại mật khẩu cho người dùng | Admin |
| /admin/users/{id}/lock | **POST** | Khóa tài khoản | Admin |
| /admin/users/{id}/unlock | **POST** | Mở khóa tài khoản | Admin |
| /admin/users/{id}/role | **PATCH** | Gán vai trò cho người dùng | Admin |
| /admin/users/export | **POST** | Xuất danh sách người dùng | Admin |
| /admin/teacher-applications | **GET** | Lấy danh sách hồ sơ giáo viên chờ duyệt | Admin |
| /admin/teacher-applications/{userId}/approve | **POST** | Phê duyệt hồ sơ giáo viên | Admin |
| /admin/teacher-applications/{userId}/reject | **POST** | Từ chối hồ sơ giáo viên | Admin |
| /admin/invitations | **GET** | Truy xuất danh sách mã mời quản trị viên | Admin |
| /admin/invitations | **POST** | Tạo mã mời quản trị viên | Admin |
| /admin/invitations/{id} | **DELETE** | Thu hồi mã mời | Admin |
| /admin/roles | **GET** | Truy xuất danh sách vai trò | Admin |
| /admin/permissions | **GET** | Truy xuất danh sách quyền theo module | Admin |
| /admin/roles/{id}/permissions | **GET** | Xem ma trận quyền của vai trò | Admin |
| /admin/roles/{id}/permissions | **PUT** | Cập nhật ma trận quyền của vai trò | Admin |

### 3.14. Admin Statistics – Thống kê và báo cáo

***Bảng 4.16.*** *Danh sách API nhóm Admin Statistics – Thống kê và báo cáo*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /admin/dashboard/overview | **GET** | Xem bảng điều khiển thống kê tổng quan | Admin |
| /admin/dashboard/trends | **GET** | Lấy dữ liệu biểu đồ xu hướng | Admin |
| /admin/dashboard/refresh | **POST** | Làm mới dữ liệu thống kê | Admin |
| /admin/reports/student-activity | **GET** | Xem báo cáo hoạt động học viên | Admin |
| /admin/reports/content-usage | **GET** | Xem báo cáo mức độ sử dụng nội dung | Admin |
| /admin/reports/ai-content | **GET** | Xem báo cáo hiệu quả nội dung do AI sinh | Admin |
| /admin/reports/exports | **POST** | Tạo yêu cầu xuất báo cáo | Admin |
| /admin/reports/exports/{id} | **GET** | Xem trạng thái xuất báo cáo | Admin |
| /admin/reports/exports/{id}/download | **GET** | Tải tệp báo cáo | Admin |
| /admin/ai/usage | **GET** | Thống kê lượt gọi và chi phí AI | Admin |
| /admin/ai/quotas | **GET** | Xem cấu hình hạn mức AI | Admin |
| /admin/ai/quotas | **PUT** | Cập nhật hạn mức AI | Admin |

### 3.15. Admin System – Cấu hình, nhật ký, sao lưu

***Bảng 4.17.*** *Danh sách API nhóm Admin System – Cấu hình, nhật ký, sao lưu*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /admin/settings | **GET** | Truy xuất tham số hệ thống | Admin |
| /admin/settings/{group} | **PATCH** | Cập nhật tham số hệ thống theo nhóm | Admin |
| /admin/settings/{group}/reset | **POST** | Khôi phục tham số mặc định | Admin |
| /admin/audit-logs | **GET** | Tra cứu nhật ký kiểm toán | Admin |
| /admin/audit-logs/{id} | **GET** | Xem chi tiết bản ghi nhật ký | Admin |
| /admin/audit-logs/export | **POST** | Xuất nhật ký kiểm toán | Admin |
| /admin/backups | **GET** | Truy xuất danh sách bản sao lưu | Admin |
| /admin/backups | **POST** | Tạo bản sao lưu thủ công | Admin |
| /admin/backups/schedule | **GET** | Xem lịch sao lưu tự động | Admin |
| /admin/backups/schedule | **PUT** | Cập nhật lịch sao lưu tự động | Admin |
| /admin/backups/{id}/restore/request | **POST** | Yêu cầu phục hồi dữ liệu (bước 1) | Admin |
| /admin/backups/{id}/restore | **POST** | Xác nhận phục hồi dữ liệu (bước 2) | Admin |
| /admin/backups/{id} | **DELETE** | Xóa bản sao lưu | Admin |
| /system/status | **GET** | Kiểm tra trạng thái hệ thống | Public |

### 3.16. Upload dùng chung

***Bảng 4.18.*** *Danh sách API nhóm Upload dùng chung*

| **Endpoint** | **Method** | **Tên API (Chức năng)** | **Quyền hạn (Auth/Role)** |
|---|---|---|---|
| /uploads | **POST** | Tải tệp lên (ảnh, âm thanh, tài liệu) | Authorized User |

## 4. Tổng hợp

***Bảng 4.19.*** *Tổng hợp số lượng API theo nhóm chức năng*

| **STT** | **Nhóm API** | **Yêu cầu chức năng** | **Số API** |
|---|---|---|---|
| 1 | Auth – Xác thực | FR-01, FR-02, FR-03 | 15 |
| 2 | Me – Hồ sơ cá nhân | FR-04 | 9 |
| 3 | Subjects – Môn học và chủ đề | FR-12, FR-13 | 8 |
| 4 | Courses – Khóa học (học viên) | FR-05 | 6 |
| 5 | Teacher Courses – Quản lý khóa học | FR-13 | 20 |
| 6 | Teacher Questions – Ngân hàng câu hỏi | FR-12 | 14 |
| 7 | Teacher Exams – Quản lý đề thi | FR-12 | 17 |
| 8 | Exams & Attempts – Làm bài thi | FR-05, FR-06 | 11 |
| 9 | Results & Progress – Kết quả và tiến độ | FR-07 | 7 |
| 10 | Flashcards – Thẻ ghi nhớ | FR-08 | 13 |
| 11 | AI – Trí tuệ nhân tạo | FR-09, FR-10, FR-11 | 18 |
| 12 | WebSocket (Socket.IO) | FR-10, FR-11 | 3 |
| 13 | Admin Users & RBAC – Người dùng và phân quyền | FR-14 | 20 |
| 14 | Admin Statistics – Thống kê và báo cáo | FR-15 | 12 |
| 15 | Admin System – Cấu hình, nhật ký, sao lưu | UC quản trị hệ thống | 14 |
| 16 | Upload dùng chung | Dùng chung | 1 |
|  | Tổng cộng |  | 188 |
