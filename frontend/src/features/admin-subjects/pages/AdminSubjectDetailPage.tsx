import { useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { skipToken } from '@reduxjs/toolkit/query';
import { FolderX, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { toApiError } from '@/api/errors';
import {
  useGetAdminSubjectQuery,
  useListAdminTopicsQuery,
  type AdminTopicItem,
  type Skill,
} from '@/api/generated';
import { ButtonLink } from '@/components/ButtonLink';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/features/question-bank/components/FilterControls';
import {
  EmptyState,
  ErrorState,
  SuccessBanner,
} from '@/features/question-bank/components/ListStates';
import { SKILL_META, SKILLS } from '@/features/question-bank/toeic';
import { cn } from '@/lib/utils';
import { ActiveBadge, CategoryBadge, ProtectedBadge } from '../components/SubjectBadges';
import {
  DeleteSubjectDialog,
  SubjectFormDialog,
  ToggleSubjectDialog,
} from '../components/SubjectDialogs';
import { DeleteTopicDialog, TopicFormDialog } from '../components/TopicDialogs';
import { formatCount, SUBJECTS_PATH, type FlashState } from '../labels';
import { SubjectMenu } from './AdminSubjectsPage';

/** Trang chi tiết `/admin/subjects/:id`: thông tin chương trình, chủ đề theo kỹ năng */
export function AdminSubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const skill = SKILLS.find((value) => value === params.get('skill'));

  const subjectQuery = useGetAdminSubjectQuery(id ?? skipToken, {
    refetchOnMountOrArgChange: true,
  });
  const topicsQuery = useListAdminTopicsQuery(id ? { id } : skipToken, {
    refetchOnMountOrArgChange: true,
  });
  const subject = subjectQuery.data?.data;
  const allTopics = topicsQuery.data?.data ?? [];
  const topics = skill ? allTopics.filter((topic) => topic.skill === skill) : allTopics;

  const [flash, setFlash] = useState((location.state as FlashState | null)?.flash);
  const [subjectAction, setSubjectAction] = useState<'edit' | 'toggle' | 'delete' | null>(null);
  // null: thêm mới; có giá trị: sửa; undefined: đóng
  const [editingTopic, setEditingTopic] = useState<AdminTopicItem | null | undefined>(undefined);
  const [deletingTopic, setDeletingTopic] = useState<AdminTopicItem | null>(null);

  const done = (message: string) => {
    setSubjectAction(null);
    setEditingTopic(undefined);
    setDeletingTopic(null);
    setFlash(message);
  };
  const breadcrumbs = [
    { label: 'Chương trình thi', to: SUBJECTS_PATH },
    { label: subject?.code ?? 'Chi tiết' },
  ];

  if (subjectQuery.isLoading) {
    return (
      <div aria-hidden className="space-y-6">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (!subject) {
    const apiError = subjectQuery.error ? toApiError(subjectQuery.error) : undefined;
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={breadcrumbs} title="Chương trình thi" description="" />
        <section className="rounded-3xl border border-border bg-white shadow-2xs">
          {apiError?.code === 'SUBJECT_NOT_FOUND' ? (
            <EmptyState
              icon={FolderX}
              title="Không tìm thấy chương trình thi"
              description="Chương trình đã bị xóa hoặc đường dẫn không đúng."
            >
              <ButtonLink to={SUBJECTS_PATH} className="h-10 w-auto px-5">
                Về danh sách
              </ButtonLink>
            </EmptyState>
          ) : (
            <ErrorState
              message={apiError?.message ?? 'Không tải được dữ liệu'}
              onRetry={() => void subjectQuery.refetch()}
            />
          )}
        </section>
      </div>
    );
  }

  const topicsSupported = subject.category === 'TOEIC';

  return (
    <div className="space-y-6">
      <title>{`${subject.code} – Chương trình thi – Smart English Exam`}</title>
      <PageHeader
        breadcrumbs={breadcrumbs}
        backTo={{ label: 'Danh sách chương trình thi', to: SUBJECTS_PATH }}
        title={subject.name}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{subject.code}</span>
            <CategoryBadge category={subject.category} />
            <ActiveBadge active={subject.isActive} />
            {subject.isProtected && <ProtectedBadge />}
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              className="h-10 rounded-xl bg-white px-4 shadow-2xs"
              onClick={() => setSubjectAction('edit')}
            >
              <Pencil />
              Sửa tên
            </Button>
            <SubjectMenu
              subject={subject}
              onEdit={() => setSubjectAction('edit')}
              onToggle={() => setSubjectAction('toggle')}
              onDelete={() => setSubjectAction('delete')}
            />
          </>
        }
      />

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}

      <dl className="grid grid-cols-3 gap-3">
        {(
          [
            ['Chủ đề', subject.topicCount],
            ['Đề thi', subject.examCount],
            ['Câu hỏi', subject.questionCount],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-white p-4 shadow-2xs">
            <dt className="text-xs font-semibold text-subtle">{label}</dt>
            <dd className="mt-1 text-2xl font-bold text-foreground tabular-nums">
              {formatCount(value)}
            </dd>
          </div>
        ))}
      </dl>

      <section className="rounded-3xl border border-border bg-white shadow-2xs">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center">
          <h2 className="flex items-center gap-2 font-bold text-foreground lg:mr-auto">
            <Tags className="size-5 text-primary" />
            Chủ đề
          </h2>
          {topicsSupported && (
            <>
              <SegmentedControl
                label="Lọc theo kỹ năng"
                value={skill}
                onChange={(value) => setParams(value ? { skill: value } : {}, { replace: true })}
                options={[
                  { label: 'Tất cả' },
                  ...SKILLS.map((value) => ({ value, label: SKILL_META[value].label })),
                ]}
                className="grid grid-cols-3 sm:flex"
              />
              <Button className="h-10 rounded-xl px-4" onClick={() => setEditingTopic(null)}>
                <Plus />
                Thêm chủ đề
              </Button>
            </>
          )}
        </div>

        {!topicsSupported ? (
          <EmptyState
            icon={Tags}
            title="Chưa thêm chủ đề được"
            description="Hệ thống mới hỗ trợ cấu trúc đề TOEIC, chương trình IELTS chưa có chủ đề và câu hỏi."
          />
        ) : topicsQuery.isLoading ? (
          <div aria-hidden className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : topicsQuery.error && !topicsQuery.data ? (
          <ErrorState
            message={toApiError(topicsQuery.error).message}
            onRetry={() => void topicsQuery.refetch()}
          />
        ) : topics.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={skill ? `Chưa có chủ đề ${SKILL_META[skill].label}` : 'Chưa có chủ đề'}
            description="Thêm chủ đề để giáo viên phân loại câu hỏi."
          />
        ) : (
          <TopicList
            topics={topics}
            fetching={topicsQuery.isFetching}
            onEdit={setEditingTopic}
            onDelete={setDeletingTopic}
          />
        )}
      </section>

      <SubjectFormDialog
        subject={subjectAction === 'edit' ? subject : undefined}
        onClose={() => setSubjectAction(null)}
        onDone={done}
      />
      <ToggleSubjectDialog
        subject={subjectAction === 'toggle' ? subject : null}
        onClose={() => setSubjectAction(null)}
        onDone={done}
      />
      <DeleteSubjectDialog
        subject={subjectAction === 'delete' ? subject : null}
        onClose={() => setSubjectAction(null)}
        onDone={(message) => void navigate(SUBJECTS_PATH, { state: { flash: message } })}
      />
      <TopicFormDialog
        subjectId={subject.id}
        topic={editingTopic}
        defaultSkill={skill}
        onClose={() => setEditingTopic(undefined)}
        onDone={done}
      />
      <DeleteTopicDialog
        subjectId={subject.id}
        topic={deletingTopic}
        onClose={() => setDeletingTopic(null)}
        onDone={done}
      />
    </div>
  );
}

function TopicList({
  topics,
  fetching,
  onEdit,
  onDelete,
}: {
  topics: AdminTopicItem[];
  fetching: boolean;
  onEdit: (topic: AdminTopicItem) => void;
  onDelete: (topic: AdminTopicItem) => void;
}) {
  return (
    <ul
      aria-busy={fetching}
      className={cn('divide-y divide-border transition-opacity', fetching && 'opacity-60')}
    >
      {topics.map((topic) => {
        const meta = SKILL_META[topic.skill as Skill];
        return (
          <li
            key={topic.id}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                    meta.pill,
                  )}
                >
                  <span aria-hidden className={cn('size-1.5 rounded-full', meta.dot)} />
                  {meta.label}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  Part {topic.parts.join(', ')}
                </span>
              </div>
              <p className="mt-1.5 font-semibold text-foreground">{topic.name}</p>
              {topic.description && (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {topic.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground sm:w-36 sm:text-right">
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCount(topic.questionCount)}
                </span>{' '}
                câu hỏi ·{' '}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCount(topic.groupCount)}
                </span>{' '}
                nhóm
              </p>
              <div className="ml-auto flex gap-1 sm:ml-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Sửa chủ đề ${topic.name}`}
                  title="Sửa"
                  onClick={() => onEdit(topic)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Xóa chủ đề ${topic.name}`}
                  title="Xóa"
                  className="text-destructive hover:bg-danger-soft hover:text-destructive"
                  onClick={() => onDelete(topic)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
