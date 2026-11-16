import { useParams } from 'react-router';
import { ArrowLeft, Clock, EyeOff, FileQuestion, Mic, PenLine } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  usePreviewExamQuery,
  type PaperBlock,
  type PaperQuestion,
  type PaperSection,
  type Skill,
} from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { PageHeader } from '@/components/PageHeader';
import { QuestionMedia } from '@/components/QuestionMedia';
import { PassageView } from '@/features/question-bank/components/GroupContent';
import { EmptyState, ErrorState } from '@/features/question-bank/components/ListStates';
import { SkillPill } from '@/features/question-bank/components/Pills';
import { findPartRule } from '@/features/question-bank/toeic';
import { cn } from '@/lib/utils';
import { ExamTypePill } from '../components/ExamPills';
import { sectionTitle } from '../exam-meta';
import { EXAM_LIST_PATH, examPath } from '../paths';

/**
 * `/teacher/exams/:id/preview`: đề đúng như học viên nhận (API không trả đáp án, câu trả lời mẫu,
 * giải thích, lời thoại). Chưa có đồng hồ và lưu bài: phần làm bài thật ở Giai đoạn 2.
 */
export function ExamPreviewPage() {
  const { id = '' } = useParams();
  const { data, error, isLoading, refetch } = usePreviewExamQuery(id);

  if (isLoading) {
    return (
      <div aria-busy className="space-y-6">
        <div className="h-8 w-72 animate-pulse rounded bg-slate-200/70" />
        <div className="h-96 animate-pulse rounded-3xl border border-border bg-white" />
      </div>
    );
  }
  if (!data) {
    const apiError = toApiError(error);
    return (
      <div className="rounded-3xl border border-border bg-white">
        {apiError.code === 'EXAM_NOT_FOUND' ? (
          <EmptyState
            icon={FileQuestion}
            title="Không tìm thấy đề thi"
            description="Đề không tồn tại hoặc đã bị xóa."
          >
            <ButtonLink to={EXAM_LIST_PATH} className="h-10 w-auto px-5">
              Về danh sách đề
            </ButtonLink>
          </EmptyState>
        ) : (
          <ErrorState message={apiError.message} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  const paper = data.data;
  return (
    <div className="space-y-6">
      <title>{`Xem trước: ${paper.title} – Smart English Exam`}</title>
      <PageHeader
        breadcrumbs={[
          { label: 'Đề thi', to: EXAM_LIST_PATH },
          { label: paper.title, to: examPath(paper.id) },
          { label: 'Xem trước' },
        ]}
        title={paper.title}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
            <ExamTypePill scale={paper.scoringScale} />
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4 text-subtle" />
              {paper.durationMinutes} phút
            </span>
            <span>{paper.totalQuestions} câu</span>
          </span>
        }
        actions={
          <ButtonLink
            to={examPath(paper.id)}
            variant="secondary"
            className="h-10 w-auto bg-white px-4 shadow-2xs ring-1 ring-border"
          >
            <ArrowLeft />
            Về màn soạn đề
          </ButtonLink>
        }
      />

      <p className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-accent px-4 py-3 text-sm text-slate-700">
        <EyeOff className="mt-0.5 size-4 shrink-0 text-primary" />
        Chế độ xem trước: đề hiện đúng như học viên nhận, không có đáp án, câu trả lời mẫu và lời
        thoại. Không tính giờ, không lưu bài làm.
      </p>

      {paper.sections.length === 0 || paper.totalQuestions === 0 ? (
        <div className="rounded-3xl border border-border bg-white">
          <EmptyState
            icon={FileQuestion}
            title="Đề chưa có câu hỏi"
            description="Thêm Part và câu hỏi ở màn soạn đề rồi xem trước lại."
          >
            <ButtonLink to={examPath(paper.id)} className="h-10 w-auto px-5">
              Về màn soạn đề
            </ButtonLink>
          </EmptyState>
        </div>
      ) : (
        <>
          {/* Nhảy nhanh tới từng Part; màn hẹp cuộn ngang */}
          <nav aria-label="Các Part" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {paper.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#part-${section.id}`}
                    className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors hover:border-primary hover:text-brand"
                  >
                    {section.skill.charAt(0)}
                    {section.part}
                    <span className="text-xs text-subtle">{range(section)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {paper.sections.map((section) => (
            <SectionPaper key={section.id} section={section} />
          ))}
        </>
      )}
    </div>
  );
}

function range(section: PaperSection): string {
  const numbers = section.blocks.flatMap((block) => block.questions.map((q) => q.number));
  if (numbers.length === 0) return 'chưa có câu';
  const first = numbers[0];
  const last = numbers[numbers.length - 1];
  return first === last ? `Câu ${first}` : `Câu ${first}–${last}`;
}

function SectionPaper({ section }: { section: PaperSection }) {
  return (
    <section
      id={`part-${section.id}`}
      className="scroll-mt-24 rounded-3xl border border-border bg-white p-4 shadow-2xs sm:p-6"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <SkillPill skill={section.skill} />
        <h2 className="font-bold text-foreground">
          {sectionTitle(section.skill, section.part)} – {section.name}
        </h2>
        <span className="ml-auto text-sm text-subtle">{range(section)}</span>
      </header>
      {section.blocks.length === 0 ? (
        <p className="pt-4 text-sm text-subtle italic">Part chưa có câu hỏi</p>
      ) : (
        <div className="divide-y divide-border">
          {section.blocks.map((block, index) => (
            <BlockPaper
              key={block.group?.id ?? block.questions[0]?.examQuestionId ?? index}
              block={block}
              skill={section.skill}
              part={section.part}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MediaSlot({ kind, url }: { kind: 'audio' | 'image'; url: string | null }) {
  return (
    <QuestionMedia
      kind={kind}
      url={url}
      emptyHint={kind === 'audio' ? 'Chưa có tệp âm thanh' : 'Chưa có hình ảnh'}
    />
  );
}

function BlockPaper({ block, skill, part }: { block: PaperBlock; skill: Skill; part: number }) {
  const rule = findPartRule(skill, part);
  const group = block.group;
  const first = block.questions[0]?.number;
  const last = block.questions[block.questions.length - 1]?.number;

  return (
    <div className="py-5">
      {group && (
        <div className="mb-4 space-y-3 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold tracking-wider text-subtle uppercase">
            {first === last ? `Câu ${first}` : `Câu ${first}–${last}`} dùng chung nội dung sau
          </p>
          {skill === 'LISTENING' && <MediaSlot kind="audio" url={group.audioUrl} />}
          {group.imageUrl && <MediaSlot kind="image" url={group.imageUrl} />}
          {group.passage && <PassageView text={group.passage} />}
        </div>
      )}
      <ol className="space-y-5">
        {block.questions.map((question) => (
          <QuestionPaper
            key={question.examQuestionId}
            question={question}
            media={rule?.media}
            skill={skill}
            part={part}
          />
        ))}
      </ol>
    </div>
  );
}

function QuestionPaper({
  question,
  media,
  skill,
  part,
}: {
  question: PaperQuestion;
  media?: string;
  skill: Skill;
  part: number;
}) {
  // Listening Part 1, 2: học viên chỉ nghe, đề không in nội dung phương án (Ke_hoach_soan_cau_hoi)
  const hideOptionText = skill === 'LISTENING' && part <= 2;
  const needAudio = media === 'audio' || media === 'audio+image';
  const needImage = media === 'image' || media === 'audio+image';

  return (
    <li className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white tabular-nums">
        {question.number}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {(needAudio || needImage) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {needImage && <MediaSlot kind="image" url={question.imageUrl} />}
            {needAudio && <MediaSlot kind="audio" url={question.audioUrl} />}
          </div>
        )}
        <p className="pt-1 text-sm leading-relaxed font-medium wrap-break-word whitespace-pre-line text-foreground">
          {question.content}
        </p>

        {question.options.length > 0 && (
          <ul className="grid gap-2">
            {question.options.map((option) => (
              <li
                key={option.id}
                className="flex items-start gap-3 rounded-xl border border-border px-3 py-2.5 text-sm"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-600">
                  {option.label}
                </span>
                <span className={cn('min-w-0 pt-0.5', hideOptionText && 'text-subtle italic')}>
                  {hideOptionText ? 'Phương án được đọc trong bài nghe' : option.content}
                </span>
              </li>
            ))}
          </ul>
        )}

        {question.type === 'SPOKEN_RESPONSE' && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-slate-50 px-3 py-3 text-sm text-slate-600">
            <span className="flex size-9 items-center justify-center rounded-full bg-skill-speaking/12 text-violet-700">
              <Mic className="size-4" />
            </span>
            <span>
              Chuẩn bị <b>{question.prepSeconds ?? 0} giây</b> · Trả lời{' '}
              <b>{question.responseSeconds ?? 0} giây</b>
            </span>
            <span className="ml-auto text-xs text-subtle">Học viên ghi âm khi làm bài</span>
          </div>
        )}

        {question.type === 'WRITTEN_RESPONSE' && (
          <div className="rounded-xl border border-border bg-slate-50 px-3 py-3">
            <div className="flex h-24 items-start gap-2 text-sm text-subtle">
              <PenLine className="mt-0.5 size-4" />
              Học viên viết câu trả lời ở đây
            </div>
            <p className="text-right text-xs text-subtle">0 từ</p>
          </div>
        )}
      </div>
    </li>
  );
}
