import { Injectable, Logger } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { InMemoryFile } from '../../common/types/in-memory-file.js';
import { Prisma } from '../../generated/prisma/client.js';
import { QuestionStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { RedisService } from '../../infra/redis/redis.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { excerpt, partOrder } from '../exams/exam-structure.js';
import {
  QUESTION_MEDIA_KEY_PREFIX,
  QUESTION_MEDIA_TYPES,
  type QuestionMediaExt,
} from '../media/media.constants.js';
import { findPartRule } from '../questions/toeic-parts.js';
import { CODE_PATTERN, IMPORT_LIMITS, MEDIA_DIR, type MediaKind } from './import-format.js';
import {
  validateImport,
  type ImportCatalog,
  type ImportPlan,
  type MediaFileInfo,
  type SubjectInfo,
} from './import-rules.js';
import { buildIssuesWorkbook, buildTemplateZip } from './import-template.js';
import { readWorkbook } from './import-workbook.js';
import type {
  ImportIssue,
  ImportPartCount,
  ImportPreview,
  ImportQuestionRow,
  ImportResult,
} from './question-import.types.js';
import { invalidFile, SafeZip } from './safe-zip.js';

// Bản xem trước giữ 1 giờ; mỗi giáo viên chỉ giữ một bản, tải tệp mới thì bản cũ bị hủy
const PREVIEW_TTL_SECONDS = 60 * 60;
const LOCK_TTL_SECONDS = 10 * 60;
/** Số lỗi/cảnh báo trả trong response xem trước; đầy đủ trong tệp lỗi */
const RESPONSE_ISSUE_LIMIT = 500;
const STORED_ISSUE_LIMIT = 5000;
/**
 * Tệp .zip đã kiểm tra xong chờ xác nhận. Key cố định theo giáo viên (imports/<userId>.zip): bản xem
 * trước hết hạn mà không xác nhận thì lần tải sau ghi đè, kho không tích tệp mồ côi
 */
const importZipKey = (userId: string) => `imports/${userId}.zip`;

const recordKey = (token: string) => `question-import:${token}`;
const userKey = (userId: string) => `question-import:user:${userId}`;
const lockKey = (token: string) => `question-import:lock:${token}`;

/** Định dạng nhận được, nhận dạng theo nội dung tệp (file-type) */
const SNIFFED: Record<string, { kind: MediaKind; ext: QuestionMediaExt }> = {
  'audio/mpeg': { kind: 'audio', ext: 'mp3' },
  'image/jpeg': { kind: 'image', ext: 'jpg' },
  'image/png': { kind: 'image', ext: 'png' },
  'image/webp': { kind: 'image', ext: 'webp' },
};

/** Kết quả đọc và kiểm tra một tệp .zip; confirm và script seed dùng lại */
export interface ImportAnalysis {
  plan: ImportPlan;
  zip: SafeZip;
  media: ReadonlyMap<string, MediaFileInfo>;
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

interface StoredImport {
  userId: string;
  /** null khi tệp còn lỗi: không xác nhận được nên không cần giữ tệp */
  zipKey: string | null;
  preview: ImportPreview;
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

interface LocatedFiles {
  excelName: string;
  media: Map<string, { name: string; entryName: string; size: number }>;
  warnings: ImportIssue[];
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** multer đọc tên tệp theo latin1: tên tiếng Việt UTF-8 bị vỡ dấu thì đọc lại */
function originalName(name: string): string {
  // Đã có ký tự ngoài latin1 nghĩa là tên đã được đọc đúng UTF-8
  const decoded = [...name].some((char) => char.charCodeAt(0) > 0xff);
  const fixed = decoded ? name : Buffer.from(name, 'latin1').toString('utf8');
  return baseName(fixed.replace(/\\/g, '/')).slice(0, 255) || 'questions.zip';
}

async function streamToBuffer(stream: Readable, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > maxBytes) throw new AppException(ErrorCode.PAYLOAD_TOO_LARGE);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

/**
 * Nhập câu hỏi từ tệp .zip (UC Nhập câu hỏi từ tệp, SPRINT-45): xem trước → xác nhận.
 * analyze() và commit() không phụ thuộc HTTP, script seed (SPRINT-49) gọi thẳng hai hàm này.
 */
@Injectable()
export class QuestionImportService {
  private readonly logger = new Logger(QuestionImportService.name);
  private template?: Promise<Buffer>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  /** Tệp mẫu không đổi giữa các lần gọi: tạo một lần, giữ trong bộ nhớ */
  getTemplate(): Promise<Buffer> {
    this.template ??= buildTemplateZip().catch((error: unknown) => {
      this.template = undefined;
      throw error;
    });
    return this.template;
  }

  async preview(file: InMemoryFile | undefined, user: AuthUser): Promise<ImportPreview> {
    if (!file) throw invalidFile('Vui lòng chọn tệp .zip để tải lên');

    const analysis = await this.analyze(file.buffer);
    const token = randomUUID();
    const canConfirm = analysis.errors.length === 0;

    // Mỗi giáo viên chỉ giữ một bản xem trước: hủy bản cũ trước khi lưu tệp của bản mới
    const previous = await this.redis.get(userKey(user.id));
    if (previous) await this.discard(previous);

    let zipKey: string | null = null;
    if (canConfirm) {
      zipKey = importZipKey(user.id);
      await this.storage.save(zipKey, file.buffer, { contentType: 'application/zip' });
    }

    const preview = this.toPreview(analysis, {
      token,
      fileName: originalName(file.originalname),
      canConfirm,
    });
    const record: StoredImport = {
      userId: user.id,
      zipKey,
      preview,
      errors: analysis.errors.slice(0, STORED_ISSUE_LIMIT),
      warnings: analysis.warnings.slice(0, STORED_ISSUE_LIMIT),
    };
    await this.redis
      .multi()
      .set(recordKey(token), JSON.stringify(record), 'EX', PREVIEW_TTL_SECONDS)
      .set(userKey(user.id), token, 'EX', PREVIEW_TTL_SECONDS)
      .exec();
    return preview;
  }

  async confirm(token: string, status: QuestionStatus, user: AuthUser): Promise<ImportResult> {
    const record = await this.load(token, user);
    if (!record.zipKey) {
      throw new AppException(
        ErrorCode.QUESTION_IMPORT_HAS_ERRORS,
        undefined,
        record.preview.errors,
      );
    }

    // Bấm xác nhận hai lần (hoặc hai tab) không được nhập trùng
    const locked = await this.redis.set(lockKey(token), user.id, 'EX', LOCK_TTL_SECONDS, 'NX');
    if (locked !== 'OK') throw new AppException(ErrorCode.QUESTION_IMPORT_IN_PROGRESS);

    try {
      const object = await this.storage.get(record.zipKey);
      if (!object) throw new AppException(ErrorCode.QUESTION_IMPORT_NOT_FOUND);
      const buffer = await streamToBuffer(object.body, IMPORT_LIMITS.zipBytes);

      // Kiểm tra lại với dữ liệu hiện tại: từ lúc xem trước có thể đã có người nhập trùng mã câu
      const analysis = await this.analyze(buffer);
      if (analysis.errors.length > 0) {
        throw new AppException(
          ErrorCode.QUESTION_IMPORT_HAS_ERRORS,
          'Ngân hàng câu hỏi đã thay đổi từ lúc xem trước, tệp có lỗi mới. Hãy tải lên lại',
          analysis.errors.slice(0, RESPONSE_ISSUE_LIMIT),
        );
      }

      const result = await this.commit(analysis, user.id, status);
      await this.discard(token);
      return result;
    } finally {
      await this.redis.del(lockKey(token));
    }
  }

  async issuesFile(token: string, user: AuthUser): Promise<Buffer> {
    const record = await this.load(token, user);
    return buildIssuesWorkbook(record.errors, record.warnings);
  }

  /** Đọc tệp .zip, kiểm tra toàn bộ; không ghi gì vào DB hay kho tệp */
  async analyze(buffer: Buffer): Promise<ImportAnalysis> {
    const zip = await SafeZip.open(
      buffer,
      { maxEntries: IMPORT_LIMITS.zipEntries, maxTotalBytes: IMPORT_LIMITS.zipTotalBytes },
      'Tệp .zip',
    );
    const located = this.locate(zip);

    const excel = await zip.read(located.excelName, IMPORT_LIMITS.xlsxBytes);
    // .xlsx cũng là tệp nén: giải nén thử toàn bộ (có giới hạn) trước khi đưa cho exceljs
    const inner = await SafeZip.open(
      excel,
      { maxEntries: IMPORT_LIMITS.xlsxInnerEntries, maxTotalBytes: IMPORT_LIMITS.xlsxInnerBytes },
      'Tệp .xlsx',
    );
    for (const name of inner.entries.keys()) await inner.read(name, IMPORT_LIMITS.xlsxInnerBytes);
    const workbook = await readWorkbook(excel);

    const catalog: ImportCatalog = {
      subjects: await this.loadSubjects(),
      takenCodes: await this.loadTakenCodes(
        workbook.questions.map((row) => row.cells.question_code),
      ),
      media: await this.inspectMedia(zip, located, [...workbook.groups, ...workbook.questions]),
    };
    const plan = validateImport(workbook, catalog, {
      // Sheet questions thiếu hoặc thiếu cột đã có lỗi riêng, không báo thêm "chưa có câu nào"
      reportEmpty: workbook.errors.length === 0,
    });

    return {
      plan,
      zip,
      media: catalog.media,
      errors: [...workbook.errors, ...plan.errors],
      warnings: [...located.warnings, ...workbook.warnings, ...plan.warnings],
    };
  }

  /**
   * Lưu tệp media lên kho rồi ghi nhóm, câu, phương án trong MỘT transaction: lỗi giữa chừng
   * thì không có câu nào được nhập, tệp đã lưu bị xóa lại.
   */
  async commit(
    analysis: ImportAnalysis,
    authorId: string,
    status: QuestionStatus,
  ): Promise<ImportResult> {
    if (analysis.errors.length > 0) {
      throw new AppException(
        ErrorCode.QUESTION_IMPORT_HAS_ERRORS,
        undefined,
        analysis.errors.slice(0, RESPONSE_ISSUE_LIMIT),
      );
    }

    const { plan } = analysis;
    const storedKeys = new Map<string, string>();
    const keyOf = (file: string | null) => (file ? (storedKeys.get(file) ?? null) : null);

    try {
      for (const name of plan.usedMedia) {
        const file = analysis.media.get(name);
        if (!file?.ext || !file.kind) throw invalidFile(`Tệp media/${name} không hợp lệ`);
        const limit = file.kind === 'audio' ? IMPORT_LIMITS.audioBytes : IMPORT_LIMITS.imageBytes;
        const data = await analysis.zip.read(file.entryName, limit);
        const key = `${QUESTION_MEDIA_KEY_PREFIX}${randomUUID()}.${file.ext}`;
        await this.storage.save(key, data, { contentType: QUESTION_MEDIA_TYPES[file.ext] });
        storedKeys.set(name, key);
      }

      // Tự sinh id để ghi bằng createMany (3 câu lệnh cho cả tệp) thay vì từng câu một
      const groupIds = new Map(plan.groups.map((group) => [group.code, randomUUID()]));
      const questions = plan.questions.map((question) => ({ ...question, id: randomUUID() }));

      await this.prisma.$transaction([
        this.prisma.questionGroup.createMany({
          data: plan.groups.map((group) => ({
            id: groupIds.get(group.code),
            topicId: group.topicId,
            authorId,
            skill: group.skill,
            part: group.part,
            passage: group.passage,
            transcript: group.transcript,
            audioKey: keyOf(group.audioFile),
            imageKey: keyOf(group.imageFile),
            status,
          })),
        }),
        this.prisma.question.createMany({
          data: questions.map((question) => ({
            id: question.id,
            code: question.code,
            topicId: question.topicId,
            authorId,
            groupId: question.groupCode ? (groupIds.get(question.groupCode) ?? null) : null,
            orderInGroup: question.orderInGroup,
            type: question.type,
            skill: question.skill,
            part: question.part,
            difficulty: question.difficulty,
            content: question.content,
            explanation: question.explanation,
            sampleAnswer: question.sampleAnswer,
            prepSeconds: question.prepSeconds,
            responseSeconds: question.responseSeconds,
            audioKey: keyOf(question.audioFile),
            imageKey: keyOf(question.imageFile),
            status,
          })),
        }),
        this.prisma.questionOption.createMany({
          data: questions.flatMap((question) =>
            question.options.map((option, orderIndex) => ({
              ...option,
              orderIndex,
              questionId: question.id,
            })),
          ),
        }),
      ]);
    } catch (error) {
      await Promise.all([...storedKeys.values()].map((key) => this.deleteQuietly(key)));
      // Vi phạm uq_questions_code: có người nhập cùng mã câu đúng lúc này
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(ErrorCode.QUESTION_CODE_TAKEN);
      }
      throw error;
    }

    return {
      groupCount: plan.groups.length,
      questionCount: plan.questions.length,
      mediaCount: storedKeys.size,
      status,
    };
  }

  /**
   * Tìm questions.xlsx (ở gốc .zip hoặc trong đúng một thư mục, khi nén cả thư mục) và các tệp
   * trong media/ cạnh nó. Bỏ qua tệp rác của macOS, tệp ẩn, tệp khóa của Excel (~$…).
   */
  private locate(zip: SafeZip): LocatedFiles {
    const names = [...zip.entries.keys()].filter((name) => {
      const base = baseName(name);
      return !name.startsWith('__MACOSX/') && !base.startsWith('.') && !base.startsWith('~$');
    });

    const excels = names.filter(
      (name) => name.toLowerCase().endsWith('.xlsx') && name.split('/').length <= 2,
    );
    if (excels.length === 0) {
      throw invalidFile('Không tìm thấy tệp .xlsx ở thư mục gốc của tệp .zip');
    }
    if (excels.length > 1) {
      throw invalidFile(`Tệp .zip có ${excels.length} tệp .xlsx, chỉ được có một`);
    }

    const [excelName] = excels;
    const mediaPrefix = (
      excelName.slice(0, excelName.lastIndexOf('/') + 1) + MEDIA_DIR
    ).toLowerCase();
    const media: LocatedFiles['media'] = new Map();
    const warnings: ImportIssue[] = [];

    for (const entryName of names) {
      if (!entryName.toLowerCase().startsWith(mediaPrefix)) continue;
      const name = entryName.slice(mediaPrefix.length);
      if (name.includes('/')) {
        warnings.push({
          sheet: 'media',
          row: null,
          column: null,
          message: `${entryName} nằm trong thư mục con của media/, sẽ bỏ qua`,
        });
        continue;
      }
      const key = name.toLowerCase();
      if (media.has(key)) {
        throw invalidFile(
          `Thư mục media/ có hai tệp trùng tên (không phân biệt hoa thường): ${name}`,
        );
      }
      const entry = zip.entries.get(entryName);
      media.set(key, { name, entryName, size: entry?.uncompressedSize ?? 0 });
    }

    return { excelName, media, warnings };
  }

  /**
   * Nhận dạng định dạng theo NỘI DUNG (không tin đuôi tệp) cho các tệp được dòng nào đó nhắc tới.
   * Tệp lớn hơn giới hạn không giải nén, để quy tắc báo lỗi dung lượng.
   */
  private async inspectMedia(
    zip: SafeZip,
    located: LocatedFiles,
    rows: { cells: { audio_file?: string; image_file?: string } }[],
  ): Promise<Map<string, MediaFileInfo>> {
    const referenced = new Set(
      rows.flatMap((row) =>
        [row.cells.audio_file, row.cells.image_file].flatMap((name) =>
          name ? [name.toLowerCase()] : [],
        ),
      ),
    );
    const maxBytes = Math.max(IMPORT_LIMITS.audioBytes, IMPORT_LIMITS.imageBytes);
    const result = new Map<string, MediaFileInfo>();

    for (const [key, file] of located.media) {
      const info: MediaFileInfo = { ...file, kind: null, ext: null };
      result.set(key, info);
      if (!referenced.has(key) || file.size > maxBytes) continue;

      try {
        // Giải nén cả tệp: phát hiện luôn tệp hỏng ngay ở bước xem trước
        const data = await zip.read(file.entryName, maxBytes);
        const sniffed = SNIFFED[(await fileTypeFromBuffer(data))?.mime ?? ''];
        if (sniffed) Object.assign(info, sniffed);
      } catch (error) {
        if (!(error instanceof AppException)) throw error;
        // Không giải nén được: giữ kind = null, quy tắc báo "không phải tệp hợp lệ"
      }
    }
    return result;
  }

  private async loadSubjects(): Promise<Map<string, SubjectInfo>> {
    const subjects = await this.prisma.subject.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        topics: { select: { id: true, name: true, skill: true, parts: true } },
      },
    });
    return new Map(subjects.map((subject) => [subject.code.toUpperCase(), subject]));
  }

  private async loadTakenCodes(values: (string | undefined)[]): Promise<Set<string>> {
    const codes = [
      ...new Set(values.flatMap((value) => (value ? [value.toUpperCase()] : []))),
    ].filter((code) => CODE_PATTERN.test(code));
    if (codes.length === 0) return new Set();

    const rows = await this.prisma.question.findMany({
      where: { code: { in: codes }, deletedAt: null },
      select: { code: true },
    });
    return new Set(rows.flatMap((row) => (row.code ? [row.code] : [])));
  }

  private toPreview(
    analysis: ImportAnalysis,
    base: Pick<ImportPreview, 'token' | 'fileName' | 'canConfirm'>,
  ): ImportPreview {
    const { plan, media } = analysis;

    const parts = new Map<string, ImportPartCount>();
    const partOf = (skill: ImportPartCount['skill'], part: number) => {
      const key = `${skill}-${part}`;
      let item = parts.get(key);
      if (!item) {
        item = {
          skill,
          part,
          name: findPartRule(skill, part)?.name ?? `Part ${part}`,
          groupCount: 0,
          questionCount: 0,
        };
        parts.set(key, item);
      }
      return item;
    };
    for (const group of plan.groups) partOf(group.skill, group.part).groupCount++;
    for (const question of plan.questions) partOf(question.skill, question.part).questionCount++;

    const fileName = (key: string | null) => (key ? (media.get(key)?.name ?? key) : null);
    const questions: ImportQuestionRow[] = plan.questions.map((question) => ({
      row: question.row,
      code: question.code,
      skill: question.skill,
      part: question.part,
      difficulty: question.difficulty,
      topic: question.topicName,
      groupCode: question.groupCode,
      orderInGroup: question.orderInGroup,
      content: excerpt(question.content, 120),
      audioFile: fileName(question.audioFile),
      imageFile: fileName(question.imageFile),
    }));

    return {
      ...base,
      expiresAt: new Date(Date.now() + PREVIEW_TTL_SECONDS * 1000).toISOString(),
      groupCount: plan.groups.length,
      questionCount: plan.questions.length,
      mediaCount: plan.usedMedia.size,
      errorCount: analysis.errors.length,
      warningCount: analysis.warnings.length,
      parts: [...parts.values()].sort(
        (a, b) => partOrder(a.skill, a.part) - partOrder(b.skill, b.part),
      ),
      errors: analysis.errors.slice(0, RESPONSE_ISSUE_LIMIT),
      warnings: analysis.warnings.slice(0, RESPONSE_ISSUE_LIMIT),
      questions,
    };
  }

  /** Phiên của người khác coi như không tồn tại (không lộ thông tin) */
  private async load(token: string, user: AuthUser): Promise<StoredImport> {
    const raw = await this.redis.get(recordKey(token));
    const record = raw ? (JSON.parse(raw) as StoredImport) : null;
    if (!record || record.userId !== user.id) {
      throw new AppException(ErrorCode.QUESTION_IMPORT_NOT_FOUND);
    }
    return record;
  }

  /** Xóa bản xem trước và tệp .zip tạm của nó */
  private async discard(token: string): Promise<void> {
    const raw = await this.redis.get(recordKey(token));
    if (!raw) return;
    const record = JSON.parse(raw) as StoredImport;
    if (record.zipKey) await this.deleteQuietly(record.zipKey);

    const pipeline = this.redis.multi().del(recordKey(token));
    if ((await this.redis.get(userKey(record.userId))) === token) {
      pipeline.del(userKey(record.userId));
    }
    await pipeline.exec();
  }

  // Dọn tệp là việc phụ: lỗi thì ghi log, không làm hỏng thao tác chính
  private async deleteQuietly(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch {
      this.logger.warn(`Không xóa được tệp ${key}, cần dọn tay`);
    }
  }
}
