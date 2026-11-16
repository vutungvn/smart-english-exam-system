import { ChartNoAxesColumn, CircleCheck, Info, Star, Target } from 'lucide-react';
import type { StudentProfile } from '@/api/generated';
import { LEVEL_LABELS } from '../format';
import { SectionCard } from './SectionCard';

// Năng lực do hệ thống tính từ bài thi thử: chỉ xem, học viên không tự sửa
export function AbilityCard({ student }: { student: StudentProfile }) {
  const { currentLevel, currentScore, targetScore } = student;
  const progress =
    currentScore !== null && targetScore
      ? Math.min(100, Math.round((currentScore / targetScore) * 100))
      : null;

  const rows = [
    {
      icon: Star,
      label: 'Trình độ',
      value: currentLevel ? (
        <span className="rounded-lg border border-border bg-white px-2.5 py-0.5 font-semibold text-foreground">
          {LEVEL_LABELS[currentLevel]}
        </span>
      ) : (
        <span className="text-subtle">Chưa xác định</span>
      ),
    },
    {
      icon: CircleCheck,
      label: 'Điểm LR gần nhất',
      value:
        currentScore !== null ? (
          <span>
            <span className="font-bold text-primary">{currentScore}</span>
            <span className="text-subtle"> / 990</span>
          </span>
        ) : (
          <span className="text-subtle">Chưa có bài thi</span>
        ),
    },
    {
      icon: Target,
      label: 'Mục tiêu',
      value: targetScore ? (
        <span className="font-bold text-foreground">{targetScore} điểm</span>
      ) : (
        <span className="text-subtle">Chưa đặt</span>
      ),
    },
  ];

  return (
    <SectionCard
      icon={ChartNoAxesColumn}
      title="Năng lực hiện tại"
      className="flex-1"
      action={
        <span className="rounded-md bg-background px-2 py-0.5 text-xs font-medium text-subtle">
          Hệ thống
        </span>
      }
    >
      <ul className="space-y-3">
        {rows.map(({ icon: Icon, label, value }) => (
          <li
            key={label}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-3 text-muted-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white text-primary shadow-2xs">
                <Icon className="size-4" />
              </span>
              {label}
            </span>
            {value}
          </li>
        ))}
      </ul>

      {progress !== null && currentScore !== null && targetScore && (
        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">Tiến độ đạt mục tiêu</span>
            <span className="font-bold text-primary">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-skill-listening"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-subtle">
            <span>Hiện tại: {currentScore}đ</span>
            <span>Còn thiếu: {Math.max(0, targetScore - currentScore)}đ</span>
          </div>
        </div>
      )}

      <p className="mt-5 flex items-center gap-1.5 text-xs text-subtle">
        <Info className="size-3.5" />
        Cập nhật tự động sau mỗi bài thi thử
      </p>
    </SectionCard>
  );
}
