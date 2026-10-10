import type { AuthSession, AuthSessionUser } from '@/api/generated';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * - restoring: vừa mở app, đang gọi /auth/refresh để lấy lại phiên từ cookie (guard chờ, chưa điều hướng)
 * - authenticated: đã có access token
 * - guest: chưa đăng nhập, phiên hết hạn hoặc đã đăng xuất
 */
export type AuthStatus = 'restoring' | 'authenticated' | 'guest';

// Access token chỉ giữ trong bộ nhớ (mất khi tải lại trang); refresh token nằm ở cookie httpOnly
export interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthSessionUser | null;
}

const initialState: AuthState = {
  status: 'restoring',
  accessToken: null,
  user: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Đăng nhập và làm mới token đều trả về AuthSession
    sessionReceived: (state, action: PayloadAction<AuthSession>) => {
      state.status = 'authenticated';
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    sessionCleared: () => ({ status: 'guest' as const, accessToken: null, user: null }),
    // Sửa hồ sơ, đổi ảnh thành công: cập nhật tên, avatar trên thanh trên, lời chào... mà không cần refresh
    userUpdated: (
      state,
      action: PayloadAction<Partial<Pick<AuthSessionUser, 'fullName' | 'avatarUrl'>>>,
    ) => {
      if (state.user) Object.assign(state.user, action.payload);
    },
  },
  selectors: {
    selectAuthStatus: (state) => state.status,
    selectAccessToken: (state) => state.accessToken,
    selectCurrentUser: (state) => state.user,
  },
});

export const { sessionReceived, sessionCleared, userUpdated } = authSlice.actions;
export const { selectAuthStatus, selectAccessToken, selectCurrentUser } = authSlice.selectors;
