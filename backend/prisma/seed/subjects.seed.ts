import { PrismaClient } from '../../src/generated/prisma/client.js';
import { Skill, SubjectCategory } from '../../src/generated/prisma/enums.js';

// Chủ đề theo dạng kỹ năng (Ke_hoach_soan_cau_hoi.md Mục 3.4). Tên dùng làm khóa khi nhập tệp Excel

// nên phải giữ đúng chính tả, kể cả dấu gạch "–".
const TOEIC_TOPICS: { skill: Skill; parts: number[]; name: string }[] = [
  { skill: Skill.LISTENING, parts: [1], name: 'P1 – Tranh người' },
  { skill: Skill.LISTENING, parts: [1], name: 'P1 – Tranh vật/cảnh' },
  { skill: Skill.LISTENING, parts: [2], name: 'P2 – Câu hỏi WH' },
  { skill: Skill.LISTENING, parts: [2], name: 'P2 – Yes/No & câu hỏi lựa chọn' },
  { skill: Skill.LISTENING, parts: [2], name: 'P2 – Câu đề nghị/yêu cầu' },
  { skill: Skill.LISTENING, parts: [3, 4], name: 'P3/P4 – Ý chính & mục đích' },
  { skill: Skill.LISTENING, parts: [3, 4], name: 'P3/P4 – Chi tiết' },
  { skill: Skill.LISTENING, parts: [3, 4], name: 'P3/P4 – Suy luận & hàm ý' },
  { skill: Skill.LISTENING, parts: [3, 4], name: 'P3/P4 – Biểu đồ/hình' },

  { skill: Skill.READING, parts: [5, 6], name: 'P5/P6 – Từ loại' },
  { skill: Skill.READING, parts: [5, 6], name: 'P5/P6 – Thì & dạng động từ' },
  { skill: Skill.READING, parts: [5, 6], name: 'P5/P6 – Giới từ & liên từ' },
  { skill: Skill.READING, parts: [5, 6], name: 'P5/P6 – Đại từ & mạo từ' },
  { skill: Skill.READING, parts: [5, 6], name: 'P5/P6 – Mệnh đề quan hệ' },
  { skill: Skill.READING, parts: [5, 6], name: 'P5/P6 – Từ vựng' },
  { skill: Skill.READING, parts: [6], name: 'P6 – Chèn câu' },
  { skill: Skill.READING, parts: [7], name: 'P7 – Ý chính' },
  { skill: Skill.READING, parts: [7], name: 'P7 – Chi tiết' },
  { skill: Skill.READING, parts: [7], name: 'P7 – Suy luận' },
  { skill: Skill.READING, parts: [7], name: 'P7 – Từ đồng nghĩa' },
  { skill: Skill.READING, parts: [7], name: 'P7 – Liên kết nhiều đoạn' },

  { skill: Skill.SPEAKING, parts: [1], name: 'S1 – Đọc thành tiếng' },
  { skill: Skill.SPEAKING, parts: [2], name: 'S2 – Mô tả tranh' },
  { skill: Skill.SPEAKING, parts: [3], name: 'S3 – Trả lời câu hỏi' },
  { skill: Skill.SPEAKING, parts: [4], name: 'S4 – Trả lời dựa trên thông tin' },
  { skill: Skill.SPEAKING, parts: [5], name: 'S5 – Nêu quan điểm' },

  { skill: Skill.WRITING, parts: [1], name: 'W1 – Viết câu theo tranh' },
  { skill: Skill.WRITING, parts: [2], name: 'W2 – Trả lời email' },
  { skill: Skill.WRITING, parts: [3], name: 'W3 – Bài luận nêu quan điểm' },
];

// Dữ liệu danh mục (không phải dữ liệu demo) nên chạy cả ở production.
// upsert: chạy lại nhiều lần không trùng, sửa skill/parts ở đây thì lần seed sau cập nhật theo.
export async function seedSubjects(prisma: PrismaClient): Promise<void> {
  const toeic = await prisma.subject.upsert({
    where: { code: 'TOEIC' },
    update: {},
    create: { code: 'TOEIC', name: 'TOEIC 4 kỹ năng', category: SubjectCategory.TOEIC },
  });

  for (const topic of TOEIC_TOPICS) {
    await prisma.topic.upsert({
      where: { subjectId_name: { subjectId: toeic.id, name: topic.name } },
      update: { skill: topic.skill, parts: topic.parts },
      create: { subjectId: toeic.id, ...topic },
    });
  }

  console.log(`• Chương trình TOEIC với ${TOEIC_TOPICS.length} chủ đề`);
}
