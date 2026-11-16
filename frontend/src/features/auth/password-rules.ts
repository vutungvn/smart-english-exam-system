export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

export const PASSWORD_RULES = [
  {
    label: '8–72 ký tự',
    short: '8–72 ký tự',
    test: (v: string) => v.length >= 8 && v.length <= 72,
  },
  { label: 'Có chữ hoa (A-Z)', short: 'Chữ hoa', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Có chữ thường (a-z)', short: 'Chữ thường', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Có chữ số (0-9)', short: 'Chữ số', test: (v: string) => /\d/.test(v) },
] as const;
