import type { Prisma } from '../../generated/prisma/client.js';
import type { MediaUrlService } from '../media/media-url.service.js';
import type {
  QuestionDetail,
  QuestionGroupDetail,
  QuestionGroupSummary,
  QuestionSummary,
} from './questions.types.js';

// select khai báo một lần, dùng chung cho mọi truy vấn: response luôn cùng hình dạng,
// và không bao giờ lỡ trả cột nội bộ (author_id, deleted_at)

const authorSelect = { select: { user: { select: { id: true, fullName: true } } } } as const;
const topicSelect = { select: { id: true, name: true } } as const;

export const questionSummarySelect = {
  id: true,
  code: true,
  groupId: true,
  orderInGroup: true,
  type: true,
  skill: true,
  part: true,
  difficulty: true,
  status: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  topic: topicSelect,
  author: authorSelect,
} satisfies Prisma.QuestionSelect;

export const questionDetailSelect = {
  ...questionSummarySelect,
  explanation: true,
  sampleAnswer: true,
  prepSeconds: true,
  responseSeconds: true,
  audioKey: true,
  imageKey: true,
  options: {
    select: { id: true, label: true, content: true, isCorrect: true },
    orderBy: { orderIndex: 'asc' },
  },
} satisfies Prisma.QuestionSelect;

export const groupSummarySelect = {
  id: true,
  skill: true,
  part: true,
  passage: true,
  transcript: true,
  audioKey: true,
  imageKey: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  topic: topicSelect,
  author: authorSelect,
  // Đếm trong DB, không tải cả danh sách câu chỉ để lấy độ dài
  _count: { select: { questions: { where: { deletedAt: null } } } },
} satisfies Prisma.QuestionGroupSelect;

export const groupDetailSelect = {
  ...groupSummarySelect,
  questions: {
    where: { deletedAt: null },
    orderBy: { orderInGroup: 'asc' },
    select: questionSummarySelect,
  },
} satisfies Prisma.QuestionGroupSelect;

type QuestionSummaryRow = Prisma.QuestionGetPayload<{ select: typeof questionSummarySelect }>;
type QuestionDetailRow = Prisma.QuestionGetPayload<{ select: typeof questionDetailSelect }>;
type GroupSummaryRow = Prisma.QuestionGroupGetPayload<{ select: typeof groupSummarySelect }>;
type GroupDetailRow = Prisma.QuestionGroupGetPayload<{ select: typeof groupDetailSelect }>;

// author trong DB là bảng teachers → users; API chỉ cần { id, fullName }
export function toQuestionSummary({ author, ...row }: QuestionSummaryRow): QuestionSummary {
  return { ...row, author: author.user };
}

// media gắn URL ký cho audio/ảnh: chỉ API đã kiểm tra quyền xem mới gọi các hàm này
export function toQuestionDetail(
  { author, ...row }: QuestionDetailRow,
  media: MediaUrlService,
): QuestionDetail {
  return media.withUrls({ ...row, author: author.user });
}

export function toGroupSummary(
  { author, _count, ...row }: GroupSummaryRow,
  media: MediaUrlService,
): QuestionGroupSummary {
  return media.withUrls({ ...row, author: author.user, questionCount: _count.questions });
}

export function toGroupDetail(
  { questions, ...row }: GroupDetailRow,
  media: MediaUrlService,
): QuestionGroupDetail {
  return { ...toGroupSummary(row, media), questions: questions.map(toQuestionSummary) };
}
