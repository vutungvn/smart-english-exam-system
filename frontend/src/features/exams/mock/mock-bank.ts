import type {
  Difficulty,
  QuestionGroupSummary,
  QuestionStatus,
  QuestionSummary,
  Skill,
} from '@/api/generated';
import { findPartRule } from '@/features/question-bank/toeic';

/**
 * TẠM (lượt 1): ngân hàng câu hỏi giả để bấm thử màn soạn đề khi chưa nối API.
 * Lượt 2 thay bằng useListQuestionsQuery / useListQuestionGroupsQuery, xóa cả thư mục mock/.
 */

/** Giáo viên đang đăng nhập trong dữ liệu giả ("Bạn") */
export const MOCK_ME = { id: 'mock-me', fullName: 'Giáo viên mẫu' };
const OTHER_TEACHERS = [
  { id: 'mock-t2', fullName: 'Cô Thanh Hằng' },
  { id: 'mock-t3', fullName: 'Thầy Minh Nhật' },
];

const DIFFICULTIES: Difficulty[] = ['MEDIUM', 'EASY', 'MEDIUM', 'HARD'];
const NOW = '2026-10-13T03:20:00.000Z';

const L3 = [
  'What does the man want to do?',
  'What does the woman ask about?',
  'When is breakfast served?',
  'Where most likely are the speakers?',
  'What problem does the woman mention?',
  'What will the man probably do next?',
  'Why is the man calling?',
  'What does the woman offer to do?',
  'According to the woman, what will happen tomorrow?',
];
const L4 = [
  'What is the purpose of the announcement?',
  'Who most likely is the speaker?',
  'What are listeners asked to do?',
  'When will the event begin?',
  'What does the speaker say about the venue?',
  'What will listeners probably hear next?',
];
const R5 = [
  'The manager asked all employees to submit their reports ___ Friday.',
  'Ms. Lee was ___ to lead the new marketing project.',
  'The conference room is ___ available for meetings after 3 p.m.',
  'Please contact the help desk ___ you have any problems with your account.',
  'Customer satisfaction surveys indicate that our response time has ___ significantly.',
  'Employees must submit their expense reports by the end of ___ fiscal quarter.',
  'The new software update will be installed ___ overnight to prevent disruptions.',
  'All participants are requested to arrive at the auditorium ___ fifteen minutes early.',
  'Financial analysts predict that the merger will ___ market presence across Asia.',
  'Neither the director nor the team members ___ willing to postpone the launch date.',
  'The training session has been rescheduled ___ next Tuesday morning.',
  'Mr. Tanaka is responsible ___ coordinating the annual sales conference.',
  'Applicants should send a cover letter ___ with their résumé.',
  'The warehouse will be closed ___ the national holiday.',
  'Despite the heavy rain, the outdoor concert was ___ well attended.',
  'Our new branch office is ___ located near the central station.',
];
const R7 = [
  'What is the purpose of the e-mail?',
  'What is indicated about the company?',
  'Who most likely is Ms. Park?',
  'When will the event take place?',
  'What is NOT mentioned as a benefit?',
  'What are readers asked to do?',
];

const TOPICS: Record<string, string[]> = {
  'LISTENING-1': ['P1 – Người và hành động', 'P1 – Đồ vật và vị trí'],
  'LISTENING-2': ['P2 – Câu hỏi WH', 'P2 – Câu hỏi Yes/No', 'P2 – Đề nghị, yêu cầu'],
  'READING-5': ['Từ loại', 'Thì động từ', 'Giới từ', 'Liên từ', 'Từ vựng công sở'],
  'SPEAKING-1': ['Thông báo'],
  'SPEAKING-2': ['Văn phòng', 'Nơi công cộng'],
  'SPEAKING-3': ['Khảo sát thói quen'],
  'SPEAKING-5': ['Công việc'],
  'WRITING-1': ['Tả tranh'],
  'WRITING-2': ['Email công việc'],
  'WRITING-3': ['Bài luận quan điểm'],
};
const GROUP_TOPICS: Record<string, string[]> = {
  'LISTENING-3': [
    'Đặt phòng khách sạn',
    'Sửa máy in văn phòng',
    'Lịch họp tuần sau',
    'Đặt văn phòng phẩm',
    'Phỏng vấn ứng viên',
    'Chuyến công tác',
  ],
  'LISTENING-4': ['Thông báo sân bay', 'Dự báo thời tiết', 'Quảng cáo cửa hàng', 'Tin kinh doanh'],
  'READING-6': ['Thư chào mừng nhân viên', 'Thông báo bảo trì', 'Email đặt hàng', 'Bản tin nội bộ'],
  'READING-7': [
    'Thông báo cắt nước',
    'Email kết quả quý',
    'Quảng cáo tuyển dụng',
    'Hóa đơn & email khiếu nại',
    'Lịch trình hội thảo',
  ],
  'SPEAKING-4': ['Lịch trình hội thảo công nghệ', 'Lịch đặt phòng hội nghị'],
};

const OPEN_CONTENT: Record<string, string[]> = {
  'SPEAKING-1': [
    'Welcome to Greenfield Supermarket. This week, we are offering discounts on fresh fruit, dairy products, and household items.',
    'Attention, passengers. The train to Central Station will depart from platform three in ten minutes.',
    'Thank you for calling Bright Dental Clinic. Our office is open Monday to Friday from 8 a.m. to 6 p.m.',
  ],
  'SPEAKING-2': [
    'Describe the picture: a group of people having a meeting in a bright office.',
    'Describe the picture: a busy street market with fruit stalls.',
    'Describe the picture: passengers waiting at a train platform.',
  ],
  'SPEAKING-3': [
    'Imagine a marketing firm is doing research about reading habits. How often do you read books?',
    'What kind of books do you usually read, and where do you buy them?',
    'Do you think reading e-books is better than reading printed books? Why?',
    'When was the last time you visited a library?',
  ],
  'SPEAKING-4': [
    'What time does the summit start, and where should I go first?',
    'I heard the keynote is in the afternoon. Is that correct?',
    'Could you tell me about all the sessions after lunch?',
  ],
  'SPEAKING-5': [
    'Some people prefer to work for a large company, while others prefer a small company. Which do you prefer and why?',
    'Do you agree that employees should be allowed to work from home? Why or why not?',
  ],
  'WRITING-1': [
    'Write ONE sentence based on the picture.\nWords: airport / because',
    'Write ONE sentence based on the picture.\nWords: meeting / before',
    'Write ONE sentence based on the picture.\nWords: market / while',
    'Write ONE sentence based on the picture.\nWords: ride / so that',
    'Write ONE sentence based on the picture.\nWords: kitchen / after',
    'Write ONE sentence based on the picture.\nWords: library / quietly',
  ],
  'WRITING-2': [
    'Reply to the e-mail from Laura Kim about the new parking policy. Ask TWO questions and make ONE suggestion.',
    'Reply to the e-mail from Daniel Park about volunteering for the charity run. Give TWO pieces of information and ask ONE question.',
    'Reply to the e-mail from a customer complaining about a late delivery. Apologize and offer TWO solutions.',
  ],
  'WRITING-3': [
    'Some people think that working from home is more productive than working in an office. Do you agree or disagree?',
    'Is it better to learn a new skill from a teacher or by yourself? Give reasons and examples.',
  ],
};

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${(++seq).toString(36).padStart(4, '0')}`;

function contentFor(skill: Skill, part: number, index: number, orderInGroup?: number): string {
  const key = `${skill}-${part}`;
  if (skill === 'LISTENING' && part === 1) return 'Nghe và chọn câu mô tả đúng nhất bức tranh.';
  if (skill === 'LISTENING' && part === 2) return 'Nghe câu hỏi và chọn câu trả lời phù hợp nhất.';
  if (skill === 'READING' && part === 6) return `Chỗ trống [${orderInGroup ?? index + 1}]`;
  if (key === 'LISTENING-3') return L3[index % L3.length];
  if (key === 'LISTENING-4') return L4[index % L4.length];
  if (key === 'READING-5') return R5[index % R5.length];
  if (key === 'READING-7') return R7[index % R7.length];
  const pool = OPEN_CONTENT[key] ?? ['Nội dung câu hỏi'];
  return pool[index % pool.length];
}

function makeQuestion(
  skill: Skill,
  part: number,
  index: number,
  extra: {
    status?: QuestionStatus;
    groupId?: string;
    orderInGroup?: number;
    topic?: { id: string; name: string };
  } = {},
): QuestionSummary {
  const key = `${skill}-${part}`;
  const topics = TOPICS[key] ?? ['Chủ đề chung'];
  const topicName = topics[index % topics.length];
  return {
    id: nextId('q'),
    topic: extra.topic ?? { id: `topic-${key}-${index % topics.length}`, name: topicName },
    author: index % 3 === 2 ? OTHER_TEACHERS[index % 2] : MOCK_ME,
    groupId: extra.groupId ?? null,
    orderInGroup: extra.orderInGroup ?? null,
    type: findPartRule(skill, part)?.type ?? 'SINGLE_CHOICE',
    skill,
    part,
    difficulty: DIFFICULTIES[index % DIFFICULTIES.length],
    status: extra.status ?? 'ACTIVE',
    content: contentFor(skill, part, index, extra.orderInGroup),
    createdAt: NOW,
    updatedAt: NOW,
  };
}

export interface MockGroup {
  group: QuestionGroupSummary;
  questions: QuestionSummary[];
}

function makeGroup(skill: Skill, part: number, index: number, size: number): MockGroup {
  const key = `${skill}-${part}`;
  const names = GROUP_TOPICS[key] ?? ['Nhóm câu'];
  const topic = { id: `topic-${key}-g${index % names.length}`, name: names[index % names.length] };
  const id = nextId('g');
  const questions = Array.from({ length: size }, (_, i) =>
    makeQuestion(skill, part, index * 3 + i, { groupId: id, orderInGroup: i + 1, topic }),
  );
  const listening = skill === 'LISTENING';
  return {
    group: {
      id,
      topic,
      author: index % 4 === 3 ? OTHER_TEACHERS[0] : MOCK_ME,
      skill,
      part,
      passage: listening
        ? null
        : 'To: All staff\nFrom: Human Resources\n\nPlease be advised that the third floor will be [1] ___ from Monday, May 4. During this time, employees on that floor will work from the conference rooms on the second floor.',
      transcript: listening
        ? "M: Hi, I'd like to book a room for two nights starting this Friday.\nW: Certainly. Would you prefer a room with a city view or a garden view?"
        : null,
      audioKey: null,
      imageKey: null,
      status: 'ACTIVE',
      questionCount: size,
      createdAt: NOW,
      updatedAt: NOW,
    },
    questions,
  };
}

/** Số câu đơn / kích thước các nhóm trong ngân hàng giả của từng Part */
const SINGLE_COUNTS: Record<string, number> = {
  'LISTENING-1': 12,
  'LISTENING-2': 32,
  'READING-5': 42,
  'SPEAKING-1': 3,
  'SPEAKING-2': 3,
  'SPEAKING-3': 4,
  'SPEAKING-5': 2,
  'WRITING-1': 6,
  'WRITING-2': 3,
  'WRITING-3': 2,
};
const GROUP_SIZES: Record<string, number[]> = {
  'LISTENING-3': Array.from({ length: 16 }, () => 3),
  'LISTENING-4': Array.from({ length: 13 }, () => 3),
  'READING-6': [4, 4, 4, 4, 4, 4],
  // 6×5 + 4×4 + 4×2 = 54 câu cho đề LR, thêm vài nhóm dư và một nhóm 6 câu (vượt chuẩn 2–5)
  'READING-7': [5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 2, 2, 2, 2, 3, 4, 4, 6],
  'SPEAKING-4': [3, 3],
};

export interface MockPartBank {
  singles: QuestionSummary[];
  groups: MockGroup[];
}

function buildBank(): Map<string, MockPartBank> {
  const bank = new Map<string, MockPartBank>();
  for (const [key, count] of Object.entries(SINGLE_COUNTS)) {
    const [skill, part] = key.split('-') as [Skill, string];
    bank.set(key, {
      singles: Array.from({ length: count }, (_, i) =>
        // Câu R5 thứ 4 là Nháp: đề LR mẫu có một lỗi "chưa ở trạng thái Đang dùng"
        makeQuestion(skill, Number(part), i, {
          status: key === 'READING-5' && i === 3 ? 'DRAFT' : 'ACTIVE',
        }),
      ),
      groups: [],
    });
  }
  for (const [key, sizes] of Object.entries(GROUP_SIZES)) {
    const [skill, part] = key.split('-') as [Skill, string];
    bank.set(key, {
      singles: [],
      groups: sizes.map((size, i) => makeGroup(skill, Number(part), i, size)),
    });
  }
  return bank;
}

export const MOCK_BANK = buildBank();

export function bankOf(skill: Skill, part: number): MockPartBank {
  return MOCK_BANK.get(`${skill}-${part}`) ?? { singles: [], groups: [] };
}

/** Tra câu theo id (mọi câu đơn và câu trong nhóm) */
export const QUESTION_INDEX = new Map<string, QuestionSummary>();
for (const { singles, groups } of MOCK_BANK.values()) {
  for (const question of singles) QUESTION_INDEX.set(question.id, question);
  for (const { questions } of groups) {
    for (const question of questions) QUESTION_INDEX.set(question.id, question);
  }
}
