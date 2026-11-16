#!/usr/bin/env bash
# Cập nhật bản mới trên máy chủ: lấy code mới → build image → migrate + seed → chạy lại các service.
#   infra/scripts/deploy.sh            deploy nhánh đang checkout
#   infra/scripts/deploy.sh --no-pull  không git pull (đã tự checkout đúng commit)
source "$(dirname "$0")/lib.sh"
cd "$REPO_ROOT"

if [[ "${1:-}" != "--no-pull" ]]; then
  echo "== Lấy code mới ($(git rev-parse --abbrev-ref HEAD))"
  git pull --ff-only
fi

echo "== Build và chạy (service migrate chạy xong backend mới khởi động)"
compose up -d --build --remove-orphans

echo "== Dọn image cũ"
docker image prune -f >/dev/null

compose ps
echo "Xem log: docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod logs -f backend"
