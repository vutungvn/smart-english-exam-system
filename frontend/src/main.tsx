import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { restoreSession } from './features/auth/restore-session';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Không tìm thấy phần tử #root');
}

// Lấy lại phiên từ cookie refresh token trước khi render; guard hiện màn chờ tới khi xong
void restoreSession();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
