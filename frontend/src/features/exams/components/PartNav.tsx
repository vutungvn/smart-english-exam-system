import { DropdownMenu } from 'radix-ui';
import { CircleAlert, CircleCheck, ListPlus, Plus } from 'lucide-react';
import type { Skill } from '@/api/generated';
import { SKILL_META } from '@/features/question-bank/toeic';
import { cn } from '@/lib/utils';
import { partsOfScale, quotaOf } from '../exam-meta';
import type { ExamSectionItem, ScoringScale } from '@/api/generated';

interface PartNavProps {
  sections: ExamSectionItem[];
  scale: ScoringScale;
  selectedId?: string;
  readOnly: boolean;
  onSelect: (sectionId: string) => void;
  onAddPart: (skill: Skill, part: number) => void;
  onAddAllParts: () => void;
}

function Progress({ section, scale }: { section: ExamSectionItem; scale: ScoringScale }) {
  const expected = quotaOf(scale, section.skill, section.part);
  const ok = expected === null ? section.questionCount > 0 : section.questionCount === expected;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums',
        ok ? 'text-success' : 'text-amber-600',
      )}
    >
      {expected === null ? section.questionCount : `${section.questionCount}/${expected}`}
      {ok ? <CircleCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}
    </span>
  );
}

// Danh sách Part của đề: thẻ dọc ở màn rộng, dải tab cuộn ngang ở màn hẹp
export function PartNav(props: PartNavProps) {
  const { sections, scale, selectedId, onSelect } = props;
  const skills = [...new Set(sections.map((s) => s.skill))];

  return (
    <>
      <nav
        aria-label="Các Part trong đề"
        className="hidden rounded-3xl border border-border bg-white p-4 shadow-2xs lg:block"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="font-bold text-foreground">Cấu trúc đề</h2>
          <span className="text-xs text-subtle">{sections.length} Part</span>
        </div>

        {sections.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-subtle">
            Chưa có Part
          </p>
        ) : (
          skills.map((skill) => (
            <div key={skill} className="mt-4">
              <p className="px-1 text-[11px] font-bold tracking-wider text-subtle uppercase">
                {SKILL_META[skill].label}
              </p>
              <ul className="mt-1.5 space-y-1">
                {sections
                  .filter((s) => s.skill === skill)
                  .map((section) => {
                    const active = section.id === selectedId;
                    return (
                      <li key={section.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(section.id)}
                          aria-current={active ? 'true' : undefined}
                          className={cn(
                            'relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-primary/30',
                            active ? 'bg-accent font-semibold text-brand' : 'hover:bg-slate-50',
                          )}
                        >
                          {active && (
                            <span className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-primary" />
                          )}
                          <span
                            className={cn('size-2 shrink-0 rounded-full', SKILL_META[skill].dot)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block">Part {section.part}</span>
                            <span className="block truncate text-xs font-normal text-subtle">
                              {section.name}
                            </span>
                          </span>
                          <Progress section={section} scale={scale} />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))
        )}

        <div className="mt-4 border-t border-border pt-4">
          <AddPartMenu {...props} />
        </div>
      </nav>

      {/* Màn hẹp: tab cuộn ngang, nút thêm Part ở cuối */}
      <nav
        aria-label="Các Part trong đề"
        className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:hidden"
      >
        <div className="flex w-max items-center gap-2 pb-1">
          {sections.map((section) => {
            const active = section.id === selectedId;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelect(section.id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-2 text-sm whitespace-nowrap transition-colors',
                  active
                    ? 'border-primary bg-accent font-semibold text-brand'
                    : 'border-border bg-white text-slate-700',
                )}
              >
                <span className={cn('size-2 rounded-full', SKILL_META[section.skill].dot)} />
                {section.skill.charAt(0)}
                {section.part}
                <Progress section={section} scale={scale} />
              </button>
            );
          })}
          <AddPartMenu {...props} compact />
        </div>
      </nav>
    </>
  );
}

function AddPartMenu({
  sections,
  scale,
  readOnly,
  onAddPart,
  onAddAllParts,
  compact = false,
}: PartNavProps & { compact?: boolean }) {
  const missing = partsOfScale(scale).filter(
    (rule) => !sections.some((s) => s.skill === rule.skill && s.part === rule.part),
  );
  if (readOnly) return null;
  if (missing.length === 0) {
    return compact ? null : (
      <p className="flex items-center gap-1.5 px-1 text-xs text-subtle">
        <CircleCheck className="size-3.5 text-success" />
        Đã đủ các Part của loại đề này
      </p>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'flex items-center justify-center gap-1.5 text-sm font-semibold text-brand transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-primary/30',
          compact
            ? 'rounded-full border border-dashed border-primary/40 px-3 py-2 whitespace-nowrap'
            : 'h-10 w-full rounded-xl border border-dashed border-primary/40',
        )}
      >
        <Plus className="size-4" />
        Thêm Part
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 max-h-80 w-64 overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-xl shadow-slate-900/10"
        >
          {scale !== 'PERCENT' && missing.length > 1 && (
            <>
              <DropdownMenu.Item
                onSelect={onAddAllParts}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand outline-none data-highlighted:bg-accent"
              >
                <ListPlus className="size-4" />
                Thêm tất cả {missing.length} Part còn thiếu
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
            </>
          )}
          {missing.map((rule) => (
            <DropdownMenu.Item
              key={`${rule.skill}-${rule.part}`}
              onSelect={() => onAddPart(rule.skill, rule.part)}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none data-highlighted:bg-accent"
            >
              <span className={cn('size-2 shrink-0 rounded-full', SKILL_META[rule.skill].dot)} />
              <span className="min-w-0">
                <span className="block font-medium text-foreground">
                  {SKILL_META[rule.skill].label} · Part {rule.part}
                </span>
                <span className="block truncate text-xs text-subtle">{rule.name}</span>
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
