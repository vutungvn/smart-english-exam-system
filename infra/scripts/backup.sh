#!/usr/bin/env bash
# Sao lưu CSDL mỗi ngày (giữ 7 bản) và kho tệp RustFS mỗi Chủ nhật (giữ 4 bản).
# Cài cron lúc 2 giờ sáng (trước job xóa bài nói quá hạn lúc 3 giờ):
#   crontab -e  →  0 2 * * * /opt/smart-english-exam/infra/scripts/backup.sh >> /opt/backups/backup.log 2>&1
#
# Phục hồi CSDL từ một bản (ghi đè dữ liệu hiện tại):
#   docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec -T postgres \
#     pg_restore --clean --if-exists -U <POSTGRES_USER> -d <POSTGRES_DB> < /opt/backups/db-<thời điểm>.dump
# Phục hồi kho tệp (dừng rustfs trước):
#   docker run --rm -v smart-exam-prod_rustfs-data:/data -v /opt/backups:/backup alpine \
#     sh -c "rm -rf /data/* && tar xzf /backup/files-<thời điểm>.tar.gz -C /data"
source "$(dirname "$0")/lib.sh"

BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
STAMP="$(date +%F-%H%M)"
DB_USER="$(env_get POSTGRES_USER)"
DB_NAME="$(env_get POSTGRES_DB)"
mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] Sao lưu CSDL"
compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_DIR/db-$STAMP.dump"
find "$BACKUP_DIR" -name 'db-*.dump' -mtime +7 -delete

# Chủ nhật (hoặc chạy với --files): sao lưu kho tệp (media câu hỏi, ảnh đại diện, bài nói)
if [[ "$(date +%u)" == "7" || "${1:-}" == "--files" ]]; then
  echo "[$(date -Is)] Sao lưu kho tệp"
  docker run --rm -v smart-exam-prod_rustfs-data:/data:ro -v "$BACKUP_DIR":/backup alpine \
    tar czf "/backup/files-$STAMP.tar.gz" -C /data .
  find "$BACKUP_DIR" -name 'files-*.tar.gz' -mtime +28 -delete
fi

echo "[$(date -Is)] Xong: $(du -sh "$BACKUP_DIR" | cut -f1) trong $BACKUP_DIR"
