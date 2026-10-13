import ExcelJS from 'exceljs';
import type { CellValue, Worksheet } from 'exceljs';
import {
  GROUP_COLUMNS,
  IMPORT_LIMITS,
  QUESTION_COLUMNS,
  REQUIRED_GROUP_COLUMNS,
  REQUIRED_QUESTION_COLUMNS,
  SHEET,
  type GroupColumn,
  type QuestionColumn,
  type SheetName,
} from './import-format.js';
import type { ImportIssue } from './question-import.types.js';
import { invalidFile } from './safe-zip.js';

/** Một dòng dữ liệu: số dòng đúng như Excel hiển thị (dòng 1 là tiêu đề) và giá trị chuỗi đã trim */
export interface SheetRow<C extends string> {
  row: number;
  cells: Partial<Record<C, string>>;
}

export interface ReadWorkbookResult {
  groups: SheetRow<GroupColumn>[];
  questions: SheetRow<QuestionColumn>[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

/** "Question Code", "question-code", "question_code*" → "question_code" */
function normalizeHeader(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[\s-]+/g, '_');
}

/** Giá trị ô về chuỗi: rich text, công thức (lấy kết quả), siêu liên kết (lấy chữ hiển thị) */
export function cellText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('formula' in value || 'sharedFormula' in value) {
    return 'result' in value ? cellText(value.result) : '';
  }
  if ('text' in value && typeof value.text === 'string') return value.text;
  return '';
}

function clean(text: string): string {
  // Xuống dòng trong ô (Alt+Enter) giữ lại dạng \n; chuẩn hóa NFC để so tên chủ đề tiếng Việt
  return text.replace(/\r\n?/g, '\n').normalize('NFC').trim();
}

function findSheet(workbook: ExcelJS.Workbook, name: SheetName): Worksheet | undefined {
  return workbook.worksheets.find((sheet) => sheet.name.trim().toLowerCase() === name);
}

function readSheet<C extends string>(
  sheet: Worksheet,
  name: SheetName,
  columns: readonly C[],
  required: readonly C[],
  maxRows: number,
  result: Pick<ReadWorkbookResult, 'errors' | 'warnings'>,
): SheetRow<C>[] {
  // Dòng 1 là tiêu đề: cột nào ở vị trí nào (người soạn có thể đổi thứ tự cột)
  const columnAt = new Map<number, C>();
  const seen = new Set<string>();
  sheet.getRow(1).eachCell((cell, index) => {
    const header = normalizeHeader(cellText(cell.value));
    if (!header) return;
    if (seen.has(header)) {
      result.errors.push({ sheet: name, row: 1, column: header, message: 'Cột bị lặp lại' });
      return;
    }
    seen.add(header);
    const column = columns.find((item) => item === header);
    if (column) columnAt.set(index, column);
    else {
      result.warnings.push({
        sheet: name,
        row: 1,
        column: header,
        message: 'Cột không thuộc tệp mẫu, sẽ bị bỏ qua',
      });
    }
  });

  const missing = required.filter((column) => !seen.has(column));
  for (const column of missing) {
    result.errors.push({ sheet: name, row: 1, column, message: 'Thiếu cột bắt buộc' });
  }
  // Thiếu cột bắt buộc thì không đọc dòng: dòng nào cũng sẽ lỗi cùng một kiểu
  if (missing.length > 0) return [];

  const rows: SheetRow<C>[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells: Partial<Record<C, string>> = {};
    let empty = true;
    for (const [index, column] of columnAt) {
      const text = clean(cellText(row.getCell(index).value));
      if (text) {
        cells[column] = text;
        empty = false;
      }
    }
    // Dòng chỉ có định dạng (tô màu, kẻ khung) mà không có dữ liệu thì bỏ qua
    if (!empty) rows.push({ row: rowNumber, cells });
  });

  if (rows.length > maxRows) {
    throw invalidFile(
      `Sheet ${name} có ${rows.length} dòng, tối đa ${maxRows} dòng mỗi tệp. Hãy chia thành nhiều tệp`,
    );
  }
  return rows;
}

/** Đọc 2 sheet groups, questions. Sheet groups không bắt buộc (tệp chỉ có câu đơn) */
export async function readWorkbook(buffer: Buffer): Promise<ReadWorkbookResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw invalidFile('Tệp .xlsx bị hỏng hoặc không phải tệp Excel');
  }

  const result: ReadWorkbookResult = { groups: [], questions: [], errors: [], warnings: [] };

  const questionSheet = findSheet(workbook, SHEET.questions);
  if (!questionSheet) {
    result.errors.push({
      sheet: 'file',
      row: null,
      column: null,
      message: 'Tệp .xlsx thiếu sheet "questions"',
    });
    return result;
  }

  const groupSheet = findSheet(workbook, SHEET.groups);
  if (groupSheet) {
    result.groups = readSheet(
      groupSheet,
      SHEET.groups,
      GROUP_COLUMNS,
      REQUIRED_GROUP_COLUMNS,
      IMPORT_LIMITS.groupRows,
      result,
    );
  }
  result.questions = readSheet(
    questionSheet,
    SHEET.questions,
    QUESTION_COLUMNS,
    REQUIRED_QUESTION_COLUMNS,
    IMPORT_LIMITS.questionRows,
    result,
  );

  return result;
}
