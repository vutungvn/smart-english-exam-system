#!/usr/bin/env bash
# Cập nhật bản mới trên máy chủ: pull image → migrate + seed → chạy lại các service.
#   infra/scripts/deploy.sh [IMAGE_TAG]             deploy tag main (mặc định)
#   infra/scripts/deploy.sh --no-pull [IMAGE_TAG]   không git pull (CD đã checkout đúng commit)
source "$(dirname "$0")/lib.sh"
cd "$REPO_ROOT"

NO_PULL=false
IMAGE_TAG="${IMAGE_TAG:-main}"
for argument in "$@"; do
  if [[ "$argument" == "--no-pull" ]]; then
    NO_PULL=true
  else
    IMAGE_TAG="$argument"
  fi
done
export IMAGE_TAG

if [[ "$NO_PULL" != true ]]; then
  if [[ -z "$(git branch --show-current)" ]]; then
    git switch main
  fi
  echo "== Lấy code mới ($(git rev-parse --abbrev-ref HEAD))"
  git pull --ff-only
fi

echo "== Pull image $IMAGE_TAG"
compose pull

echo "== Khởi động service và chạy migration/seed"
if ! compose up -d --no-build --remove-orphans; then
  compose logs --tail=100 migrate >&2 || true
  exit 1
fi

backend_container="$(compose ps -q backend)"
if [[ -z "$backend_container" ]]; then
  echo "Không tìm thấy container backend sau khi khởi động" >&2
  compose logs --tail=100 backend >&2 || true
  exit 1
fi

echo "== Chờ backend healthy"
for _ in {1..30}; do
  health="$(docker inspect --format '{{.State.Health.Status}}' "$backend_container" 2>/dev/null || true)"
  if [[ "$health" == "healthy" ]]; then
    break
  fi
  if [[ "$health" == "unhealthy" ]]; then
    compose logs --tail=100 migrate >&2 || true
    compose logs --tail=100 backend >&2
    exit 1
  fi
  sleep 2
done

health="$(docker inspect --format '{{.State.Health.Status}}' "$backend_container" 2>/dev/null || true)"
if [[ "$health" != "healthy" ]]; then
  compose logs --tail=100 migrate >&2 || true
  compose logs --tail=100 backend >&2
  echo "Backend không healthy sau 60 giây" >&2
  exit 1
fi

echo "== Dọn image cũ"
docker image prune -f >/dev/null

compose ps
echo "Xem log: docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod logs -f backend"
