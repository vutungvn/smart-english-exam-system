import { createBrowserRouter, Navigate } from 'react-router';
import { ComingSoonPage } from '@/components/ComingSoonPage';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { CheckEmailPage } from '@/features/auth/pages/CheckEmailPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage';
import { AuthPreviewPage } from '@/features/dev/AuthPreviewPage';
import { LandingPage } from '@/features/landing/LandingPage';
import { StudentLayout } from './layouts/student/StudentLayout';

// TẠM: các mục menu học viên chưa làm, hiện trang "đang phát triển" trong layout
const STUDENT_PLACEHOLDERS = [
  { path: 'courses', title: 'Khóa học của tôi' },
  { path: 'exams', title: 'Luyện đề thi' },
  { path: 'results', title: 'Kết quả & xem lại' },
  { path: 'progress', title: 'Tiến độ học tập' },
  { path: 'ai-analysis', title: 'Phân tích AI' },
  { path: 'assistant', title: 'Trợ giảng AI' },
  { path: 'flashcards', title: 'Flashcard' },
  { path: 'profile', title: 'Hồ sơ' },
];

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  // TẠM: trang xem trước các màn auth và phiên đăng nhập, bỏ khi có layout theo vai trò
  { path: '/dev/auth', element: <AuthPreviewPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/register/check-email', element: <CheckEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    path: '/app',
    element: <StudentLayout />,
    children: [
      {
        index: true,
        // Tải chậm: Recharts chỉ tải khi vào dashboard, không làm nặng landing và trang auth
        lazy: () =>
          import('@/features/dashboard/StudentDashboardPage').then((m) => ({
            Component: m.StudentDashboardPage,
          })),
      },
      ...STUDENT_PLACEHOLDERS.map(({ path, title }) => ({
        path,
        element: <ComingSoonPage title={title} backTo="/app" />,
      })),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
