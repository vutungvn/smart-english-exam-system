import { useState } from 'react';
import { Link } from 'react-router';
import { Download, EyeOff, Loader2, Scale } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toApiError } from '@/api/errors';
import {
  useGetAssessmentAgreementQuery,
  type AgreementPair,
  type AgreementRow,
  type AgreementStats,
} from '@/api/generated';
import { FormAlert } from '@/components/form/FormAlert';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { saveBlob } from '@/lib/download';
import { SegmentedControl } from '@/features/question-bank/components/FilterControls';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { cn } from '@/lib/utils';
import { GRADING_PATH, gradingDetailPath, questionLabel, type GradingScope } from '../grading-meta';
import { useNextCalibration } from '../use-next-calibration';

type Sample = 'BLIND' | 'ALL';

/** Màu 2 chuỗi (đã kiểm tra tương phản và mù màu): AI xanh, giáo viên tím như ở màn chấm */
const AI_COLOR = '#0284c7';
const TEACHER_COLOR = '#7c3aed';
const TOP_PAIRS = 10;

const percent = (value: number) => `${value.toLocaleString('vi-VN')}%`;
const rowLabel = (row: AgreementRow) =>
  row.skill === null
    ? 'Tất cả'
    : `${row.skill === 'SPEAKING' ? 'Speaking' : 'Writing'}${row.part === null ? '' : ` Part ${row.part}`}`;

/** Độ lệch có dấu thành câu dễ hiểu */
function biasText(bias: number): string {
  if (bias === 0) return 'Không lệch về phía nào';
  return `AI chấm ${bias > 0 ? 'cao' : 'thấp'} hơn ${percent(Math.abs(bias))} thang`;
}

/**
 * Độ lệch AI chấm so với giáo viên (SPRINT-90): mặc định chỉ tính câu chấm đối chiếu (giáo viên
 * chưa thấy điểm AI) để mẫu không bị lệch; số liệu theo kỹ năng, Part, xuất CSV đưa vào báo cáo
 */
export function AgreementPage() {
  const [sample, setSample] = useState<Sample>('BLIND');
  const [scope, setScope] = useState<GradingScope>('ALL');
  const { data, error, isLoading, isFetching, refetch } = useGetAssessmentAgreementQuery(
    { sample, scope },
    { refetchOnMountOrArgChange: true },
  );
  const next = useNextCalibration();
  const stats = data?.data;

  return (
    <div className="space-y-6">
      <title>Độ lệch AI chấm – Smart English Exam</title>
      <PageHeader
        backTo={{ label: 'Chấm lại bài', to: GRADING_PATH }}
        title="Độ lệch AI chấm"
        description="So điểm AI với điểm giáo viên trên cùng câu Speaking/Writing. Chấm đối chiếu (không thấy điểm AI) cho số liệu khách quan nhất."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!stats || stats.overall.count === 0}
              onClick={() => stats && exportCsv(stats, sample)}
              className="h-10 rounded-xl px-4"
            >
              <Download />
              Xuất CSV
            </Button>
            <Button
              type="button"
              onClick={() => void next.start({ scope })}
              disabled={next.loading}
              className="h-10 rounded-xl px-4"
            >
              {next.loading ? <Loader2 className="animate-spin" /> : <EyeOff />}
              Chấm đối chiếu
            </Button>
          </div>
        }
      />

      {next.message && <FormAlert message={next.message} onClose={next.clearMessage} />}

      <section
        aria-label="Bộ lọc"
        className="flex flex-col gap-3 rounded-3xl border border-border bg-white p-4 shadow-2xs sm:flex-row sm:flex-wrap sm:p-5"
      >
        <SegmentedControl<Sample>
          label="Mẫu tính"
          value={sample}
          onChange={(value) => setSample(value ?? 'BLIND')}
          options={[
            { value: 'BLIND', label: 'Chấm đối chiếu' },
            { value: 'ALL', label: 'Mọi câu giáo viên đã chấm' },
          ]}
          className="grid grid-cols-2 sm:flex"
        />
        <SegmentedControl<GradingScope>
          label="Phạm vi đề"
          value={scope}
          onChange={(value) => setScope(value ?? 'ALL')}
          options={[
            { value: 'ALL', label: 'Mọi đề' },
            { value: 'MINE', label: 'Đề của tôi' },
          ]}
          className="grid grid-cols-2 sm:flex"
        />
      </section>
      {sample === 'ALL' && (
        <p className="text-sm text-muted-foreground">
          Gồm cả câu chấm lại vì AI lỗi hoặc học viên khiếu nại (giáo viên đã thấy điểm AI): mẫu
          thiên về câu AI chấm sai, chỉ nên dùng để tham khảo.
        </p>
      )}

      {isLoading ? (
        <div aria-hidden className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((key) => (
            <div key={key} className="h-28 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      ) : error && !data ? (
        <div className="rounded-3xl border border-border bg-white">
          <ErrorState message={toApiError(error).message} onRetry={() => void refetch()} />
        </div>
      ) : !stats || stats.overall.count === 0 ? (
        <div className="rounded-3xl border border-border bg-white">
          <EmptyState
            icon={Scale}
            title="Chưa có câu nào để so"
            description={
              sample === 'BLIND'
                ? 'Bấm "Chấm đối chiếu" để chấm các câu AI đã chấm mà không xem điểm AI. Nên chấm 20–30 câu để số liệu đủ tin cậy.'
                : 'Chưa có câu nào vừa có điểm AI vừa có điểm giáo viên.'
            }
          />
        </div>
      ) : (
        <div className={cn('space-y-6', isFetching && 'opacity-70')} aria-busy={isFetching}>
          <Overview row={stats.overall} />
          <PartChart rows={stats.byPart} />
          <AgreementTable stats={stats} />
          <PairList pairs={stats.pairs.slice(0, TOP_PAIRS)} total={stats.pairs.length} />
        </div>
      )}
    </div>
  );
}

function Overview({ row }: { row: AgreementRow }) {
  const tiles = [
    {
      label: 'Số câu so sánh',
      value: row.count.toLocaleString('vi-VN'),
      hint: 'có cả điểm AI và GV',
    },
    {
      label: 'Lệch tuyệt đối TB',
      value: percent(row.maePercent),
      hint: `${row.mae.toLocaleString('vi-VN')} điểm mỗi câu`,
    },
    { label: 'Độ lệch có dấu', value: percent(row.biasPercent), hint: biasText(row.biasPercent) },
    { label: 'Khớp tuyệt đối', value: percent(row.exactRate), hint: 'AI cho đúng điểm GV' },
    { label: 'Lệch ≤ 1 điểm', value: percent(row.withinOneRate), hint: 'chấp nhận được' },
  ];
  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-3xl border border-border bg-white p-5 shadow-2xs">
          <dt className="text-sm text-muted-foreground">{tile.label}</dt>
          <dd className="mt-1 text-3xl font-bold text-foreground tabular-nums">{tile.value}</dd>
          <dd className="mt-1 text-xs text-subtle">{tile.hint}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Điểm trung bình AI và giáo viên theo Part (% thang): hai cột cạnh nhau, cùng một trục */
function PartChart({ rows }: { rows: AgreementRow[] }) {
  const chartRows = rows.map((row) => ({
    name: rowLabel(row).replace('Speaking', 'S').replace('Writing', 'W').replace(' Part ', ''),
    label: rowLabel(row),
    count: row.count,
    ai: row.aiMeanPercent,
    teacher: row.teacherMeanPercent,
  }));
  return (
    <section
      aria-label="Điểm trung bình theo Part"
      className="rounded-3xl border border-border bg-white p-5 shadow-2xs"
    >
      <h2 className="font-bold text-foreground">Điểm trung bình theo Part (% thang)</h2>
      <p className="text-sm text-muted-foreground">
        Hai cột càng sát nhau thì AI chấm càng gần giáo viên. Số liệu chi tiết ở bảng bên dưới.
      </p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} barGap={2} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--subtle)', fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fill: 'var(--subtle)', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent)', fillOpacity: 0.5 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as (typeof chartRows)[number] | undefined;
                if (!active || !row) return null;
                return (
                  <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-lg shadow-slate-900/10">
                    <p className="font-semibold text-foreground">
                      {row.label} · {row.count} câu
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-foreground">
                      <span className="size-2.5 rounded-sm" style={{ background: AI_COLOR }} />
                      AI: <span className="font-semibold tabular-nums">{percent(row.ai)}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-foreground">
                      <span className="size-2.5 rounded-sm" style={{ background: TEACHER_COLOR }} />
                      Giáo viên:{' '}
                      <span className="font-semibold tabular-nums">{percent(row.teacher)}</span>
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)', paddingBottom: 8 }}
            />
            <Bar dataKey="ai" name="AI" fill={AI_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar
              dataKey="teacher"
              name="Giáo viên"
              fill={TEACHER_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function AgreementTable({ stats }: { stats: AgreementStats }) {
  const rows = [...stats.bySkill, ...stats.byPart].sort(
    (a, b) =>
      (a.skill === 'SPEAKING' ? 0 : 1) - (b.skill === 'SPEAKING' ? 0 : 1) ||
      (a.part ?? 0) - (b.part ?? 0),
  );
  const cell = 'px-4 py-2.5 text-right tabular-nums';
  return (
    <section
      aria-label="Bảng độ lệch theo Part"
      className="overflow-hidden rounded-3xl border border-border bg-white shadow-2xs"
    >
      <h2 className="border-b border-border px-5 py-4 font-bold text-foreground">
        Độ lệch theo kỹ năng và Part
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-sm">
          <thead className="bg-slate-50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Nhóm</th>
              <th className={cn(cell, 'font-semibold')}>Số câu</th>
              <th className={cn(cell, 'font-semibold')}>Lệch TB (điểm)</th>
              <th className={cn(cell, 'font-semibold')}>Lệch TB (% thang)</th>
              <th className={cn(cell, 'font-semibold')}>Có dấu (AI − GV)</th>
              <th className={cn(cell, 'font-semibold')}>Khớp</th>
              <th className={cn(cell, 'font-semibold')}>Lệch ≤ 1</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...rows, stats.overall].map((row) => (
              <tr
                key={`${row.skill}-${row.part}`}
                className={cn(row.part === null && 'bg-slate-50/60 font-semibold')}
              >
                <td className="px-4 py-2.5 text-foreground">{rowLabel(row)}</td>
                <td className={cell}>{row.count}</td>
                <td className={cell}>{row.mae.toLocaleString('vi-VN')}</td>
                <td className={cell}>{percent(row.maePercent)}</td>
                <td className={cell}>
                  {row.biasPercent > 0 ? '+' : ''}
                  {percent(row.biasPercent)}
                </td>
                <td className={cell}>{percent(row.exactRate)}</td>
                <td className={cell}>{percent(row.withinOneRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PairList({ pairs, total }: { pairs: AgreementPair[]; total: number }) {
  return (
    <section
      aria-label="Câu lệch nhiều nhất"
      className="overflow-hidden rounded-3xl border border-border bg-white shadow-2xs"
    >
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-bold text-foreground">Câu lệch nhiều nhất</h2>
        <p className="text-sm text-muted-foreground">
          {pairs.length} / {total} câu, lệch nhiều nhất trước. Xem lại để chỉnh rubric, prompt AI;
          đủ danh sách trong tệp CSV.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {pairs.map((pair) => (
          <li key={pair.answerId}>
            <Link
              to={gradingDetailPath(pair.answerId)}
              className="flex flex-col gap-1 px-5 py-3 hover:bg-accent/40 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{pair.examTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {questionLabel(pair.skill, pair.part, pair.questionNumber)}
                  {pair.reviewerName && ` · ${pair.reviewerName}`}
                  {pair.blindReview && ' · chấm đối chiếu'}
                </p>
              </div>
              <p className="text-sm tabular-nums">
                <span style={{ color: AI_COLOR }} className="font-semibold">
                  AI {pair.aiScore}
                </span>
                {' · '}
                <span style={{ color: TEACHER_COLOR }} className="font-semibold">
                  GV {pair.teacherScore}
                </span>
                <span className="text-muted-foreground"> / {pair.maxScore}</span>
                <span
                  className={cn(
                    'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold',
                    pair.diff === 0
                      ? 'bg-success-soft text-success'
                      : 'bg-slate-100 text-slate-700',
                  )}
                >
                  {pair.diff === 0 ? 'khớp' : `${pair.diff > 0 ? '+' : ''}${pair.diff}`}
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Excel nhận UTF-8 (tiếng Việt) khi tệp CSV bắt đầu bằng BOM */
const BOM = String.fromCharCode(0xfeff);

/** CSV cho báo cáo: bảng tổng hợp theo Part rồi toàn bộ cặp điểm (Excel mở được tiếng Việt nhờ BOM) */
function exportCsv(stats: AgreementStats, sample: Sample) {
  const escape = (value: string | number | boolean | null) => {
    const text = value === null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const line = (values: (string | number | boolean | null)[]) => values.map(escape).join(',');
  const summary = [...stats.bySkill, ...stats.byPart, stats.overall];
  const lines = [
    line([`Mẫu: ${sample === 'BLIND' ? 'chấm đối chiếu' : 'mọi câu giáo viên đã chấm'}`]),
    line([
      'Nhóm',
      'Số câu',
      'MAE (điểm)',
      'MAE (%)',
      'Lệch có dấu (%)',
      'Khớp (%)',
      'Lệch ≤1 (%)',
      'AI TB (%)',
      'GV TB (%)',
    ]),
    ...summary.map((row) =>
      line([
        rowLabel(row),
        row.count,
        row.mae,
        row.maePercent,
        row.biasPercent,
        row.exactRate,
        row.withinOneRate,
        row.aiMeanPercent,
        row.teacherMeanPercent,
      ]),
    ),
    '',
    line([
      'Đề',
      'Kỹ năng',
      'Part',
      'Câu',
      'AI',
      'GV',
      'Thang',
      'AI − GV',
      'Chấm đối chiếu',
      'Giáo viên',
      'Thời điểm',
    ]),
    ...stats.pairs.map((pair) =>
      line([
        pair.examTitle,
        pair.skill,
        pair.part,
        pair.questionNumber,
        pair.aiScore,
        pair.teacherScore,
        pair.maxScore,
        pair.diff,
        pair.blindReview,
        pair.reviewerName,
        pair.reviewedAt,
      ]),
    ),
  ];
  saveBlob(
    new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
    `do-lech-ai-cham-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}
