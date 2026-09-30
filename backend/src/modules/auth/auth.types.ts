import type { RoleCode } from '../../common/constants/roles.js';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  accessToken: string;
  /** Số giây access token còn hiệu lực, FE dùng để biết khi nào cần làm mới */
  expiresIn: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: RoleCode;
    /** true: FE chuyển thẳng tới trang Đổi mật khẩu (admin mặc định từ seed) */
    mustChangePassword: boolean;
  };
}
