import { baseApi as api } from './base-api';
export const addTagTypes = ['Auth', 'Me'] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      register: build.mutation<RegisterApiResponse, RegisterApiArg>({
        query: (queryArg) => ({ url: `/api/v1/auth/register`, method: 'POST', body: queryArg }),
        invalidatesTags: ['Auth'],
      }),
      verifyEmail: build.mutation<VerifyEmailApiResponse, VerifyEmailApiArg>({
        query: (queryArg) => ({ url: `/api/v1/auth/verify-email`, method: 'POST', body: queryArg }),
        invalidatesTags: ['Auth'],
      }),
      resendVerification: build.mutation<ResendVerificationApiResponse, ResendVerificationApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/auth/resend-verification`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Auth'],
      }),
      forgotPassword: build.mutation<ForgotPasswordApiResponse, ForgotPasswordApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/auth/forgot-password`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Auth'],
      }),
      validateResetToken: build.query<ValidateResetTokenApiResponse, ValidateResetTokenApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/auth/reset-password/validate`,
          params: {
            token: queryArg,
          },
        }),
        providesTags: ['Auth'],
      }),
      resetPassword: build.mutation<ResetPasswordApiResponse, ResetPasswordApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/auth/reset-password`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Auth'],
      }),
      login: build.mutation<LoginApiResponse, LoginApiArg>({
        query: (queryArg) => ({ url: `/api/v1/auth/login`, method: 'POST', body: queryArg }),
        invalidatesTags: ['Auth'],
      }),
      refresh: build.mutation<RefreshApiResponse, RefreshApiArg>({
        query: () => ({ url: `/api/v1/auth/refresh`, method: 'POST' }),
        invalidatesTags: ['Auth'],
      }),
      logout: build.mutation<LogoutApiResponse, LogoutApiArg>({
        query: () => ({ url: `/api/v1/auth/logout`, method: 'POST' }),
        invalidatesTags: ['Auth'],
      }),
      getProfile: build.query<GetProfileApiResponse, GetProfileApiArg>({
        query: () => ({ url: `/api/v1/me` }),
        providesTags: ['Me'],
      }),
      updateProfile: build.mutation<UpdateProfileApiResponse, UpdateProfileApiArg>({
        query: (queryArg) => ({ url: `/api/v1/me`, method: 'PATCH', body: queryArg }),
        invalidatesTags: ['Me'],
      }),
      getLoginHistory: build.query<GetLoginHistoryApiResponse, GetLoginHistoryApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/me/login-history`,
          params: {
            page: queryArg.page,
            limit: queryArg.limit,
          },
        }),
        providesTags: ['Me'],
      }),
      changePassword: build.mutation<ChangePasswordApiResponse, ChangePasswordApiArg>({
        query: (queryArg) => ({ url: `/api/v1/me/password`, method: 'PATCH', body: queryArg }),
        invalidatesTags: ['Me'],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as api };
export type RegisterApiResponse = /** status 201 Thành công */ {
  success: true;
  status: number;
  data: RegisterResult;
};
export type RegisterApiArg = RegisterDto;
export type VerifyEmailApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type VerifyEmailApiArg = VerifyEmailDto;
export type ResendVerificationApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type ResendVerificationApiArg = EmailDto;
export type ForgotPasswordApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type ForgotPasswordApiArg = EmailDto;
export type ValidateResetTokenApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type ValidateResetTokenApiArg =
  /** Token trong liên kết đặt lại mật khẩu (phần sau "token=") */ string;
export type ResetPasswordApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type ResetPasswordApiArg = ResetPasswordDto;
export type LoginApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AuthSession;
};
export type LoginApiArg = LoginDto;
export type RefreshApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AuthSession;
};
export type RefreshApiArg = void;
export type LogoutApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type LogoutApiArg = void;
export type GetProfileApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: MeProfile;
};
export type GetProfileApiArg = void;
export type UpdateProfileApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: MeProfile;
};
export type UpdateProfileApiArg = UpdateProfileDto;
export type GetLoginHistoryApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: LoginHistoryItem[];
  meta: PaginationMetaDto;
};
export type GetLoginHistoryApiArg = {
  page?: number;
  limit?: number;
};
export type ChangePasswordApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type ChangePasswordApiArg = ChangePasswordDto;
export type UserStatus = 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'ACTIVE' | 'LOCKED';
export type RegisterResult = {
  id: string;
  email: string;
  status: UserStatus;
};
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VERSION_CONFLICT'
  | 'GONE'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_EMAIL_NOT_VERIFIED'
  | 'AUTH_ACCOUNT_PENDING_APPROVAL'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'AUTH_REFRESH_TOKEN_INVALID'
  | 'AUTH_EMAIL_ALREADY_EXISTS'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_TOO_MANY_LOGIN_ATTEMPTS'
  | 'AUTH_CURRENT_PASSWORD_INCORRECT';
export type FieldErrorDto = {
  /** Trường lỗi, trường lồng nhau dạng address.city */
  field: string;
  message: string;
};
export type ErrorBodyDto = {
  code: ErrorCode;
  message: string;
  /** VALIDATION_ERROR: danh sách lỗi theo trường. Mã khác có thể chứa dữ liệu riêng, ví dụ { retryAfterSeconds } */
  details?: FieldErrorDto[];
};
export type ErrorEnvelopeDto = {
  success: false;
  /** Luôn trùng HTTP status code */
  status: number;
  error: ErrorBodyDto;
};
export type RegisterDto = {
  fullName: string;
  email: string;
  /** Mật khẩu dài 8-72 ký tự, gồm ít nhất một chữ hoa, một chữ thường và một chữ số */
  password: string;
  confirmPassword: string;
  /** Đồng ý Điều khoản sử dụng và Chính sách xử lý dữ liệu cá nhân */
  acceptTerms: boolean;
};
export type VerifyEmailDto = {
  /** Token trong liên kết xác minh (phần sau "token=") */
  token: string;
};
export type EmailDto = {
  email: string;
};
export type ResetPasswordDto = {
  /** Token trong liên kết đặt lại mật khẩu (phần sau "token=") */
  token: string;
  /** Mật khẩu dài 8-72 ký tự, gồm ít nhất một chữ hoa, một chữ thường và một chữ số */
  newPassword: string;
  confirmPassword: string;
};
export type RoleCode = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type AuthSessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: RoleCode;
  /** true: FE chuyển thẳng tới trang Đổi mật khẩu (admin mặc định từ seed) */
  mustChangePassword: boolean;
};
export type AuthSession = {
  accessToken: string;
  /** Số giây access token còn hiệu lực, FE dùng để biết khi nào cần làm mới */
  expiresIn: number;
  user: AuthSessionUser;
};
export type LoginDto = {
  email: string;
  password: string;
};
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type StudentProfile = {
  currentLevel: Level | null;
  currentScore: number | null;
  targetScore: number | null;
};
export type MeProfile = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: RoleCode;
  status: UserStatus;
  mustChangePassword: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** null với giáo viên và admin */
  student: StudentProfile | null;
};
export type UpdateProfileDto = {
  fullName?: string;
  /** Điểm TOEIC Listening + Reading mục tiêu, bước 5 điểm (chỉ học viên) */
  targetScore?: number;
};
export type LoginHistoryItem = {
  id: string;
  success: boolean;
  /** Mã lý do khi thất bại, ví dụ INVALID_PASSWORD, TOO_MANY_ATTEMPTS; null khi thành công */
  failureReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};
export type PaginationMetaDto = {
  page: number;
  limit: number;
  total: number;
  /** 0 khi không có bản ghi nào */
  totalPages: number;
};
export type ChangePasswordDto = {
  currentPassword: string;
  /** Mật khẩu dài 8-72 ký tự, gồm ít nhất một chữ hoa, một chữ thường và một chữ số */
  newPassword: string;
  confirmPassword: string;
};
export const {
  useRegisterMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useForgotPasswordMutation,
  useValidateResetTokenQuery,
  useResetPasswordMutation,
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetLoginHistoryQuery,
  useChangePasswordMutation,
} = injectedRtkApi;
