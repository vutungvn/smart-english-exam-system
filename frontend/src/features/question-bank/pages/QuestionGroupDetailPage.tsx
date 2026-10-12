import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import {
  Eye,
  EyeOff,
  FileQuestion,
  Headphones,
  ImageIcon,
  Info,
  Layers,
  ListPlus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useGetQuestionGroupQuery,
  type QuestionGroupDetail,
  type QuestionSummary,
} from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/features/profile/format';
import { useAppSelector } from '@/hooks/hooks';
import { cn } from '@/lib/utils';
import { selectCurrentUser } from '@/store/slice/auth-slice';
import { DeleteGroupDialog } from '../components/DeleteGroupDialog';
import { DeleteQuestionDialog } from '../components/DeleteQuestionDialog';
import { PassageView, TranscriptView } from '../components/GroupContent';
import { EmptyState, ErrorState, SuccessBanner } from '../components/ListStates';
import { DifficultyPill, StatusPill } from '../components/Pills';
import { GROUP_LIST_PATH, groupEditPath, newQuestionPath, questionPath } from '../paths';
import { findPartRule, groupSize, groupSizeLabel, SKILL_META } from '../toeic';
import type { QuestionBankLocationState } from './QuestionBankPage';

/** `/teacher/question-groups/:id`: nội dung dùng chung bên trái, các câu trong nhóm bên phải */
export function QuestionGroupDetailPage() {
  const { id = '' } = useParams();
  const { data, error, isLoading, refetch } = useGetQuestionGroupQuery(id);

  if (isLoading) return <DetailSkeleton />;
  if (!data) {
    const apiError = toApiError(error);
    return (
      <div className="rounded-3xl border border-border bg-white">
        {apiError.code === 'QUESTION_GROUP_NOT_FOUND' || apiError.code === 'VALIDATION_ERROR' ? (
          <EmptyState
            icon={Layers}
            title="Không tìm thấy nhóm câu"
            description="Nhóm không tồn tại hoặc đã bị xóa."
          >
            <ButtonLink to={GROUP_LIST_PATH} className="h-10 w-auto px-5">
              Về danh sách nhóm
            </ButtonLink>
          </EmptyState>
        ) : (
          <ErrorState message={apiError.message} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  return <GroupDetail key={data.data.id} group={data.data} />;
}

function GroupDetail({ group }: { group: QuestionGroupDetail }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector(selectCurrentUser);
  const mine = group.author.id === user?.id;
  const rule = findPartRule(group.skill, group.part);
  const size = groupSize(group.skill, group.part);
  const skillLabel = SKILL_META[group.skill].label;
  const title = `${skillLabel} · Part ${group.part}${rule ? ` – ${rule.name}` : ''}`;
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<QuestionSummary | null>(null);
  // Thông báo do trang tạo nhóm/tạo câu gửi qua state; xóa khỏi lịch sử để tải lại không hiện lại
  const [flash, setFlash] = useState(
    () => (location.state as QuestionBankLocationState | null)?.flash,
  );
  useEffect(() => {
    if ((location.state as QuestionBankLocationState | null)?.flash) {
      void navigate({ search: location.search }, { replace: true, state: null });
    }
  }, [location, navigate]);
  const addPath = newQuestionPath({ skill: group.skill, part: group.part, groupId: group.id });
  const hasQuestions = group.questionCount > 0;

  return (
    <div className="space-y-6">
      <title>{`${title} – Smart English Exam`}</title>
      <PageHeader
        breadcrumbs={[
          { label: 'Nhóm câu hỏi', to: GROUP_LIST_PATH },
          { label: `${skillLabel} · Part ${group.part}` },
        ]}
        title={title}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <StatusPill status={group.status} />
            <span className="text-slate-700">
              Chủ đề: <span className="font-semibold">{group.topic.name}</span>
            </span>
            <span className="text-subtle">
              {mine ? 'Bạn' : group.author.fullName} tạo · Cập nhật{' '}
              {formatDateTime(group.updatedAt)}
            </span>
          </span>
        }
        actions={
          mine && (
            <>
              <ButtonLink
                to={groupEditPath(group.id)}
                variant="secondary"
                className="h-10 w-auto bg-white px-4 shadow-2xs ring-1 ring-border"
              >
                <Pencil />
                Sửa nhóm
              </ButtonLink>
              {/* Backend chỉ xóa được nhóm rỗng: tắt nút và nói rõ lý do.
                  Nút disabled không nhận chuột nên đặt title ở thẻ bọc ngoài */}
              <span title={hasQuestions ? 'Xóa hết câu trong nhóm trước khi xóa nhóm' : undefined}>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-10 rounded-xl px-4"
                  disabled={hasQuestions}
                  onClick={() => setDeletingGroup(true)}
                >
                  <Trash2 />
                  Xóa nhóm
                </Button>
              </span>
            </>
          )
        }
      />

      {!mine && (
        <p className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-accent px-4 py-3 text-sm text-slate-700">
          <Eye className="mt-0.5 size-4 shrink-0 text-primary" />
          Nhóm của {group.author.fullName}. Bạn xem được, nhưng chỉ tác giả mới sửa, thêm câu hoặc
          xóa được.
        </p>
      )}

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <SharedContentCard group={group} size={size} />

        <section className="rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold text-foreground">Câu hỏi trong nhóm</h2>
            <CountPill count={group.questionCount} size={size} />
            {mine && hasQuestions && (
              <ButtonLink
                to={addPath}
                className="ml-auto h-10 w-auto bg-linear-to-r from-primary to-brand px-4 shadow-primary/30"
              >
                <Plus />
                Thêm câu vào nhóm
              </ButtonLink>
            )}
          </div>

          {hasQuestions ? (
            <ol className="mt-5 space-y-3">
              {group.questions.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  editable={mine}
                  onDelete={() => setPendingQuestion(question)}
                />
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border">
              <EmptyState
                icon={FileQuestion}
                title="Nhóm chưa có câu hỏi"
                description={
                  size
                    ? `Part ${group.part} thường có ${groupSizeLabel(size)} mỗi nhóm. Thêm câu hỏi dùng chung nội dung bên trái.`
                    : 'Thêm câu hỏi dùng chung nội dung bên trái.'
                }
              >
                {mine && (
                  <ButtonLink to={addPath} className="h-10 w-auto px-5">
                    <ListPlus />
                    Thêm câu đầu tiên
                  </ButtonLink>
                )}
              </EmptyState>
            </div>
          )}
        </section>
      </div>

      <DeleteGroupDialog
        group={deletingGroup ? { id: group.id, title } : null}
        onClose={() => setDeletingGroup(false)}
        onDeleted={() => {
          const state: QuestionBankLocationState = { flash: 'Đã xóa nhóm câu' };
          void navigate(GROUP_LIST_PATH, { state });
        }}
      />
      <DeleteQuestionDialog
        question={pendingQuestion}
        onClose={() => setPendingQuestion(null)}
        onDeleted={() => {
          setPendingQuestion(null);
          setFlash('Đã xóa câu hỏi khỏi nhóm');
        }}
      />
    </div>
  );
}

function SharedContentCard({
  group,
  size,
}: {
  group: QuestionGroupDetail;
  size?: { min: number; max: number };
}) {
  const listening = group.skill === 'LISTENING';
  const text = listening ? group.transcript : group.passage;

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-white p-5 shadow-2xs sm:p-6 lg:sticky lg:top-24">
      <h2 className="flex items-center gap-2 font-bold text-foreground">
        <Layers className="size-5 text-primary" />
        Nội dung dùng chung
      </h2>

      {listening && (
        <MediaSlot icon={Headphones} label="Âm thanh hội thoại" attached={!!group.audioKey} />
      )}
      {group.skill === 'READING' && group.imageKey && (
        <MediaSlot icon={ImageIcon} label="Hình ảnh" attached />
      )}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-700">
            {listening
              ? 'Lời thoại (transcript)'
              : group.skill === 'SPEAKING'
                ? 'Thông tin cho học viên'
                : 'Đoạn văn'}
          </h3>
        </div>
        {listening && (
          <p className="mb-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-subtle">
            <EyeOff className="mt-0.5 size-3.5 shrink-0" />
            Học viên chỉ thấy lời thoại ở màn xem lại, không thấy khi đang làm bài.
          </p>
        )}
        <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-border p-4">
          {!text ? (
            <p className="text-sm text-subtle italic">Chưa có nội dung</p>
          ) : listening ? (
            <TranscriptView text={text} />
          ) : (
            <PassageView text={text} />
          )}
        </div>
      </div>

      {size && (
        <p className="flex items-start gap-2 text-xs text-subtle">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Theo định dạng TOEIC, mỗi nhóm Part {group.part} có {groupSizeLabel(size)} hỏi.
        </p>
      )}
    </section>
  );
}

function MediaSlot({
  icon: Icon,
  label,
  attached,
}: {
  icon: typeof Headphones;
  label: string;
  attached: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-slate-50 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-subtle">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        <span className="block text-xs text-subtle">
          {attached ? 'Đã gắn tệp' : 'Chưa có tệp · thêm khi nhập từ tệp .zip'}
        </span>
      </span>
      {/* Chưa có chức năng tải tệp: chỉ báo "Sắp có" khi nhóm chưa có tệp */}
      {!attached && (
        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          Sắp có
        </span>
      )}
    </div>
  );
}

/** "3/3 câu": xanh khi đủ, cam khi còn thiếu hoặc vượt số câu chuẩn */
function CountPill({ count, size }: { count: number; size?: { min: number; max: number } }) {
  if (!size) {
    return <span className="text-sm text-muted-foreground">{count} câu</span>;
  }
  const ok = count >= size.min && count <= size.max;
  const target = size.min === size.max ? `${size.max}` : `${size.min}–${size.max}`;
  return (
    <span
      title={`Chuẩn TOEIC: ${groupSizeLabel(size)} mỗi nhóm`}
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
        ok ? 'bg-success-soft text-success' : 'bg-amber-50 text-amber-700',
      )}
    >
      {count}/{target} câu
    </span>
  );
}

function QuestionRow({
  question,
  editable,
  onDelete,
}: {
  question: QuestionSummary;
  editable: boolean;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const path = questionPath(question.id);

  return (
    <li
      onClick={() => void navigate(path)}
      className="flex cursor-pointer items-start gap-4 rounded-2xl border border-border p-4 transition-colors hover:border-primary/30 hover:bg-slate-50"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-brand">
        {question.orderInGroup}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to={path}
          onClick={(event) => event.stopPropagation()}
          className="line-clamp-3 text-sm font-medium wrap-break-word text-foreground outline-none hover:text-brand focus-visible:underline"
        >
          {question.content}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DifficultyPill difficulty={question.difficulty} />
          <StatusPill status={question.status} />
        </div>
      </div>
      {editable && (
        <div className="flex shrink-0 gap-1" onClick={(event) => event.stopPropagation()}>
          <Link
            to={path}
            aria-label={`Sửa câu ${question.orderInGroup}`}
            className="rounded-lg p-2 text-subtle transition-colors hover:bg-accent hover:text-brand"
          >
            <Pencil className="size-4" />
          </Link>
          <button
            type="button"
            aria-label={`Xóa câu ${question.orderInGroup}`}
            onClick={onDelete}
            className="rounded-lg p-2 text-subtle transition-colors hover:bg-danger-soft hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200/70" />
        <div className="h-8 w-80 animate-pulse rounded bg-slate-200/70" />
        <div className="h-6 w-96 animate-pulse rounded bg-slate-200/70" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="h-96 animate-pulse rounded-3xl border border-border bg-white" />
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-white" />
      </div>
    </div>
  );
}
