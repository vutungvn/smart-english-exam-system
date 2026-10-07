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
import { ChangePasswordPage } from '@/features/profile/ChangePasswordPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { GuestOnly } from './guards/GuestOnly';
import { RequireAuth } from './guards/RequireAuth';
import { RequireRole } from './guards/RequireRole';
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
];

export const router = createBrowserRouter([
  // Landing mở cho mọi người; đã đăng nhập thì header đổi nút Đăng nhập/Đăng ký thành nút vào học
  { path: '/', element: <LandingPage /> },
  // Chỉ dành cho khách: đã đăng nhập thì chuyển về trang chủ theo vai trò
  {
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/register/check-email', element: <CheckEmailPage /> },
        ],
      },
    ],
  },
  // Ai cũng vào được, kể cả khi đang đăng nhập: liên kết trong email, và Quên mật khẩu
  // (người dùng đang đăng nhập quên mật khẩu hiện tại khi muốn đổi mật khẩu)
  {
    element: <AuthLayout />,
    children: [
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  // TẠM: trang xem trước các màn auth và phiên đăng nhập, bỏ khi có layout giáo viên/admin
  { path: '/dev/auth', element: <AuthPreviewPage /> },
  // Khu vực học viên: cần đăng nhập và đúng vai trò
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={['STUDENT']} />,
        children: [
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
              { path: 'profile', element: <ProfilePage /> },
              { path: 'profile/password', element: <ChangePasswordPage /> },
              ...STUDENT_PLACEHOLDERS.map(({ path, title }) => ({
                path,
                element: <ComingSoonPage title={title} backTo="/app" />,
              })),
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
