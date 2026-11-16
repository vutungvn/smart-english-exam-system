import {
  ArrowRight,
  Check,
  FilePlus2,
  FileText,
  Lightbulb,
  Search,
  ToggleRight,
} from 'lucide-react';
import type { ImportResult } from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/features/question-bank/components/Pills';
import { QUESTION_LIST_PATH } from '@/features/question-bank/paths';
import { ImportCard } from './ImportCard';

interface ResultStepProps {
  result: ImportResult;
  fileName: string;
  onImportAnother: () => void;
}

export function ResultStep({ result, fileName, onImportAnother }: ResultStepProps) {
  const tips = [
    {
      icon: Search,
      tile: 'bg-accent text-primary',
      text: 'Mở chi tiết câu, nhóm vừa nhập để xem lại ảnh và nghe thử audio.',
    },
    ...(result.status === 'DRAFT'
      ? [
          {
            icon: ToggleRight,
            tile: 'bg-emerald-50 text-emerald-700',
            text: 'Duyệt xong thì chuyển câu sang Đang dùng để đưa vào đề xuất bản.',
          },
        ]
      : []),
    {
      icon: FileText,
      tile: 'bg-violet-50 text-violet-700',
      text: 'Vào Đề thi để thêm các câu, nhóm câu vừa nhập vào đề.',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ImportCard className="px-5 py-8 text-center sm:px-10 sm:py-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success text-white shadow-[0_0_0_8px] shadow-success/15">
          <Check className="size-8" />
        </span>
        <h2 className="mt-5 text-2xl font-bold text-foreground">Đã nhập xong</h2>
        <p className="mt-1 text-muted-foreground">
          Tệp <span className="font-semibold text-foreground">{fileName}</span> đã được nhập vào
          ngân hàng câu hỏi.
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-accent/70 p-2 sm:gap-3 sm:p-3">
          {[
            { label: 'Nhóm câu', value: result.groupCount },
            { label: 'Câu hỏi', value: result.questionCount },
            { label: 'Tệp media', value: result.mediaCount },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white px-2 py-3">
              <dt className="text-[11px] font-semibold tracking-wider text-subtle uppercase">
                {item.label}
              </dt>
              <dd className="mt-1 text-2xl font-bold text-brand tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          Trạng thái: <StatusPill status={result.status} />
        </p>

        <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onImportAnother}
            className="h-11 rounded-xl bg-white px-5 font-semibold"
          >
            <FilePlus2 />
            Nhập tệp khác
          </Button>
          <ButtonLink
            to={QUESTION_LIST_PATH}
            className="h-11 w-auto bg-linear-to-r from-primary to-brand px-5 shadow-primary/30"
          >
            Xem trong ngân hàng câu hỏi
            <ArrowRight />
          </ButtonLink>
        </div>
      </ImportCard>

      <ImportCard className="p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-bold text-foreground">
          <Lightbulb className="size-5 text-primary" />
          Bước tiếp theo
        </h3>
        <ul className="mt-4 space-y-3">
          {tips.map(({ icon: Icon, tile, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tile}`}
              >
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </ImportCard>
    </div>
  );
}
