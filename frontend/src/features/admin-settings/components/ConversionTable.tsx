import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Lock, Plus, Trash2 } from 'lucide-react';
import type { SettingConversionRule, SettingRange } from '@/api/generated';
import { FieldError } from '@/components/form/FieldError';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/features/question-bank/form/styles';
import { cn } from '@/lib/utils';
import type { ScoringSkillMeta } from '../labels';
import { suggestPoint, type ScoringForm } from '../schemas';

interface ConversionTableProps {
  form: UseFormReturn<ScoringForm>;
  skill: ScoringSkillMeta;
  rule: SettingConversionRule;
  count: SettingRange;
}

const COLUMNS = 'grid grid-cols-[1fr_1fr_5rem] items-start gap-2';

/** Bảng mốc của một kỹ năng. Mốc đầu và mốc cuối cố định theo thang điểm nên không sửa, không xóa */
export function ConversionTable({ form, skill, rule, count }: ConversionTableProps) {
  const name = skill.value;
  const { fields, insert, remove } = useFieldArray({ control: form.control, name });
  const errors = form.formState.errors[name];
  const last = fields.length - 1;
  const full = fields.length >= count.max;

  // Luật so với mốc trước/sau: đổi một ô thì kiểm tra lại cả bảng
  const recheck = () => void form.trigger(name);

  const insertAfter = (index: number) => {
    const rows = form.getValues(name);
    insert(index + 1, suggestPoint(rows[index], rows[index + 1], rule.step), {
      focusName: `${name}.${index + 1}.raw`,
    });
    recheck();
  };

  return (
    <div>
      <div className={cn(COLUMNS, 'px-1 pb-2 text-xs font-semibold text-slate-700')}>
        <span>{skill.rawLabel}</span>
        <span>Điểm quy đổi</span>
        <span className="text-right">Thao tác</span>
      </div>

      <ul className="space-y-2">
        {fields.map((field, index) => {
          const fixed = index === 0 || index === last;
          const rowErrors = errors?.[index];
          const position = `mốc ${index + 1}`;
          return (
            <li key={field.id} className={COLUMNS}>
              {(['raw', 'score'] as const).map((column) => (
                <div key={column} className="min-w-0 space-y-1">
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    readOnly={fixed}
                    aria-label={`${column === 'raw' ? skill.rawLabel : 'Điểm quy đổi'}, ${position}`}
                    aria-invalid={!!rowErrors?.[column]}
                    className={cn(inputClass, 'tabular-nums read-only:bg-slate-50')}
                    {...form.register(`${name}.${index}.${column}`, { onChange: recheck })}
                  />
                  <FieldError message={rowErrors?.[column]?.message} />
                </div>
              ))}
              <div className="flex h-10 items-center justify-end gap-1">
                {index < last && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={full}
                    aria-label={`Chèn mốc sau ${position}`}
                    title={full ? `Tối đa ${count.max} mốc` : 'Chèn mốc sau'}
                    onClick={() => insertAfter(index)}
                  >
                    <Plus />
                  </Button>
                )}
                {fixed ? (
                  <span
                    title="Mốc đầu và mốc cuối cố định"
                    className="flex size-8 items-center justify-center text-subtle"
                  >
                    <Lock aria-hidden className="size-3.5" />
                    <span className="sr-only">Mốc cố định</span>
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-danger-soft hover:text-destructive"
                    aria-label={`Xóa ${position}`}
                    title="Xóa mốc"
                    onClick={() => {
                      remove(index);
                      recheck();
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 px-1 text-xs text-subtle">
        {fields.length}/{count.max} mốc · điểm từ {rule.minScore} đến {rule.maxScore}, bước{' '}
        {rule.step}
      </p>
      <FieldError message={errors?.root?.message ?? errors?.message} />
    </div>
  );
}
