import { Link } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';

const linkClass = 'text-sm text-white/60 transition-colors hover:text-white';

export function LandingFooter() {
  return (
    <footer className="bg-foreground text-white">
      <div className="mx-auto w-full max-w-300 px-4 sm:px-6">
        {/* Mobile: thông tin thương hiệu và Pháp lý chiếm cả hàng, 2 cột link nằm cạnh nhau */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 max-w-sm lg:col-span-1">
            <BrandLogo inverse />
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              Nền tảng luyện thi TOEIC đủ 4 kỹ năng có trợ lý AI hỗ trợ chấm bài và định hướng lộ
              trình học tập.
            </p>
          </div>

          <nav aria-label="Sản phẩm">
            <h3 className="text-sm font-semibold">Sản phẩm</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#tinh-nang" className={linkClass}>
                  Tính năng
                </a>
              </li>
              <li>
                <a href="#lo-trinh" className={linkClass}>
                  Lộ trình
                </a>
              </li>
              <li>
                <a href="#khoa-hoc" className={linkClass}>
                  Khóa học
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Tài khoản và hỗ trợ">
            <h3 className="text-sm font-semibold">Hỗ trợ</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#hoi-dap" className={linkClass}>
                  Câu hỏi thường gặp
                </a>
              </li>
              <li>
                <Link to="/login" className={linkClass}>
                  Đăng nhập
                </Link>
              </li>
              <li>
                <Link to="/register" className={linkClass}>
                  Đăng ký
                </Link>
              </li>
            </ul>
          </nav>

          {/* TẠM: chưa có trang nội dung pháp lý, chỉ hiển thị tên */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="text-sm font-semibold">Pháp lý</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/60">
              <li>Điều khoản sử dụng</li>
              <li>Chính sách xử lý dữ liệu cá nhân</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>© 2026 Smart English Exam </p>
          <p>Luyện thi TOEIC 4 kỹ năng cùng AI</p>
        </div>
      </div>
    </footer>
  );
}
