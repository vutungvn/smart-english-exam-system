import { createBrowserRouter, Navigate } from 'react-router';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { CheckEmailPage } from '@/features/auth/pages/CheckEmailPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage';
import { AuthPreviewPage } from '@/features/dev/AuthPreviewPage';

export const router = createBrowserRouter([
  { path: '/', element: <AuthPreviewPage /> },
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
  { path: '*', element: <Navigate to="/" replace /> },
]);
