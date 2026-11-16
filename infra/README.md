# Deploy bản staging lên AWS EC2 (SPRINT-80, SPRINT-81)

Một máy EC2 chạy toàn bộ hệ thống bằng Docker Compose (`infra/docker-compose.prod.yml`):

```
Internet ─443/80─▶ web (Nginx: HTTPS + file tĩnh React)
                     ├─ /api/*, /socket.io/* ─▶ backend (NestJS, ffmpeg, worker chấm bài, cron)
                     └─ /.well-known/acme-challenge/ ─▶ certbot (cấp, gia hạn chứng chỉ)
backend ─▶ postgres · redis · rustfs   (mạng nội bộ Docker, không mở ra ngoài)
migrate: chạy mỗi lần deploy (prisma migrate deploy + seed) rồi thoát
```

## 1. Tạo máy EC2 (AWS Console)
1. Chọn vùng **Asia Pacific (Sydney) `ap-southeast-2`** ở góc phải trên.
2. **EC2 → Launch instance**:
   - Tên: `smart-english-exam`
   - AMI: **Ubuntu Server 26.04 LTS**, kiến trúc **64-bit (x86)**
   - Instance type: **t3.small** (2 GB RAM, đã tính swap ở bước 3); muốn build nhanh hơn chọn t3.medium
   - Key pair: **Create new key pair** (ED25519, `.pem`), tải về giữ kỹ, mất là không SSH được
   - Network settings → Create security group, cho phép:
     - SSH (22) từ **My IP**
     - HTTP (80) và HTTPS (443) từ **Anywhere**
   - Storage: **30 GB gp3**
3. **EC2 → Elastic IPs → Allocate** rồi **Associate** với máy vừa tạo. Ghi lại IP này.

> Không mở 5432, 6379, 9000, 9001 ra ngoài. Giao diện RustFS xem qua SSH tunnel (mục 8).

## 2. Tên miền miễn phí No-IP
1. Đăng nhập https://my.noip.com → **DDNS & Remote Access → Hostnames → Create Hostname**.
2. Hostname ví dụ `smartexam`, domain `ddns.net`, Record type **A**, IPv4 = **Elastic IP** ở trên.
3. Bản miễn phí phải **xác nhận hostname qua email mỗi 30 ngày**, bỏ qua là bị xóa.
4. Kiểm tra (vài phút sau): `nslookup smartexam.ddns.net` ra đúng Elastic IP.

## 3. Cài đặt máy chủ (SSH vào máy)
```bash
ssh -i smart-english-exam.pem ubuntu@<Elastic IP>

# Cập nhật hệ thống, múi giờ Việt Nam (cron sao lưu, log)
sudo apt update && sudo apt -y upgrade
sudo timedatectl set-timezone Asia/Ho_Chi_Minh

# Swap 4 GB: đủ RAM để build image trên t3.small
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker Engine + compose plugin (script chính thức của Docker)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit   # đăng nhập lại để nhóm docker có hiệu lực
```

Lấy code (repo riêng tư: dùng **deploy key** chỉ đọc):
```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
# GitHub → repo → Settings → Deploy keys → Add key (không tick "Allow write access")
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
EOF
sudo mkdir -p /opt/smart-english-exam /opt/backups && sudo chown ubuntu: /opt/smart-english-exam /opt/backups
git clone git@github.com:vutungvn/smart-english-exam-system.git /opt/smart-english-exam
cd /opt/smart-english-exam && git checkout main
```

## 4. Biến môi trường
```bash
cp infra/.env.prod.example infra/.env.prod
chmod 600 infra/.env.prod
nano infra/.env.prod
```
- `APP_DOMAIN`, `APP_URL`, `GOOGLE_CALLBACK_URL`: theo hostname No-IP.
- `POSTGRES_PASSWORD`: `openssl rand -hex 24` (chỉ chữ và số vì nằm trong URL kết nối).
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: mỗi cái `openssl rand -base64 48`, hai giá trị khác nhau.
- `S3_SECRET_KEY`: `openssl rand -hex 24`.
- `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: Gmail + App Password (như `.env` ở máy dev).
- `GEMINI_API_KEY`: key riêng cho staging. Gói miễn phí Google có thể dùng dữ liệu gửi lên để cải
  thiện sản phẩm: chỉ tự test thì được, cho người khác thi Speaking thật nên dùng gói trả phí.
- `SEED_ADMIN_PASSWORD`: mật khẩu mạnh ≥ 12 ký tự cho tài khoản admin tạo lần đầu.
- Google OAuth: thêm `https://<hostname>/api/v1/auth/google/callback` vào Authorized redirect URIs
  trên Google Cloud Console; không dùng thì để trống `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## 5. Cấp chứng chỉ HTTPS (một lần)
```bash
bash infra/scripts/init-ssl.sh --staging   # thử với máy chủ thử của Let's Encrypt
bash infra/scripts/init-ssl.sh             # thành công thì lấy chứng chỉ thật
```
Let's Encrypt giới hạn số chứng chỉ cấp cho mỗi tên miền gốc (`ddns.net` dùng chung với rất nhiều
người), nên luôn thử `--staging` trước và **không xóa volume `letsencrypt`**. Certbot tự gia hạn.

## 6. Deploy
```bash
bash infra/scripts/deploy.sh
```
Lần đầu build mất khoảng 5–10 phút. Service `migrate` áp migration và seed (vai trò, admin, chương
trình TOEIC) xong thì backend mới chạy. Kiểm tra:
```bash
curl -I https://<hostname>/api/v1
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod ps
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod logs -f backend
```
Các lần sau: merge vào `main` → SSH vào máy → `bash infra/scripts/deploy.sh`.

## 7. Tài khoản giáo viên
Chưa có màn admin quản lý người dùng (SPRINT-66) nên tạo giáo viên bằng lệnh; mật khẩu in ra một lần,
giáo viên đổi ở Hồ sơ → Đổi mật khẩu:
```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod run --rm migrate \
  npm run user:create -- --role TEACHER --email gv@example.com --name "Nguyễn Văn A"
```
Học viên tự đăng ký (email xác minh gửi qua Gmail). Giáo viên nhập câu hỏi bằng tệp .zip, soạn và
xuất bản đề.

## 8. Vận hành
- **Sao lưu** (CSDL mỗi ngày, kho tệp mỗi Chủ nhật, lệnh phục hồi ghi trong script):
  ```bash
  bash infra/scripts/backup.sh          # chạy thử
  crontab -e
  # 0 2 * * * /bin/bash /opt/smart-english-exam/infra/scripts/backup.sh >> /opt/backups/backup.log 2>&1
  ```
- **Giao diện RustFS**: `ssh -i <key>.pem -L 9001:127.0.0.1:9001 ubuntu@<Elastic IP>` rồi mở
  http://localhost:9001 (đăng nhập bằng `S3_ACCESS_KEY` / `S3_SECRET_KEY`).
- **Xem log**: `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod logs -f <service>`
  (mỗi container giữ tối đa 30 MB log).
- **Chi phí**: máy, ổ đĩa và IPv4 tính theo giờ. Tắt máy (Stop) khi không test thì không tính tiền máy,
  vẫn tính ổ và Elastic IP. Elastic IP giữ nguyên khi Stop/Start nên không phải sửa No-IP.

## Chạy thử stack production ở máy dev
```bash
cp infra/.env.prod.example infra/.env.prod   # APP_DOMAIN=localhost, điền các secret
bash infra/scripts/init-ssl.sh --self-signed
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build
# Mở https://localhost (bỏ qua cảnh báo chứng chỉ tự ký). Dừng stack dev trước nếu trùng cổng.
```
