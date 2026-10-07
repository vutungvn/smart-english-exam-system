import type { AuthSession, AuthSessionUser } from '@/api/generated';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Access token chỉ giữ trong bộ nhớ (mất khi tải lại trang); refresh token nằm ở cookie httpOnly
export interface AuthState {
  accessToken: string | null;
  user: AuthSessionUser | null;
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Đăng nhập và làm mới token đều trả về AuthSession
    sessionReceived: (state, action: PayloadAction<AuthSession>) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    sessionCleared: () => initialState,
  },
  selectors: {
    selectAccessToken: (state) => state.accessToken,
    selectCurrentUser: (state) => state.user,
  },
});

export const { sessionReceived, sessionCleared } = authSlice.actions;
export const { selectAccessToken, selectCurrentUser } = authSlice.selectors;
