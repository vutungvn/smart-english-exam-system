import { seededOrder } from '../../common/utils/seeded-order.js';

// Đảo thứ tự câu theo từng lượt làm bài (chống chép bài). Hàm thuần, không đụng DB, để test riêng

// Dùng chung với rút đề tự động (exams/auto-fill); xuất lại để test, code cũ import từ đây vẫn chạy
export { seededOrder };

/** Phần tối thiểu của một câu trong đề để đảo: id câu trong đề và nhóm (nếu có) */
interface ShuffleItem {
  id: string;
  question: { group: { id: string } | null };
}

/**
 * Đảo câu trong TỪNG Part, thứ tự các Part giữ nguyên (đúng cấu trúc TOEIC). Câu đơn đảo riêng
 * từng câu; nhóm câu (Listening 3, 4, Reading 6, 7, Speaking 4) đảo cả khối, câu bên trong nhóm
 * giữ thứ tự gốc (câu hỏi đi theo trình tự đoạn văn, audio). Phương án A/B/C/D không đảo: audio
 * Part 1, 2 đọc sẵn "A, B, C" và lời giải thích nhắc tới "(B)". Trả bản sao, không sửa đầu vào
 * (đề trong cache dùng chung cho mọi học viên)
 */
export function shuffleSections<S extends { questions: ShuffleItem[] }>(
  sections: readonly S[],
  seed: string,
): S[] {
  return sections.map((section) => {
    // Gom câu liền nhau cùng nhóm thành một khối (như lúc dựng đề cho học viên)
    const blocks: S['questions'][] = [];
    for (const item of section.questions) {
      const last = blocks.at(-1);
      const groupId = item.question.group?.id;
      if (groupId && last?.[0].question.group?.id === groupId) last.push(item);
      else blocks.push([item]);
    }
    const ordered = seededOrder(
      blocks,
      seed,
      (block) => block[0].question.group?.id ?? block[0].id,
    );
    return { ...section, questions: ordered.flat() };
  });
}
