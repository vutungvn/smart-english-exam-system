import { Skill } from '../../generated/prisma/enums.js';
import { TOEIC_PARTS } from '../questions/toeic-parts.js';

// Luật thuần của chương trình thi và chủ đề (SPRINT-69), không đụng DB để test được riêng

/**
 * Chương trình hệ thống: giao diện giáo viên (use-toeic-topics.ts) và tệp nhập mẫu tìm theo mã này,
 * nên không được ẩn hay xóa
 */
export const PROTECTED_SUBJECT_CODE = 'TOEIC';

/** Mã chương trình: chữ hoa, số, gạch dưới, 2–50 ký tự (dùng trong cột subject_code của tệp nhập) */
export const SUBJECT_CODE_PATTERN = /^[A-Z0-9_]{2,50}$/;

/** Các Part của một kỹ năng theo cấu trúc đề TOEIC, tăng dần */
export function partsOfSkill(skill: Skill): number[] {
  return TOEIC_PARTS.filter((rule) => rule.skill === skill).map((rule) => rule.part);
}

/** Part không thuộc kỹ năng (ví dụ Speaking Part 7); rỗng là hợp lệ */
export function invalidParts(skill: Skill, parts: number[]): number[] {
  const allowed = new Set(partsOfSkill(skill));
  return [...new Set(parts)].filter((part) => !allowed.has(part)).sort((a, b) => a - b);
}

/** Bỏ trùng, sắp tăng dần để lưu và so sánh ổn định */
export function normalizeParts(parts: number[]): number[] {
  return [...new Set(parts)].sort((a, b) => a - b);
}

/** Part có trong bản cũ nhưng không còn trong bản mới */
export function removedParts(before: number[], after: number[]): number[] {
  const kept = new Set(after);
  return normalizeParts(before.filter((part) => !kept.has(part)));
}
