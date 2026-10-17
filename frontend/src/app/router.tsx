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
import { ExamBuilderPage } from '@/features/exams/pages/ExamBuilderPage';
import { ExamPreviewPage } from '@/features/exams/pages/ExamPreviewPage';
import { ExamsPage } from '@/features/exams/pages/ExamsPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { AttemptPage } from '@/features/practice/pages/AttemptPage';
import { AttemptResultPage } from '@/features/practice/pages/AttemptResultPage';
import { AttemptReviewPage } from '@/features/practice/pages/AttemptReviewPage';
import { AttemptHistoryPage } from '@/features/practice/pages/AttemptHistoryPage';
import { PracticeExamDetailPage } from '@/features/practice/pages/PracticeExamDetailPage';
import { PracticeExamsPage } from '@/features/practice/pages/PracticeExamsPage';
import { QuestionBankPage } from '@/features/question-bank/pages/QuestionBankPage';
import { QuestionFormPage } from '@/features/question-bank/pages/QuestionFormPage';
import { QuestionGroupDetailPage } from '@/features/question-bank/pages/QuestionGroupDetailPage';
import { QuestionGroupFormPage } from '@/features/question-bank/pages/QuestionGroupFormPage';
import { QuestionGroupsPage } from '@/features/question-bank/pages/QuestionGroupsPage';
import { QuestionImportPage } from '@/features/question-import/pages/QuestionImportPage';
import { GuestOnly } from './guards/GuestOnly';
import { RequireAuth } from './guards/RequireAuth';
import { RequireRole } from './guards/RequireRole';
import { StudentLayout } from './layouts/student/StudentLayout';
import { TeacherLayout } from './layouts/teacher/TeacherLayout';

// TẠM: các mục menu học viên chưa làm, hiện trang "đang phát triển" trong layout
const STUDENT_PLACEHOLDERS = [
  { path: 'courses', title: 'Khóa học của tôi' },
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
          // Làm bài ở chế độ tập trung: không sidebar, không thanh trên của khu học viên
          { path: '/app/attempts/:id', element: <AttemptPage /> },
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
              { path: 'exams', element: <PracticeExamsPage /> },
              { path: 'exams/:id', element: <PracticeExamDetailPage /> },
              { path: 'attempts/:id/result', element: <AttemptResultPage /> },
              { path: 'attempts/:id/review', element: <AttemptReviewPage /> },
              { path: 'results', element: <AttemptHistoryPage /> },
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
      // Khu vực giáo viên
      {
        element: <RequireRole roles={['TEACHER']} />,
        children: [
          {
            path: '/teacher',
            element: <TeacherLayout />,
            children: [
              { index: true, element: <Navigate to="questions" replace /> },
              { path: 'questions', element: <QuestionBankPage /> },
              { path: 'questions/new', element: <QuestionFormPage /> },
              { path: 'questions/:id', element: <QuestionFormPage /> },
              { path: 'question-groups', element: <QuestionGroupsPage /> },
              { path: 'question-groups/new', element: <QuestionGroupFormPage /> },
              { path: 'question-groups/:id', element: <QuestionGroupDetailPage /> },
              { path: 'question-groups/:id/edit', element: <QuestionGroupFormPage /> },
              { path: 'import', element: <QuestionImportPage /> },
              { path: 'exams', element: <ExamsPage /> },
              { path: 'exams/:id', element: <ExamBuilderPage /> },
              { path: 'exams/:id/preview', element: <ExamPreviewPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'profile/password', element: <ChangePasswordPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
