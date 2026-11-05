import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    // Unit test của module attempts chạy cùng để đo coverage grading + attempts trong một lần
    include: ['test/**/*.e2e-spec.ts', 'src/modules/attempts/**/*.spec.ts'],
    globalSetup: ['./test/e2e/global-setup.ts'],
    setupFiles: ['./test/e2e/setup-env.ts'],
    // Các file e2e dùng chung một DB: chạy lần lượt để không giẫm dữ liệu của nhau
    fileParallelism: false,
    // Lần đầu nạp AppModule có thể mất tới vài chục giây (biên dịch toàn bộ backend)
    hookTimeout: 180_000,
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage/e2e',
      include: ['src/modules/attempts/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/dto/**', '**/*.types.ts', '**/*.module.ts'],
      // SPRINT-57: coverage ≥ 70% cho grading và attempts
      thresholds: { lines: 70, statements: 70, functions: 70 },
    },
  },
});
