#!/usr/bin/env bash
# Hàm dùng chung cho các script vận hành. Nạp bằng: source "$(dirname "$0")/lib.sh"
set -euo pipefail

# Thư mục gốc repo (script nằm ở infra/scripts)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/infra/.env.prod"
COMPOSE_FILE="$REPO_ROOT/infra/docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Thiếu $ENV_FILE: chép từ infra/.env.prod.example rồi điền giá trị thật" >&2
  exit 1
fi

# docker compose với đúng file cấu hình và file biến môi trường production
compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

# Đọc một biến trong .env.prod (bỏ dấu nháy bao quanh nếu có), không source cả file
env_get() {
  local value
  value="$(grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}
