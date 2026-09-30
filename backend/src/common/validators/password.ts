// Use case Đăng ký: tối thiểu 8 ký tự, có chữ hoa, chữ thường và số.
// Tối đa 72 vì bcrypt bỏ qua phần vượt quá 72 byte.
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
export const STRONG_PASSWORD_MESSAGE =
  'Mật khẩu dài 8-72 ký tự, gồm ít nhất một chữ hoa, một chữ thường và một chữ số';
