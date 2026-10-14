import { Layers } from 'lucide-react';
import type { ImportPartCount } from '@/api/generated';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { CardTitle, ImportCard } from './ImportCard';

/** Số nhóm, số câu hợp lệ theo từng Part (đã sắp L1…L4, R5…R7, S1…S5, W1…W3) */
export function PartSummary({ parts }: { parts: ImportPartCount[] }) {
  const groups = parts.reduce((sum, part) => sum + part.groupCount, 0);
  const questions = parts.reduce((sum, part) => sum + part.questionCount, 0);

  return (
    <ImportCard>
      <CardTitle icon={Layers} title="Theo Part" />
      {parts.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-subtle">Chưa có câu hợp lệ nào.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold tracking-wider text-subtle uppercase">
              <th className="px-5 py-3 font-semibold">Part</th>
              <th className="px-3 py-3 text-right font-semibold">Nhóm</th>
              <th className="px-5 py-3 text-right font-semibold">Câu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parts.map((part) => (
              <tr key={`${part.skill}-${part.part}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <SkillPill skill={part.skill} />
                    <span className="font-semibold text-foreground">Part {part.part}</span>
                  </div>
                  <p className="mt-1 text-xs text-subtle">{part.name}</p>
                </td>
                <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                  {part.groupCount || '—'}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">
                  {part.questionCount}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-accent/60 font-bold text-foreground">
              <td className="px-5 py-3">Tổng</td>
              <td className="px-3 py-3 text-right tabular-nums">{groups}</td>
              <td className="px-5 py-3 text-right tabular-nums">{questions}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </ImportCard>
  );
}
