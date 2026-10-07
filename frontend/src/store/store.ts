import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './slice/auth-slice';
import { baseApi } from '@/api/base-api';

export const store = configureStore({
  reducer: {
    [authSlice.reducerPath]: authSlice.reducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  // Middleware của RTK Query: cache, hủy cache khi hết người dùng, refetch theo tag
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
