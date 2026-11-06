import { createHash } from 'node:crypto';

// Đảo thứ tự câu theo từng lượt làm bài (chống chép bài). Hàm thuần, không đụng DB, để test riêng

/**
 * Thứ tự ngẫu nhiên nhưng cố định theo seed: mỗi phần tử nhận "số bốc thăm" là
 * SHA-256(seed:khóa của phần tử), rồi xếp theo số đó. Cùng seed và cùng danh sách luôn ra cùng thứ
 * tự (vào lại bài, trang xem lại khớp nhau, không phải lưu thứ tự vào DB); seed khác ra thứ tự khác.
 * SHA-256 phân bố đều nên mọi hoán vị có khả năng như nhau. Không phụ thuộc thứ tự đầu vào: thêm,
 * bớt một phần tử không làm các phần tử khác đổi thứ tự tương đối
 */
export function seededOrder<T>(items: readonly T[], seed: string, keyOf: (item: T) => string): T[] {
  return items
    .map((item) => ({
      item,
      rank: createHash('sha256')
        .update(`${seed}:${keyOf(item)}`)
        .digest('hex'),
    }))
    .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0))
    .map(({ item }) => item);
}

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
