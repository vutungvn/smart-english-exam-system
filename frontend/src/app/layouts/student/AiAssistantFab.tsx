import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Link } from 'react-router';
import aiAssistantAvatar from '@/assets/chatbot/ai-assistant.webp';
import { cn } from '@/lib/utils';

const SIZE = 64; // khớp size-16
const MARGIN = 24; // khoảng cách tới mép vùng nội dung
const DRAG_THRESHOLD = 6; // di chuyển dưới ngưỡng này vẫn tính là bấm
const STORAGE_KEY = 'smart-english-exam:ai-fab-position';
const SIDEBAR_WIDTH = 288; // w-72, sidebar cố định từ lg
const TOPBAR_HEIGHT = 72; // h-18

interface Position {
  x: number;
  y: number;
}

// Vùng được phép đặt nút: trong màn hình, không chui dưới sidebar (từ lg) hay đè thanh trên
function getBounds() {
  const sidebar = window.matchMedia('(min-width: 1024px)').matches ? SIDEBAR_WIDTH : 0;
  const minX = sidebar + MARGIN;
  const minY = TOPBAR_HEIGHT + 16;
  return {
    minX,
    maxX: Math.max(minX, window.innerWidth - SIZE - MARGIN),
    minY,
    maxY: Math.max(minY, window.innerHeight - SIZE - MARGIN),
  };
}

function clampToBounds({ x, y }: Position): Position {
  const { minX, maxX, minY, maxY } = getBounds();
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
}

// Thả ra thì trượt vào mép trái/phải gần nhất của vùng nội dung, như bong bóng chat
function snapToEdge({ x, y }: Position): Position {
  const { minX, maxX } = getBounds();
  const nearLeft = x < (minX + maxX) / 2;
  return clampToBounds({ x: nearLeft ? minX : maxX, y });
}

// Vị trí chỉ là tiện ích cho từng người xem: localStorage có thể lỗi (chế độ ẩn danh...) thì về góc dưới phải
function loadPosition(): Position {
  const { maxX, maxY } = getBounds();
  const fallback = { x: maxX, y: maxY };
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    ) as Partial<Position> | null;
    if (typeof saved?.x === 'number' && typeof saved.y === 'number') {
      return snapToEdge({ x: saved.x, y: saved.y });
    }
  } catch {
    // bỏ qua, dùng vị trí mặc định
  }
  return fallback;
}

function savePosition(position: Position) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // không lưu được thì lần sau về vị trí mặc định
  }
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
}

/**
 * Nút "Hỏi trợ giảng AI" nổi trên khu vực học viên: kéo thả bằng chuột hoặc cảm ứng tới chỗ
 * bất kỳ, thả ra tự bám mép gần nhất và nhớ vị trí. Bấm (không kéo) thì mở trang Trợ giảng AI.
 */
export function AiAssistantFab() {
  const [position, setPosition] = useState<Position>(loadPosition);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState | null>(null);
  const justDragged = useRef(false);

  // Đổi kích thước cửa sổ (xoay màn hình, thu nhỏ trình duyệt) thì kéo nút vào lại trong màn hình
  useEffect(() => {
    const onResize = () => setPosition((current) => snapToEdge(current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.button !== 0) return; // chỉ chuột trái / chạm
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    state.moved = true;
    setDragging(true);
    setPosition(clampToBounds({ x: state.originX + dx, y: state.originY + dy }));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLAnchorElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!state.moved) return; // chỉ là bấm: để onClick điều hướng bình thường
    justDragged.current = true;
    setDragging(false);
    const snapped = snapToEdge(position);
    setPosition(snapped);
    savePosition(snapped);
  };

  // Kéo xong trình duyệt vẫn bắn sự kiện click: chặn lại để không mở trang
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (justDragged.current) {
      event.preventDefault();
      justDragged.current = false;
    }
  };

  return (
    <Link
      to="/app/assistant"
      aria-label="Hỏi trợ giảng AI"
      title="Hỏi trợ giảng AI (nhấn giữ để kéo)"
      draggable={false}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClick={handleClick}
      style={{ left: position.x, top: position.y }}
      className={cn(
        'fixed z-30 size-16 touch-none rounded-full shadow-xl shadow-primary/40 select-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none',
        dragging
          ? 'scale-110 cursor-grabbing shadow-2xl'
          : 'cursor-grab transition-[left,top,transform] duration-300 ease-out hover:scale-105',
      )}
    >
      {/* Linh vật trợ giảng AI (ảnh tròn, nền trong suốt) */}
      <img
        src={aiAssistantAvatar}
        alt=""
        draggable={false}
        className="pointer-events-none size-full"
      />
      {/* Chấm xanh "đang hoạt động": sóng lan ra liên tục, tắt khi người dùng chọn giảm chuyển động */}
      <span className="absolute top-1 right-1 flex size-3.5">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-highlight opacity-75 motion-safe:animate-ping motion-reduce:hidden"
        />
        <span className="relative size-3.5 rounded-full bg-highlight ring-2 ring-white" />
      </span>
    </Link>
  );
}
