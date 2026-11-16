import { AppException } from '../../common/errors/app.exception.js';
import { Difficulty, QuestionType, Skill } from '../../generated/prisma/enums.js';
import { groupSizeOf } from '../exams/exam-structure.js';
import type { QuestionMediaExt } from '../media/media.constants.js';
import { assertGroupRules, assertQuestionRules } from '../questions/question-rules.js';
import { describePart, findPartRule, type PartRule } from '../questions/toeic-parts.js';
import {
  CODE_PATTERN,
  groupMediaRule,
  IMPORT_LIMITS,
  MEDIA_NAME_PATTERN,
  questionMediaRule,
  WRITING_WORDS_PATTERN,
  type GroupColumn,
  type MediaKind,
  type QuestionColumn,
} from './import-format.js';
import type { SheetRow } from './import-workbook.js';
import type { ImportIssue, ImportIssueSheet } from './question-import.types.js';

// Kiểm tra toàn bộ dữ liệu nhập. Hàm thuần (không đụng DB, kho tệp): service nạp sẵn danh mục
// chủ đề, mã câu đã có, thông tin tệp media rồi truyền vào, nên test được riêng.

export interface TopicInfo {
  id: string;
  name: string;
  skill: Skill;
  parts: number[];
}

export interface SubjectInfo {
  id: string;
  code: string;
  topics: TopicInfo[];
}

/** Tệp trong media/, đã nhận dạng định dạng theo nội dung */
export interface MediaFileInfo {
  /** Tên tệp như trong .zip (không gồm thư mục) */
  name: string;
  /** Đường dẫn đầy đủ trong .zip */
  entryName: string;
  size: number;
  /** null: nội dung không phải MP3 hay ảnh JPG/PNG/WebP, dù đuôi tệp là gì */
  kind: MediaKind | null;
  ext: QuestionMediaExt | null;
}

export interface ImportCatalog {
  /** Chương trình thi đang dùng, khóa là mã viết hoa (TOEIC) */
  subjects: ReadonlyMap<string, SubjectInfo>;
  /** Mã câu đã có trong ngân hàng (câu chưa xóa), viết hoa */
  takenCodes: ReadonlySet<string>;
  /** Tệp trong media/, khóa là tên tệp viết thường */
  media: ReadonlyMap<string, MediaFileInfo>;
}

export interface PlannedGroup {
  row: number;
  code: string;
  subjectId: string;
  topicId: string;
  skill: Skill;
  part: number;
  passage: string | null;
  transcript: string | null;
  /** Khóa trong catalog.media */
  audioFile: string | null;
  imageFile: string | null;
}

export interface PlannedQuestion {
  row: number;
  code: string;
  topicId: string;
  topicName: string;
  skill: Skill;
  part: number;
  type: QuestionType;
  difficulty: Difficulty;
  groupCode: string | null;
  orderInGroup: number | null;
  content: string;
  explanation: string;
  sampleAnswer: string | null;
  prepSeconds: number | null;
  responseSeconds: number | null;
  options: { label: string; content: string; isCorrect: boolean }[];
  audioFile: string | null;
  imageFile: string | null;
}

export interface ImportPlan {
  /** Chỉ gồm nhóm, câu không có lỗi */
  groups: PlannedGroup[];
  questions: PlannedQuestion[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  /** Khóa các tệp media được nhóm/câu hợp lệ dùng tới */
  usedMedia: Set<string>;
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const OPTION_COLUMNS = ['option_a', 'option_b', 'option_c', 'option_d'] as const;

/** Trường trong lỗi của question-rules.ts → cột trong Excel */
const RULE_FIELD_COLUMN: Record<string, string> = {
  part: 'part',
  type: 'type',
  groupId: 'group_code',
  orderInGroup: 'order_in_group',
  options: 'correct',
  sampleAnswer: 'sample_answer',
  prepSeconds: 'prep_seconds',
  responseSeconds: 'response_seconds',
  passage: 'passage',
  transcript: 'transcript',
};

const MEDIA_LABEL: Record<MediaKind, string> = { audio: 'âm thanh', image: 'hình ảnh' };

/** "P5/P6 - từ loại" khớp "P5/P6 – Từ loại": bỏ qua hoa thường, loại gạch ngang, khoảng trắng thừa */
export function topicKey(name: string): string {
  return name
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lỗi quy tắc nghiệp vụ (fieldError) → { field, message } */
function ruleError(error: unknown): { field: string; message: string } | null {
  if (!(error instanceof AppException) || !Array.isArray(error.details)) return null;
  const [detail] = error.details as { field: string; message: string }[];
  return detail ?? null;
}

/** Đọc, kiểm tra từng ô của một dòng; gom mọi lỗi của dòng thay vì dừng ở lỗi đầu tiên */
class RowReader<C extends string> {
  readonly errors: ImportIssue[] = [];

  constructor(
    private readonly sheet: ImportIssueSheet,
    private readonly source: SheetRow<C>,
    private readonly warnings: ImportIssue[],
  ) {}

  get row(): number {
    return this.source.row;
  }

  error(column: C, message: string): void {
    this.errors.push({ sheet: this.sheet, row: this.source.row, column, message });
  }

  warn(column: C, message: string): void {
    this.warnings.push({ sheet: this.sheet, row: this.source.row, column, message });
  }

  raw(column: C): string | null {
    return this.source.cells[column] ?? null;
  }

  text(column: C, options: { required?: boolean; max: number }): string | null {
    const value = this.raw(column);
    if (!value) {
      if (options.required) this.error(column, 'Không được để trống');
      return null;
    }
    if (value.length > options.max) {
      this.error(column, `Tối đa ${options.max} ký tự (đang có ${value.length})`);
      return null;
    }
    return value;
  }

  code(column: C, required: boolean): string | null {
    const value = this.raw(column)?.toUpperCase() ?? null;
    if (!value) {
      if (required) this.error(column, 'Không được để trống');
      return null;
    }
    if (!CODE_PATTERN.test(value)) {
      this.error(column, 'Mã chỉ gồm chữ, số, dấu chấm, gạch ngang, gạch dưới; tối đa 50 ký tự');
      return null;
    }
    return value;
  }

  choice<T extends string>(column: C, values: readonly T[]): T | null {
    const value = this.raw(column)?.toUpperCase();
    if (!value) {
      this.error(column, 'Không được để trống');
      return null;
    }
    const found = values.find((item) => item === value);
    if (!found) this.error(column, `Giá trị phải là một trong: ${values.join(', ')}`);
    return found ?? null;
  }

  int(column: C, min: number, max: number, required: boolean): number | null {
    const value = this.raw(column);
    if (!value) {
      if (required) this.error(column, 'Không được để trống');
      return null;
    }
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
      this.error(column, `Phải là số nguyên từ ${min} đến ${max}`);
      return null;
    }
    return number;
  }

  subject(column: C, subjects: ReadonlyMap<string, SubjectInfo>): SubjectInfo | null {
    const value = this.raw(column)?.toUpperCase();
    if (!value) {
      this.error(column, 'Không được để trống');
      return null;
    }
    const subject = subjects.get(value);
    if (!subject) this.error(column, `Không có chương trình thi "${value}" đang mở`);
    return subject ?? null;
  }

  /** Chủ đề phải đúng tên trong danh mục (Mục 3.4), đúng kỹ năng và dùng được cho Part */
  topic(
    column: C,
    subject: SubjectInfo | null,
    skill: Skill | null,
    part: number | null,
  ): TopicInfo | null {
    const value = this.raw(column);
    if (!value) {
      this.error(column, 'Không được để trống');
      return null;
    }
    if (!subject || !skill || !part) return null;

    const topic = subject.topics.find((item) => topicKey(item.name) === topicKey(value));
    if (!topic) {
      this.error(column, `Không có chủ đề "${value}" trong ${subject.code}`);
      return null;
    }
    if (topic.skill !== skill) {
      this.error(column, `Chủ đề "${topic.name}" thuộc kỹ năng ${topic.skill}`);
      return null;
    }
    if (!topic.parts.includes(part)) {
      this.error(column, `Chủ đề "${topic.name}" chỉ dùng cho Part ${topic.parts.join(', ')}`);
      return null;
    }
    return topic;
  }

  /** Tên tệp trong media/: đúng loại theo nội dung, Part được phép dùng; trả về khóa trong catalog */
  media(
    column: C,
    kind: MediaKind,
    rule: { allowed: boolean; recommended: boolean } | null,
    partName: string,
    catalog: ReadonlyMap<string, MediaFileInfo>,
  ): string | null {
    const name = this.raw(column);
    const label = MEDIA_LABEL[kind];
    if (!name) {
      if (rule?.recommended) {
        this.warn(column, `Chưa có tệp ${label}; đề thi chứa câu này sẽ bị cảnh báo khi xuất bản`);
      }
      return null;
    }
    if (rule && !rule.allowed) {
      this.error(column, `${partName} không dùng tệp ${label}`);
      return null;
    }
    if (!MEDIA_NAME_PATTERN.test(name)) {
      this.error(
        column,
        'Tên tệp chỉ gồm chữ, số, dấu chấm, gạch; đuôi .mp3, .jpg, .png, .webp; không ghi thư mục',
      );
      return null;
    }

    const key = name.toLowerCase();
    const file = catalog.get(key);
    if (!file) {
      this.error(column, `Không tìm thấy media/${name} trong tệp .zip`);
      return null;
    }
    if (!file.kind) {
      this.error(
        column,
        `media/${file.name} không phải tệp MP3 hay ảnh JPG, PNG, WebP hợp lệ (kiểm tra theo nội dung, không theo đuôi tệp)`,
      );
      return null;
    }
    if (file.kind !== kind) {
      this.error(
        column,
        `media/${file.name} là tệp ${MEDIA_LABEL[file.kind]}, cột này cần ${label}`,
      );
      return null;
    }
    const limit = kind === 'audio' ? IMPORT_LIMITS.audioBytes : IMPORT_LIMITS.imageBytes;
    if (file.size > limit) {
      this.error(column, `media/${file.name} lớn hơn ${limit / 1024 / 1024} MB`);
      return null;
    }
    return key;
  }

  /** Chạy quy tắc của question-rules.ts, lỗi gắn vào đúng cột */
  rules(check: () => unknown): void {
    try {
      check();
    } catch (error) {
      const detail = ruleError(error);
      if (!detail) throw error;
      this.error((RULE_FIELD_COLUMN[detail.field] ?? detail.field) as C, detail.message);
    }
  }
}

interface GroupEntry {
  row: number;
  plan: PlannedGroup | null;
  subjectCode: string | null;
  questionRows: number[];
}

function partRuleOf(
  reader: RowReader<string>,
  skill: Skill | null,
  part: number | null,
): PartRule | null {
  if (!skill || !part) return null;
  const rule = findPartRule(skill, part);
  if (!rule) reader.error('part', `Kỹ năng ${skill} không có Part ${part}`);
  return rule ?? null;
}

function validateGroups(
  rows: SheetRow<GroupColumn>[],
  catalog: ImportCatalog,
  plan: ImportPlan,
): Map<string, GroupEntry> {
  const groups = new Map<string, GroupEntry>();

  for (const source of rows) {
    const r = new RowReader<GroupColumn>('groups', source, plan.warnings);
    const code = r.code('group_code', true);
    if (code && groups.has(code)) {
      r.error('group_code', `Mã nhóm trùng với dòng ${groups.get(code)?.row}`);
    }

    const subject = r.subject('subject_code', catalog.subjects);
    const skill = r.choice('skill', Object.values(Skill));
    const part = r.int('part', 1, 7, true);
    const rule = partRuleOf(r, skill, part);
    // Part không hợp lệ thì đã báo ở cột part, không báo thêm lỗi chủ đề theo Part
    const topic = r.topic('topic', subject, skill, rule ? part : null);
    const passage = r.text('passage', { max: 20000 });
    const transcript = r.text('transcript', { max: 20000 });

    const partName = rule ? describePart(rule) : '';
    const audioFile = r.media(
      'audio_file',
      'audio',
      rule && groupMediaRule('audio', rule.skill, rule.part),
      partName,
      catalog.media,
    );
    const imageFile = r.media(
      'image_file',
      'image',
      rule && groupMediaRule('image', rule.skill, rule.part),
      partName,
      catalog.media,
    );

    if (rule && r.errors.length === 0) {
      r.rules(() => assertGroupRules({ skill: rule.skill, part: rule.part, passage, transcript }));
    }

    plan.errors.push(...r.errors);
    if (!code || groups.has(code)) continue;
    groups.set(code, {
      row: source.row,
      subjectCode: subject?.code ?? null,
      questionRows: [],
      plan:
        r.errors.length === 0 && subject && rule && topic
          ? {
              row: source.row,
              code,
              subjectId: subject.id,
              topicId: topic.id,
              skill: rule.skill,
              part: rule.part,
              passage,
              transcript,
              audioFile,
              imageFile,
            }
          : null,
    });
  }

  return groups;
}

function validateQuestion(
  source: SheetRow<QuestionColumn>,
  catalog: ImportCatalog,
  groups: Map<string, GroupEntry>,
  seenCodes: Map<string, number>,
  groupOrders: Map<string, Map<number, number>>,
  plan: ImportPlan,
): PlannedQuestion | null {
  const r = new RowReader<QuestionColumn>('questions', source, plan.warnings);

  const code = r.code('question_code', true);
  if (code) {
    const firstRow = seenCodes.get(code);
    if (firstRow) r.error('question_code', `Mã câu trùng với dòng ${firstRow}`);
    else seenCodes.set(code, source.row);
    if (catalog.takenCodes.has(code)) {
      r.error('question_code', 'Mã câu đã có trong ngân hàng câu hỏi');
    }
  }

  const subject = r.subject('subject_code', catalog.subjects);
  const skill = r.choice('skill', Object.values(Skill));
  const part = r.int('part', 1, 7, true);
  const rule = partRuleOf(r, skill, part);
  // Part không hợp lệ thì đã báo ở cột part, không báo thêm lỗi chủ đề theo Part
  const topic = r.topic('topic', subject, skill, rule ? part : null);
  const type = r.choice('type', Object.values(QuestionType));
  const difficulty = r.choice('difficulty', Object.values(Difficulty));
  const groupCode = r.code('group_code', false);
  const orderInGroup = r.int('order_in_group', 1, 20, false);
  const content = r.text('content', { required: true, max: 5000 });
  const explanation = r.text('explanation', { required: true, max: 5000 });
  const sampleAnswer = r.text('sample_answer', { max: 10000 });
  const prepSeconds = r.int('prep_seconds', 0, 300, false);
  const responseSeconds = r.int('response_seconds', 1, 3600, false);

  const texts = OPTION_COLUMNS.map((column) => r.text(column, { max: 1000 }));
  const correct = r.raw('correct')?.toUpperCase() ?? null;
  const options: PlannedQuestion['options'] = [];
  const partName = rule ? describePart(rule) : '';

  const optionCount = rule?.optionCount;
  if (optionCount) {
    const letters = LETTERS.slice(0, optionCount);
    OPTION_COLUMNS.forEach((column, index) => {
      const label = LETTERS[index];
      const text = texts[index];
      if (index >= optionCount) {
        // Part 2 chỉ có A–C: ô option_d có chữ là nhập nhầm
        if (r.raw(column)) r.error(column, `${partName} chỉ có phương án ${letters.join(', ')}`);
      } else if (text) {
        options.push({ label, content: text, isCorrect: label === correct });
      } else if (!r.raw(column)) {
        r.error(column, `Thiếu phương án ${label}`);
      }
    });
    if (!correct) r.error('correct', 'Thiếu đáp án đúng');
    else if (!(letters as readonly string[]).includes(correct)) {
      r.error('correct', `Đáp án đúng phải là một trong ${letters.join(', ')}`);
    }
  } else if (rule) {
    const filled = [...OPTION_COLUMNS, 'correct' as const].find((column) => r.raw(column));
    if (filled) r.error(filled, `${partName} là câu trả lời mở, không có phương án, đáp án`);
  }

  // Writing Part 1: hai từ cho trước ở dòng cuối, AI chấm cần biết học viên có dùng đủ không
  if (rule?.skill === Skill.WRITING && rule.part === 1 && content) {
    const lastLine = content.split('\n').at(-1)?.trim() ?? '';
    if (!WRITING_WORDS_PATTERN.test(lastLine)) {
      r.error(
        'content',
        'Writing Part 1: dòng cuối phải là hai từ cho trước, ví dụ "Words: airport / because"',
      );
    }
  }

  const audioFile = r.media(
    'audio_file',
    'audio',
    rule && questionMediaRule('audio', rule.skill, rule.part),
    partName,
    catalog.media,
  );
  const imageFile = r.media(
    'image_file',
    'image',
    rule && questionMediaRule('image', rule.skill, rule.part),
    partName,
    catalog.media,
  );

  // Câu thuộc nhóm: nhóm phải có trong sheet groups, không lỗi, cùng chương trình, kỹ năng, Part
  const group = groupCode ? groups.get(groupCode) : undefined;
  if (groupCode && !group) {
    r.error('group_code', `Không có nhóm ${groupCode} trong sheet groups`);
  } else if (group) {
    group.questionRows.push(source.row);
    if (!group.plan) {
      r.error('group_code', `Nhóm ${groupCode} đang có lỗi ở sheet groups (dòng ${group.row})`);
    } else if (rule && (group.plan.skill !== rule.skill || group.plan.part !== rule.part)) {
      r.error(
        'group_code',
        `Nhóm ${groupCode} thuộc ${group.plan.skill} Part ${group.plan.part}, khác với câu`,
      );
    } else if (subject && group.subjectCode !== subject.code) {
      r.error('group_code', `Nhóm ${groupCode} thuộc chương trình ${group.subjectCode}`);
    }
    if (orderInGroup !== null && groupCode) {
      const orders = groupOrders.get(groupCode) ?? new Map<number, number>();
      groupOrders.set(groupCode, orders);
      const takenBy = orders.get(orderInGroup);
      if (takenBy) {
        r.error(
          'order_in_group',
          `Vị trí ${orderInGroup} trong nhóm ${groupCode} đã có ở dòng ${takenBy}`,
        );
      } else orders.set(orderInGroup, source.row);
    }
  }

  // Quy tắc giữa các trường (loại câu, nhóm, câu trả lời mẫu, thời gian) dùng chung với form tạo câu
  if (rule && type && r.errors.length === 0) {
    r.rules(() =>
      assertQuestionRules({
        skill: rule.skill,
        part: rule.part,
        type,
        groupId: groupCode,
        orderInGroup,
        sampleAnswer,
        prepSeconds,
        responseSeconds,
        options,
      }),
    );
  }

  plan.errors.push(...r.errors);
  if (r.errors.length > 0 || !code || !rule || !topic || !type || !difficulty) return null;
  if (!content || !explanation) return null;

  return {
    row: source.row,
    code,
    topicId: topic.id,
    topicName: topic.name,
    skill: rule.skill,
    part: rule.part,
    type,
    difficulty,
    groupCode,
    orderInGroup,
    content,
    explanation,
    sampleAnswer,
    prepSeconds,
    responseSeconds,
    options,
    audioFile,
    imageFile,
  };
}

export function validateImport(
  rows: { groups: SheetRow<GroupColumn>[]; questions: SheetRow<QuestionColumn>[] },
  catalog: ImportCatalog,
  options: { reportEmpty?: boolean } = {},
): ImportPlan {
  const plan: ImportPlan = {
    groups: [],
    questions: [],
    errors: [],
    warnings: [],
    usedMedia: new Set(),
  };

  if (rows.questions.length === 0 && options.reportEmpty !== false) {
    plan.errors.push({
      sheet: 'questions',
      row: null,
      column: null,
      message: 'Sheet questions chưa có câu hỏi nào',
    });
  }

  const groups = validateGroups(rows.groups, catalog, plan);
  const seenCodes = new Map<string, number>();
  const groupOrders = new Map<string, Map<number, number>>();
  for (const source of rows.questions) {
    const question = validateQuestion(source, catalog, groups, seenCodes, groupOrders, plan);
    if (question) plan.questions.push(question);
  }

  // Nhóm không có câu nào là lỗi; số câu khác định dạng TOEIC chỉ nhắc (đề luyện tập vẫn dùng được)
  for (const [code, group] of groups) {
    if (!group.plan) continue;
    if (group.questionRows.length === 0) {
      plan.errors.push({
        sheet: 'groups',
        row: group.row,
        column: 'group_code',
        message: `Nhóm ${code} chưa có câu nào trong sheet questions`,
      });
      continue;
    }
    plan.groups.push(group.plan);
    const size = groupSizeOf(group.plan.skill, group.plan.part);
    const count = group.questionRows.length;
    if (size && (count < size.min || count > size.max)) {
      const expected = size.min === size.max ? `${size.min}` : `${size.min}–${size.max}`;
      plan.warnings.push({
        sheet: 'groups',
        row: group.row,
        column: 'group_code',
        message: `Nhóm TOEIC ${group.plan.skill} Part ${group.plan.part} có ${expected} câu, nhóm này có ${count} câu`,
      });
    }
  }

  // Còn lỗi thì không nhập gì cả, nên chỉ đếm tệp media của dữ liệu hợp lệ để hiện thống kê
  for (const item of [...plan.groups, ...plan.questions]) {
    if (item.audioFile) plan.usedMedia.add(item.audioFile);
    if (item.imageFile) plan.usedMedia.add(item.imageFile);
  }

  const referenced = new Set(
    [...rows.groups, ...rows.questions].flatMap((row) =>
      [row.cells.audio_file, row.cells.image_file].flatMap((name) =>
        name ? [name.toLowerCase()] : [],
      ),
    ),
  );
  for (const [key, file] of catalog.media) {
    if (!referenced.has(key)) {
      plan.warnings.push({
        sheet: 'media',
        row: null,
        column: null,
        message: `media/${file.name} không được dòng nào dùng tới, sẽ bỏ qua`,
      });
    }
  }

  return plan;
}
