import {
  selectAccessToken,
  sessionCleared,
  sessionReceived,
  type AuthState,
} from '@/store/slice/auth-slice';
import {
  fetchBaseQuery,
  type BaseQueryApi,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import type { RefreshApiResponse } from './generated';
import { createApi } from '@reduxjs/toolkit/query/react';

// URL trong generated.ts đã có sẵn /api/v1 (lấy từ openapi.json); Vite proxy /api → backend
const AUTH_PATH = '/api/v1/auth/';
const REFRESH_URL = '/api/v1/auth/refresh';

const rawBaseQuery = fetchBaseQuery({
  // Gửi kèm cookie refresh_token (backend chỉ đặt cookie cho path /api/v1/auth)
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = selectAccessToken(getState() as { auth: AuthState });

    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// Nhiều request cùng gặp 401 thì chỉ gọi refresh một lần, các request còn lại chờ chung kết quả.
// Bắt buộc vì backend xoay vòng refresh token: gọi refresh hai lần song song thì lần sau
// dùng lại token cũ, backend coi là token bị đánh cắp và thu hồi toàn bộ phiên.
let refreshing: Promise<boolean> | null = null;

async function refreshSession(api: BaseQueryApi, extraOptions: object): Promise<boolean> {
  const result = await rawBaseQuery({ url: REFRESH_URL, method: 'POST' }, api, extraOptions);

  if (result.data) {
    api.dispatch(sessionReceived((result.data as RefreshApiResponse).data));
    return true;
  }

  // 401: phiên hết hạn hoặc bị thu hồi → đăng xuất phía FE.
  // Lỗi khác (mất mạng, server 5xx) thì giữ phiên để người dùng thử lại.
  if (result.error?.status === 401) api.dispatch(sessionCleared());
  return false;
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  const url = typeof args === 'string' ? args : args.url;
  // 401 của chính các route /auth/* (sai mật khẩu, refresh hỏng) không phải do access token hết hạn
  if (result.error?.status !== 401 || url.startsWith(AUTH_PATH)) return result;

  refreshing ??= refreshSession(api, extraOptions).finally(() => {
    refreshing = null;
  });

  return (await refreshing) ? rawBaseQuery(args, api, extraOptions) : result;
};

// Chỉ khai báo khung; endpoint do codegen tiêm vào ở generated.ts
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});
