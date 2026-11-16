import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './router';
import { Provider } from 'react-redux';
import { store } from '@/store/store';

export function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
      {/* Toast dùng chung (thông báo realtime) */}
      <Toaster position="top-right" richColors closeButton />
    </Provider>
  );
}
