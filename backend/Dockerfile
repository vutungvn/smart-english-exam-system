# syntax=docker/dockerfile:1
# Image backend cho production (SPRINT-80). Build từ thư mục backend/:
#   docker build -t smart-exam-backend --target runtime backend
# Debian slim (không dùng Alpine): sharp, bcrypt dùng bản dựng sẵn cho glibc; ffmpeg cài từ apt.

FROM node:24-bookworm-slim AS base
WORKDIR /app

# ---- build: cài đủ dependency (cả dev), sinh Prisma Client, biên dịch TypeScript ----
# Service "migrate" trong docker-compose.prod.yml cũng dùng stage này (có prisma CLI, tsx để chạy seed)
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# prisma.config.ts đọc DATABASE_URL bằng env(); generate không kết nối DB nên dùng URL giả
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate \
  && npm run build

# ---- runtime: chỉ dependency production + mã đã biên dịch ----
FROM base AS runtime
ENV NODE_ENV=production
# ffmpeg chuẩn hóa bài nói Speaking (FFMPEG_PATH mặc định "ffmpeg" trong PATH)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# dist đã gồm Prisma Client biên dịch từ src/generated
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
