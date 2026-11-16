#!/usr/bin/env bash
# Cấp chứng chỉ HTTPS lần đầu cho APP_DOMAIN (Let's Encrypt, xác minh qua webroot của Nginx).
# Nginx cần có chứng chỉ mới khởi động được cổng 443, nên làm theo thứ tự: tạo chứng chỉ tự ký tạm →
# bật Nginx → xóa chứng chỉ tạm → xin chứng chỉ thật → reload Nginx. Về sau certbot tự gia hạn.
#
#   infra/scripts/init-ssl.sh --staging      thử với máy chủ thử của Let's Encrypt (không tính giới hạn)
#   infra/scripts/init-ssl.sh                xin chứng chỉ thật
#   infra/scripts/init-ssl.sh --self-signed  chỉ dùng chứng chỉ tự ký (chạy thử ở local, APP_DOMAIN=localhost)
source "$(dirname "$0")/lib.sh"

MODE="${1:-production}"
DOMAIN="$(env_get APP_DOMAIN)"
EMAIL="$(env_get CERTBOT_EMAIL)"
LIVE="/etc/letsencrypt/live/$DOMAIN"

if [[ -z "$DOMAIN" ]]; then
  echo "Chưa khai APP_DOMAIN trong infra/.env.prod" >&2
  exit 1
fi

certbot_sh() {
  compose run --rm --entrypoint /bin/sh certbot -c "$1"
}

echo "== Chứng chỉ tự ký tạm cho $DOMAIN (nếu chưa có chứng chỉ nào)"
certbot_sh "test -f $LIVE/fullchain.pem || (mkdir -p $LIVE && openssl req -x509 -nodes -newkey rsa:2048 \
  -days 365 -keyout $LIVE/privkey.pem -out $LIVE/fullchain.pem -subj /CN=$DOMAIN)"

echo "== Bật Nginx"
compose up -d web
# Nginx đã chạy từ trước (chạy lại script) thì nạp lại chứng chỉ; mới bật thì chờ khởi động xong
sleep 3
compose exec -T web nginx -s reload

if [[ "$MODE" == "--self-signed" ]]; then
  echo "Xong: https://$DOMAIN dùng chứng chỉ tự ký (trình duyệt sẽ cảnh báo)."
  exit 0
fi

if [[ -z "$EMAIL" ]]; then
  echo "Chưa khai CERTBOT_EMAIL trong infra/.env.prod" >&2
  exit 1
fi

EXTRA=()
if [[ "$MODE" == "--staging" ]]; then
  EXTRA+=(--staging)
fi

echo "== Xóa chứng chỉ cũ (tạm hoặc bản thử) rồi xin chứng chỉ Let's Encrypt"
certbot_sh "rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN \
  /etc/letsencrypt/renewal/$DOMAIN.conf"
# Phải ghi đè entrypoint: service certbot có entrypoint là vòng lặp gia hạn, tham số truyền thêm sẽ bị bỏ qua
compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email --non-interactive "${EXTRA[@]}"

echo "== Reload Nginx với chứng chỉ mới"
compose exec -T web nginx -s reload

if [[ "$MODE" == "--staging" ]]; then
  echo "Xong bản thử. Trình duyệt vẫn cảnh báo (chứng chỉ thử); chạy lại không có --staging để lấy bản thật."
else
  echo "Xong: https://$DOMAIN đã có chứng chỉ Let's Encrypt, certbot tự gia hạn."
fi
