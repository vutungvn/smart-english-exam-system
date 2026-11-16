import ExcelJS from 'exceljs';
import type { Worksheet } from 'exceljs';
import sharp from 'sharp';
import { ZipFile } from 'yazl';
import { Difficulty, QuestionType, Skill } from '../../generated/prisma/enums.js';
import {
  GROUP_COLUMNS,
  IMPORT_LIMITS,
  MEDIA_DIR,
  QUESTION_COLUMNS,
  SHEET,
  type GroupColumn,
  type QuestionColumn,
} from './import-format.js';
import type { ImportIssue } from './question-import.types.js';

const MB = 1024 * 1024;
const TEMPLATE_IMAGE = 'MAU-W1-01-01.jpg';
const EXCEL_NAME = 'questions.xlsx';
/** Số dòng được gắn danh sách chọn (skill, type, difficulty, correct) */
const VALIDATION_ROWS = 500;

// Ví dụ đủ Listening, Reading (câu đơn và nhóm), Speaking, Writing; mã bắt đầu bằng MAU- để
// không trùng mã câu thật. Nhập nguyên tệp mẫu phải thành công (chỉ có cảnh báo thiếu audio Part 2)
const SAMPLE_GROUPS: Partial<Record<GroupColumn, string | number>>[] = [
  {
    group_code: 'MAU-R7-G01',
    subject_code: 'TOEIC',
    skill: Skill.READING,
    topic: 'P7 – Chi tiết',
    part: 7,
    passage:
      'NOTICE TO ALL STAFF\n' +
      'The third-floor kitchen will be closed for renovation from Monday, May 4, to Friday, May 8. ' +
      'During this time, employees may use the break room on the second floor. ' +
      'Coffee and tea will be provided there free of charge.\n' +
      'Facilities Department',
    source: 'Tự soạn',
  },
];

const SAMPLE_QUESTIONS: Partial<Record<QuestionColumn, string | number>>[] = [
  {
    question_code: 'MAU-P2-001',
    subject_code: 'TOEIC',
    skill: Skill.LISTENING,
    topic: 'P2 – Câu hỏi WH',
    type: QuestionType.SINGLE_CHOICE,
    part: 2,
    difficulty: Difficulty.EASY,
    content: 'Where is the nearest post office?',
    option_a: "It's on Main Street, next to the bank.",
    option_b: 'I sent it yesterday.',
    option_c: 'Yes, at nine o’clock.',
    correct: 'A',
    explanation:
      'Câu hỏi Where hỏi địa điểm nên (A) đúng. (B) lặp ý gửi thư nhưng không nói nơi chốn; ' +
      '(C) trả lời Yes/No cho câu hỏi WH là sai.',
    tags: 'đời sống',
    source: 'Tự soạn',
  },
  {
    question_code: 'MAU-P5-001',
    subject_code: 'TOEIC',
    skill: Skill.READING,
    topic: 'P5/P6 – Từ loại',
    type: QuestionType.SINGLE_CHOICE,
    part: 5,
    difficulty: Difficulty.EASY,
    content: 'The marketing team will ------- the new campaign next Monday.',
    option_a: 'launch',
    option_b: 'launches',
    option_c: 'launching',
    option_d: 'launched',
    correct: 'A',
    explanation:
      'Sau trợ động từ will cần động từ nguyên mẫu nên chọn (A). (B) chia ngôi thứ ba, (C) là V-ing, ' +
      '(D) là quá khứ phân từ, đều không đứng sau will.',
    tags: 'văn phòng',
    source: 'Tự soạn',
  },
  {
    question_code: 'MAU-P7-001',
    subject_code: 'TOEIC',
    skill: Skill.READING,
    topic: 'P7 – Chi tiết',
    type: QuestionType.SINGLE_CHOICE,
    part: 7,
    difficulty: Difficulty.EASY,
    group_code: 'MAU-R7-G01',
    order_in_group: 1,
    content: 'Why was the notice written?',
    option_a: 'To announce a temporary closure',
    option_b: 'To introduce a new employee',
    option_c: 'To request feedback on a menu',
    option_d: 'To change working hours',
    correct: 'A',
    explanation:
      'Thông báo cho biết bếp tầng 3 đóng cửa để sửa chữa từ 4/5 đến 8/5 nên (A) đúng. ' +
      'Không nhắc tới nhân viên mới (B), thực đơn (C) hay giờ làm (D).',
    tags: 'văn phòng',
    source: 'Tự soạn',
  },
  {
    question_code: 'MAU-P7-002',
    subject_code: 'TOEIC',
    skill: Skill.READING,
    topic: 'P7 – Chi tiết',
    type: QuestionType.SINGLE_CHOICE,
    part: 7,
    difficulty: Difficulty.MEDIUM,
    group_code: 'MAU-R7-G01',
    order_in_group: 2,
    content: 'Where can employees get coffee during the renovation?',
    option_a: 'In the third-floor kitchen',
    option_b: 'In the second-floor break room',
    option_c: 'At a nearby café',
    option_d: 'At the Facilities Department',
    correct: 'B',
    explanation:
      'Câu "employees may use the break room on the second floor. Coffee and tea will be provided there" ' +
      'nên chọn (B). (A) đang đóng cửa; (C), (D) không được nhắc tới.',
    tags: 'văn phòng',
    source: 'Tự soạn',
  },
  {
    question_code: 'MAU-S1-01-01',
    subject_code: 'TOEIC',
    skill: Skill.SPEAKING,
    topic: 'S1 – Đọc thành tiếng',
    type: QuestionType.SPOKEN_RESPONSE,
    part: 1,
    difficulty: Difficulty.EASY,
    content:
      'Read the text aloud.\n' +
      'Thank you for calling Green Valley Bank. Our offices are open Monday through Friday, ' +
      'from nine a.m. to five p.m. To check your account balance, press one. To speak with a ' +
      'customer service representative, press two. For all other inquiries, please stay on the line.',
    prep_seconds: 45,
    response_seconds: 45,
    sample_answer:
      'Thank you for calling Green Valley Bank. Our offices are open Monday through Friday, ' +
      'from nine a.m. to five p.m. To check your account balance, press one. To speak with a ' +
      'customer service representative, press two. For all other inquiries, please stay on the line.',
    explanation:
      'Ngắt nghỉ ở dấu phẩy, dấu chấm; nhấn vào giờ mở cửa và các số lựa chọn; ' +
      'đọc rõ âm cuối (offices, inquiries). Dùng 45 giây chuẩn bị để đọc thầm một lượt.',
    tags: 'ngân hàng',
    source: 'Tự soạn',
  },
  {
    question_code: 'MAU-W1-01-01',
    subject_code: 'TOEIC',
    skill: Skill.WRITING,
    topic: 'W1 – Viết câu theo tranh',
    type: QuestionType.WRITTEN_RESPONSE,
    part: 1,
    difficulty: Difficulty.EASY,
    content:
      'Write ONE sentence based on the picture. Use the two words or phrases below.\n' +
      'Words: woman / laptop',
    sample_answer: 'The woman is working on her laptop at the desk.',
    explanation:
      'Dùng đủ hai từ cho trước, đúng ngữ pháp và đúng nội dung tranh. ' +
      'Thì hiện tại tiếp diễn hợp với hành động đang diễn ra trong tranh.',
    image_file: TEMPLATE_IMAGE,
    tags: 'văn phòng',
    source: 'Tự soạn',
  },
  {
    question_code: 'MAU-W2-01-06',
    subject_code: 'TOEIC',
    skill: Skill.WRITING,
    topic: 'W2 – Trả lời email',
    type: QuestionType.WRITTEN_RESPONSE,
    part: 2,
    difficulty: Difficulty.MEDIUM,
    content:
      'Read the e-mail below.\n' +
      'From: Anna Lee, Office Manager\n' +
      'Subject: Team lunch\n' +
      'We are planning a team lunch next Friday to welcome our new members. ' +
      'Please reply with your suggestions.\n\n' +
      'Directions: Respond to the e-mail as if you are a member of the team. ' +
      'In your e-mail, make TWO suggestions and ask ONE question.',
    sample_answer:
      'Dear Anna,\n' +
      'Thank you for organizing the lunch. First, I suggest booking Bella Pasta near our office, ' +
      'because it has a private room for large groups. Second, we could ask each new member to ' +
      'share a fun fact so everyone gets to know them. Could you tell me how many people will attend?\n' +
      'Best regards,\nMinh',
    explanation:
      'Đủ 2 đề xuất + 1 câu hỏi theo yêu cầu; có lời chào, kết thư; mỗi đề xuất kèm lý do. ' +
      'Lỗi hay gặp: thiếu câu hỏi, chỉ đưa một đề xuất.',
    tags: 'văn phòng',
    source: 'Tự soạn',
  },
];

const GUIDE_LINES = [
  'HƯỚNG DẪN NHẬP CÂU HỎI',
  '',
  'Cấu trúc tệp .zip: questions.xlsx + thư mục media/ (audio .mp3, ảnh .jpg/.png/.webp) đặt ngang hàng.',
  'Dòng 1 của mỗi sheet là tên cột, giữ nguyên. Dữ liệu bắt đầu từ dòng 2. Có thể đổi thứ tự cột.',
  '',
  'Sheet groups (Listening Part 3, 4; Reading Part 6, 7; Speaking Part 4):',
  '  group_code (bắt buộc, duy nhất trong tệp), subject_code (TOEIC), skill, topic, part.',
  '  passage: bắt buộc với Reading 6, 7 và Speaking 4. transcript: bắt buộc với Listening 3, 4 (mỗi lượt thoại một dòng).',
  '  audio_file: Listening 3, 4. image_file: biểu đồ, bảng thông tin (tùy chọn).',
  '',
  'Sheet questions:',
  '  question_code: bắt buộc, duy nhất (cả trong tệp lẫn trong ngân hàng), ví dụ P5-001, S1-03-11.',
  '  skill: LISTENING / READING / SPEAKING / WRITING. part: LR 1–7, Speaking 1–5, Writing 1–3.',
  '  topic: đúng tên chủ đề trong danh mục, ví dụ "P5/P6 – Từ loại".',
  '  type: SINGLE_CHOICE (LR) / SPOKEN_RESPONSE (Speaking) / WRITTEN_RESPONSE (Writing).',
  '  difficulty: EASY / MEDIUM / HARD.',
  '  Câu thuộc nhóm: ghi group_code của nhóm và order_in_group (1, 2, 3…).',
  '  Trắc nghiệm: option_a…option_d (Listening Part 2 chỉ A–C) và correct (A/B/C/D).',
  '  Speaking: prep_seconds, response_seconds và sample_answer. Writing: sample_answer.',
  '  Writing Part 1: dòng cuối của content là hai từ cho trước, dạng "Words: airport / because".',
  '  explanation: bắt buộc, viết tiếng Việt.',
  '  audio_file / image_file: chỉ ghi tên tệp trong media/ (không ghi thư mục), ví dụ P1-003.mp3.',
  '  tags, source: để tham khảo khi soạn, hệ thống chưa lưu.',
  '',
  'Giới hạn:',
  `  Tệp .zip tối đa ${IMPORT_LIMITS.zipBytes / MB} MB, giải nén tối đa ${IMPORT_LIMITS.zipTotalBytes / MB} MB.`,
  `  Tối đa ${IMPORT_LIMITS.questionRows} câu và ${IMPORT_LIMITS.groupRows} nhóm mỗi tệp.`,
  `  Audio tối đa ${IMPORT_LIMITS.audioBytes / MB} MB mỗi tệp (khuyên dùng MP3 mono 64 kbps).`,
  `  Ảnh tối đa ${IMPORT_LIMITS.imageBytes / MB} MB mỗi tệp (khuyên dùng JPG rộng tối đa 1280px, dưới 300 KB).`,
  '  Định dạng tệp kiểm tra theo nội dung, đổi đuôi tệp không qua được.',
  '',
  'Sau khi tải lên: xem trước danh sách lỗi theo sheet/dòng/cột, sửa hết lỗi rồi mới xác nhận nhập.',
  'Cảnh báo (thiếu audio, nhóm sai số câu chuẩn…) không chặn việc nhập.',
];

/** Danh sách chọn cho các cột có giá trị cố định */
const LIST_VALUES: Partial<Record<QuestionColumn | GroupColumn, string[]>> = {
  skill: Object.values(Skill),
  type: Object.values(QuestionType),
  difficulty: Object.values(Difficulty),
  correct: ['A', 'B', 'C', 'D'],
};

function addDataSheet<C extends string>(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: readonly C[],
  rows: Partial<Record<C, string | number>>[],
): Worksheet {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({
    header: column,
    key: column,
    width: ['content', 'passage', 'transcript', 'sample_answer', 'explanation'].includes(column)
      ? 60
      : 18,
  }));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };

  for (const row of rows) sheet.addRow(row).alignment = { wrapText: true, vertical: 'top' };

  columns.forEach((column, index) => {
    const values = LIST_VALUES[column as keyof typeof LIST_VALUES];
    if (!values) return;
    for (let row = 2; row <= VALIDATION_ROWS + 1; row++) {
      sheet.getCell(row, index + 1).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${values.join(',')}"`],
      };
    }
  });
  return sheet;
}

/** Ảnh minh họa cho câu Writing Part 1 mẫu: người ngồi trước máy tính (vẽ bằng hình khối) */
function templateImage(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="533">
  <rect width="800" height="533" fill="#e0f2fe"/>
  <rect x="0" y="380" width="800" height="153" fill="#cbd5e1"/>
  <rect x="180" y="330" width="440" height="24" rx="6" fill="#92400e"/>
  <rect x="210" y="354" width="18" height="140" fill="#78350f"/>
  <rect x="572" y="354" width="18" height="140" fill="#78350f"/>
  <rect x="360" y="230" width="180" height="104" rx="8" fill="#334155"/>
  <rect x="372" y="242" width="156" height="80" rx="4" fill="#38bdf8"/>
  <circle cx="290" cy="170" r="42" fill="#f5c79f"/>
  <path d="M248 160 q42 -70 84 0 q-6 -40 -42 -46 q-36 6 -42 46z" fill="#1f2937"/>
  <rect x="240" y="214" width="100" height="130" rx="30" fill="#db2777"/>
  <rect x="320" y="270" width="80" height="22" rx="11" fill="#f5c79f"/>
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

function zipToBuffer(files: { name: string; data: Buffer }[]): Promise<Buffer> {
  const zip = new ZipFile();
  for (const file of files) zip.addBuffer(file.data, file.name);
  zip.end();

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    zip.outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    zip.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
    zip.outputStream.on('error', reject);
  });
}

/** Tệp mẫu .zip: questions.xlsx (sheet hướng dẫn + 2 sheet dữ liệu có ví dụ) và media/ */
export async function buildTemplateZip(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const guide = workbook.addWorksheet('huong_dan');
  guide.getColumn(1).width = 120;
  GUIDE_LINES.forEach((line, index) => {
    const cell = guide.getCell(index + 1, 1);
    cell.value = line;
    if (index === 0) cell.font = { bold: true, size: 14 };
  });
  addDataSheet(workbook, SHEET.groups, GROUP_COLUMNS, SAMPLE_GROUPS);
  addDataSheet(workbook, SHEET.questions, QUESTION_COLUMNS, SAMPLE_QUESTIONS);

  const excel = Buffer.from(await workbook.xlsx.writeBuffer());
  return zipToBuffer([
    { name: EXCEL_NAME, data: excel },
    { name: MEDIA_DIR + TEMPLATE_IMAGE, data: await templateImage() },
  ]);
}

const LEVEL_LABEL = { error: 'Lỗi', warning: 'Cảnh báo' } as const;

/** Danh sách lỗi, cảnh báo dạng Excel để người soạn lọc theo sheet/cột khi sửa */
export async function buildIssuesWorkbook(
  errors: ImportIssue[],
  warnings: ImportIssue[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('loi', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Mức', key: 'level', width: 12 },
    { header: 'Sheet', key: 'sheet', width: 12 },
    { header: 'Dòng', key: 'row', width: 8 },
    { header: 'Cột', key: 'column', width: 18 },
    { header: 'Nội dung', key: 'message', width: 100 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = 'A1:E1';

  const add = (level: keyof typeof LEVEL_LABEL, issue: ImportIssue) =>
    sheet.addRow({ ...issue, level: LEVEL_LABEL[level] });
  for (const issue of errors) add('error', issue).font = { color: { argb: 'FFB91C1C' } };
  for (const issue of warnings) add('warning', issue);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
