# syntax=docker/dockerfile:1
# Image web cho production (SPRINT-80): Nginx phục vụ bản build của Vite, chuyển /api, /socket.io sang
# backend, HTTPS bằng chứng chỉ Let's Encrypt. Cấu hình Nginx nằm ở infra/nginx (gắn vào lúc chạy).
# Build từ thư mục frontend/:  docker build -t smart-exam-web frontend

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# generated.ts (RTK Query) đã commit sẵn nên không cần backend/openapi.json khi build
RUN npm run build

FROM nginx:1-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
