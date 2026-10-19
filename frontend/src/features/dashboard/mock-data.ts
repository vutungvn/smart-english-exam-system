// TẠM: dữ liệu mẫu theo thiết kế Stitch (màn "Trang chủ học viên") cho các phần chưa có API:
// khóa học đã ghi danh (Phần mở rộng), flashcard. Điểm, bài làm dở, gợi ý luyện tập đã lấy từ API.
import type { Skill } from '@/api/generated';

export const ACTIVE_COURSES: {
  title: string;
  teacher: string;
  tag: string;
  skill: Skill | 'GRAMMAR';
  lesson: number;
  totalLessons: number;
}[] = [
  {
    title: 'Ngữ pháp TOEIC nền tảng',
    teacher: 'Cô Mai Phương',
    tag: 'Grammar',
    skill: 'GRAMMAR',
    lesson: 8,
    totalLessons: 20,
  },
  {
    title: 'Chiến thuật Listening Part 3–4',
    teacher: 'Thầy Hoàng Nam',
    tag: 'Listening',
    skill: 'LISTENING',
    lesson: 12,
    totalLessons: 20,
  },
  {
    title: 'Writing: viết email & bài luận',
    teacher: 'Cô Thu Trang',
    tag: 'Writing',
    skill: 'WRITING',
    lesson: 5,
    totalLessons: 20,
  },
];

export const FLASHCARD_STATS = { due: 24, remembered: 312 };
