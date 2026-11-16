// Khớp cột roles.code do seed tạo
export const RoleCode = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
} as const;

export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];
