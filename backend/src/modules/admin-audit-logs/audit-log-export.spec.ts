import { describe, expect, it } from 'vitest';
import { RoleCode } from '../../common/constants/roles.js';
import {
  auditExportFileName,
  buildAuditCsv,
  csvCell,
  formatVnTime,
  type AuditExportRow,
} from './audit-log-export.js';

const row = (overrides: Partial<AuditExportRow> = {}): AuditExportRow => ({
  createdAt: new Date('2026-11-22T07:03:05Z'),
  action: 'user.lock',
  entity: 'user',
  entityId: '7d0c6c2e-5d1f-4b8a-9a43-3f1c2e9d8b10',
  ipAddress: '127.0.0.1',
  actor: { fullName: 'Nguyễn Văn A', email: 'admin@example.com', role: RoleCode.ADMIN },
  ...overrides,
});

describe('csvCell', () => {
  it('giữ nguyên ô thường', () => {
    expect(csvCell('Khóa tài khoản')).toBe('Khóa tài khoản');
  });

  it('bọc nháy kép khi có dấu phẩy, nháy kép, xuống dòng', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('nói "xin chào"')).toBe('"nói ""xin chào"""');
    expect(csvCell('dòng 1\ndòng 2')).toBe('"dòng 1\ndòng 2"');
  });

  it('chặn CSV injection: ô bắt đầu bằng = + - @ thêm dấu nháy đơn', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+84900')).toBe("'+84900");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });
});

describe('buildAuditCsv', () => {
  it('BOM UTF-8, CRLF, giờ Việt Nam, nhãn tiếng Việt', () => {
    const csv = buildAuditCsv([row()]).toString('utf8');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const [header, line, end] = csv.slice(1).split('\r\n');
    expect(header).toBe(
      'Thời điểm,Người thực hiện,Email,Vai trò,Mã hành động,Hành động,Đối tượng,Mã đối tượng,Địa chỉ IP',
    );
    expect(line).toBe(
      '2026-11-22 14:03:05,Nguyễn Văn A,admin@example.com,Quản trị viên,user.lock,Khóa tài khoản,' +
        'Người dùng,7d0c6c2e-5d1f-4b8a-9a43-3f1c2e9d8b10,127.0.0.1',
    );
    expect(end).toBe('');
  });

  it('tài khoản đã xóa, mã chưa có nhãn, thiếu IP', () => {
    const csv = buildAuditCsv([
      row({ actor: null, action: 'exam.publish', entity: 'exam', entityId: null, ipAddress: null }),
    ]).toString('utf8');
    expect(csv.split('\r\n')[1]).toBe(
      '2026-11-22 14:03:05,(tài khoản đã xóa),,,exam.publish,exam.publish,exam,,',
    );
  });
});

describe('formatVnTime, auditExportFileName', () => {
  it('đổi UTC sang giờ Việt Nam (UTC+7), kể cả qua ngày', () => {
    expect(formatVnTime(new Date('2026-11-22T18:30:00Z'))).toBe('2026-11-23 01:30:00');
  });

  it('tên tệp theo giờ Việt Nam', () => {
    const now = new Date('2026-11-22T07:03:05Z');
    expect(auditExportFileName('xlsx', now)).toBe('audit-logs-20261122-1403.xlsx');
    expect(auditExportFileName('csv', now)).toBe('audit-logs-20261122-1403.csv');
  });
});
