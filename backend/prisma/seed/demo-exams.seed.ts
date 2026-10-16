import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  Difficulty,
  ExamStatus,
  QuestionStatus,
  QuestionType,
  ScoringScale,
  Skill,
} from '../../src/generated/prisma/enums.js';
import { partOrder } from '../../src/modules/exams/exam-structure.js';

// Hai đề mẫu đã xuất bản để thử luồng làm bài ở dev (SPRINT-51). Câu hỏi mang mã DEMO-…,
// đề nhận theo tên: chạy seed lại thì bỏ qua phần đã có. Không chạy ở production.

interface DemoQuestion {
  code: string;
  skill: Skill;
  part: number;
  topic: string;
  type: QuestionType;
  difficulty: Difficulty;
  content: string;
  explanation: string;
  /** Trắc nghiệm: 4 phương án, phương án đầu là đáp án đúng nếu không ghi correct */
  options?: string[];
  correct?: number;
  sampleAnswer?: string;
  prepSeconds?: number;
  responseSeconds?: number;
}

const P5 = (
  code: string,
  topic: string,
  content: string,
  options: string[],
  correct: number,
  explanation: string,
): DemoQuestion => ({
  code,
  skill: Skill.READING,
  part: 5,
  topic,
  type: QuestionType.SINGLE_CHOICE,
  difficulty: Difficulty.EASY,
  content,
  options,
  correct,
  explanation,
});

const QUESTIONS: DemoQuestion[] = [
  P5(
    'DEMO-P5-01',
    'P5/P6 – Từ loại',
    'The new software makes it ------- for staff to share files.',
    ['easy', 'easily', 'easier', 'ease'],
    0,
    'Sau "makes it" cần tính từ: make it + adj + for sb. Chọn (A) easy.',
  ),
  P5(
    'DEMO-P5-02',
    'P5/P6 – Thì & dạng động từ',
    'Ms. Tanaka ------- the quarterly report by the time the meeting starts.',
    ['finishes', 'will have finished', 'finished', 'has finished'],
    1,
    '"By the time + hiện tại đơn" chỉ mốc tương lai, hành động xong trước mốc đó dùng tương lai hoàn thành: (B).',
  ),
  P5(
    'DEMO-P5-03',
    'P5/P6 – Giới từ & liên từ',
    'Please submit your expense forms ------- Friday afternoon.',
    ['until', 'by', 'since', 'during'],
    1,
    '"By + thời điểm" = trước hạn chót. "Until" chỉ kéo dài liên tục, không hợp với "submit". Chọn (B).',
  ),
  P5(
    'DEMO-P5-04',
    'P5/P6 – Từ vựng',
    'The hotel offers a free shuttle ------- to the airport every hour.',
    ['service', 'servant', 'serving', 'served'],
    0,
    'Cần danh từ ghép "shuttle service" (dịch vụ xe đưa đón). Chọn (A).',
  ),
  P5(
    'DEMO-P5-05',
    'P5/P6 – Đại từ & mạo từ',
    'All employees must update ------- passwords before the end of the month.',
    ['they', 'them', 'their', 'theirs'],
    2,
    'Trước danh từ "passwords" cần tính từ sở hữu: (C) their.',
  ),
  {
    code: 'DEMO-S1-01',
    skill: Skill.SPEAKING,
    part: 1,
    topic: 'S1 – Đọc thành tiếng',
    type: QuestionType.SPOKEN_RESPONSE,
    difficulty: Difficulty.EASY,
    content:
      'Read the text aloud.\n' +
      'Welcome to City Library. We are open from nine a.m. to eight p.m., Monday through Saturday. ' +
      'To borrow books, please bring your library card to the front desk. ' +
      'Study rooms can be reserved online or by phone.',
    sampleAnswer:
      'Welcome to City Library. We are open from nine a.m. to eight p.m., Monday through Saturday. ' +
      'To borrow books, please bring your library card to the front desk. ' +
      'Study rooms can be reserved online or by phone.',
    prepSeconds: 45,
    responseSeconds: 45,
    explanation:
      'Ngắt nghỉ ở dấu phẩy, dấu chấm; nhấn vào giờ mở cửa và các ngày; lên giọng nhẹ khi liệt kê.',
  },
  {
    code: 'DEMO-W2-01',
    skill: Skill.WRITING,
    part: 2,
    topic: 'W2 – Trả lời email',
    type: QuestionType.WRITTEN_RESPONSE,
    difficulty: Difficulty.MEDIUM,
    content:
      'Read the e-mail below.\n' +
      'From: Daniel Moore, HR Manager\n' +
      'Subject: Training workshop\n' +
      'We are organizing a training workshop for new staff next month. Please send us your ideas.\n\n' +
      'Directions: Respond to the e-mail. In your e-mail, give TWO suggestions and ask ONE question.',
    sampleAnswer:
      'Dear Mr. Moore,\n' +
      'Thank you for organizing the workshop. First, I suggest including a session on our internal ' +
      'software, because new staff often struggle with it. Second, a short office tour would help them ' +
      'feel welcome. Could you let me know how long the workshop will last?\n' +
      'Best regards,\nLan',
    explanation: 'Đủ 2 đề xuất + 1 câu hỏi; có lời chào, kết thư; mỗi đề xuất kèm lý do ngắn.',
  },
];

const EXAMS = [
  {
    title: 'Đề A – Thử làm bài (30 phút, tối đa 2 lượt)',
    description:
      'Đề mẫu để thử luồng làm bài: 1 Part trắc nghiệm, 1 Part Writing, 1 Part Speaking.',
    durationMinutes: 30,
    maxAttempts: 2,
    allowPartPractice: true,
    sections: [
      { skill: Skill.READING, part: 5, codes: ['DEMO-P5-01', 'DEMO-P5-02', 'DEMO-P5-03'] },
      { skill: Skill.SPEAKING, part: 1, codes: ['DEMO-S1-01'] },
      { skill: Skill.WRITING, part: 2, codes: ['DEMO-W2-01'] },
    ],
  },
  {
    title: 'Đề B – Hết giờ sau 1 phút',
    description: 'Đề mẫu để thử hết giờ: chỉ làm cả đề, không cho luyện từng Part.',
    durationMinutes: 1,
    maxAttempts: null,
    allowPartPractice: false,
    sections: [{ skill: Skill.READING, part: 5, codes: ['DEMO-P5-04', 'DEMO-P5-05'] }],
  },
];

const LABELS = ['A', 'B', 'C', 'D'];

export async function seedDemoExams(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.log('• Bỏ qua đề mẫu ở môi trường production');
    return;
  }

  const teacher = await prisma.user.findUnique({
    where: { email: 'teacher@gmail.com' },
    select: { id: true },
  });
  const subject = await prisma.subject.findUnique({
    where: { code: 'TOEIC' },
    select: { id: true, topics: { select: { id: true, name: true } } },
  });
  if (!teacher || !subject) {
    console.log('• Chưa có giáo viên mẫu hoặc chương trình TOEIC, bỏ qua đề mẫu');
    return;
  }
  const topicId = (name: string) => {
    const topic = subject.topics.find((item) => item.name === name);
    if (!topic) throw new Error(`Thiếu chủ đề "${name}"`);
    return topic.id;
  };

  // Câu hỏi: tạo nếu chưa có câu (chưa xóa) mang mã này
  const ids = new Map<string, string>();
  for (const question of QUESTIONS) {
    const existing = await prisma.question.findFirst({
      where: { code: question.code, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      ids.set(question.code, existing.id);
      continue;
    }
    const created = await prisma.question.create({
      data: {
        code: question.code,
        topicId: topicId(question.topic),
        authorId: teacher.id,
        type: question.type,
        skill: question.skill,
        part: question.part,
        difficulty: question.difficulty,
        status: QuestionStatus.ACTIVE,
        content: question.content,
        explanation: question.explanation,
        sampleAnswer: question.sampleAnswer ?? null,
        prepSeconds: question.prepSeconds ?? null,
        responseSeconds: question.responseSeconds ?? null,
        options: {
          create: (question.options ?? []).map((content, index) => ({
            label: LABELS[index],
            content,
            isCorrect: index === (question.correct ?? 0),
            orderIndex: index,
          })),
        },
      },
      select: { id: true },
    });
    ids.set(question.code, created.id);
  }

  // Đề: tạo mới nếu chưa có đề (chưa xóa) cùng tên, xuất bản luôn
  let createdExams = 0;
  for (const exam of EXAMS) {
    const existing = await prisma.exam.findFirst({
      where: { title: exam.title, authorId: teacher.id, deletedAt: null },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.exam.create({
      data: {
        authorId: teacher.id,
        subjectId: subject.id,
        title: exam.title,
        description: exam.description,
        scoringScale: ScoringScale.PERCENT,
        durationMinutes: exam.durationMinutes,
        maxAttempts: exam.maxAttempts,
        allowPartPractice: exam.allowPartPractice,
        status: ExamStatus.PUBLISHED,
        publishedAt: new Date(),
        sections: {
          create: exam.sections.map((section) => ({
            skill: section.skill,
            part: section.part,
            orderIndex: partOrder(section.skill, section.part),
            questions: {
              create: section.codes.map((code, index) => ({
                questionId: ids.get(code) as string,
                orderIndex: index,
              })),
            },
          })),
        },
      },
    });
    createdExams++;
  }

  console.log(
    createdExams > 0
      ? `• Đã tạo ${createdExams} đề mẫu đã xuất bản (Đề A, Đề B) với ${QUESTIONS.length} câu DEMO-…`
      : '• Đề mẫu đã có, bỏ qua',
  );
}
