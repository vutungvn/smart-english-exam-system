import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import {
  Eye,
  FileQuestion,
  Info,
  ListPlus,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { Skill } from '@/api/generated';
import { AppDialog } from '@/components/AppDialog';
import { ButtonLink } from '@/components/ButtonLink';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatDateTime } from '@/features/profile/format';
import { EmptyState, SuccessBanner } from '@/features/question-bank/components/ListStates';
import { cn } from '@/lib/utils';
import { ExamFormDialog } from '../components/ExamFormDialog';
import { ExamStatusPill, ExamTypePill } from '../components/ExamPills';
import { PartNav } from '../components/PartNav';
import { QuestionPickerDialog } from '../components/QuestionPickerDialog';
import { SectionPanel } from '../components/SectionPanel';
import { ValidationPanel } from '../components/ValidationPanel';
import { EXAM_TYPE_META, partsOfScale, sectionTitle } from '../exam-meta';
import { checkExamLocal, expectedTotal } from '../mock/check-exam';
import { mockExams, useMockExam } from '../mock/mock-store';
import { EXAM_LIST_PATH, examPreviewPath } from '../paths';
import type { ExamDetail } from '../types';
import type { ExamsLocationState } from './ExamsPage';

const outlineButton = cn(
  buttonVariants({ variant: 'outline' }),
  'h-10 rounded-xl bg-white px-4 font-semibold',
);

/** `/teacher/exams/:id`: soạn đề theo Part. TẠM (lượt 1) dữ liệu từ mock-store */
export function ExamBuilderPage() {
  const { id = '' } = useParams();
  const exam = useMockExam(id);

  if (!exam) {
    return (
      <div className="rounded-3xl border border-border bg-white">
        <EmptyState
          icon={FileQuestion}
          title="Không tìm thấy đề thi"
          description="Đề không tồn tại hoặc đã bị xóa."
        >
          <ButtonLink to={EXAM_LIST_PATH} className="h-10 w-auto px-5">
            Về danh sách đề
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }
  return <Builder exam={exam} />;
}

type Confirm = 'publish' | 'unpublish' | 'delete' | { removeSection: string } | null;

function Builder({ exam }: { exam: ExamDetail }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedId, setSelectedId] = useState<string | undefined>(exam.sections[0]?.id);
  const [editing, setEditing] = useState(0);
  const [picking, setPicking] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [flash, setFlash] = useState(() => (location.state as ExamsLocationState | null)?.flash);

  useEffect(() => {
    if ((location.state as ExamsLocationState | null)?.flash) {
      void navigate({ search: location.search }, { replace: true, state: null });
    }
  }, [location, navigate]);

  const selected = exam.sections.find((s) => s.id === selectedId) ?? exam.sections[0];
  const validation = useMemo(() => checkExamLocal(exam), [exam]);
  const usedQuestionIds = useMemo(
    () => new Set(exam.sections.flatMap((s) => s.questions.map((item) => item.question.id))),
    [exam],
  );
  const published = exam.status === 'PUBLISHED';
  const expected = expectedTotal(exam);
  const errorCount = validation.issues.filter((issue) => issue.level === 'ERROR').length;
  const missingParts = partsOfScale(exam.scoringScale).filter(
    (rule) => !exam.sections.some((s) => s.skill === rule.skill && s.part === rule.part),
  );

  const goToSection = (sectionId: string) => {
    setSelectedId(sectionId);
    document.getElementById('exam-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const addPart = (skill: Skill, part: number) => {
    setSelectedId(mockExams.addSection(exam.id, skill, part));
    setFlash(`Đã thêm ${sectionTitle(skill, part)}`);
  };
  const addAllParts = () => {
    const ids = missingParts.map((rule) => mockExams.addSection(exam.id, rule.skill, rule.part));
    if (!selected) setSelectedId(ids[0]);
    setFlash(`Đã thêm ${ids.length} Part còn thiếu`);
  };

  const confirmDialog = (() => {
    if (confirm === 'publish') {
      return {
        title: 'Xuất bản đề?',
        description:
          'Học viên sẽ thấy và làm được đề này. Trong lúc xuất bản không sửa được nội dung đề.',
        action: 'Xuất bản',
        danger: false,
        run: () => {
          mockExams.publish(exam.id);
          setFlash('Đã xuất bản đề, học viên đã thấy đề trong mục Luyện đề thi');
        },
      };
    }
    if (confirm === 'unpublish') {
      return {
        title: 'Gỡ xuất bản?',
        description:
          'Đề ẩn khỏi danh sách của học viên, bài làm đã có giữ nguyên. Sau khi gỡ có thể sửa nội dung.',
        action: 'Gỡ xuất bản',
        danger: false,
        run: () => {
          mockExams.unpublish(exam.id);
          setFlash('Đã gỡ xuất bản, bạn có thể sửa nội dung đề');
        },
      };
    }
    if (confirm === 'delete') {
      return {
        title: 'Xóa đề thi?',
        description:
          'Đề sẽ không còn trong danh sách. Bài làm cũ của học viên (nếu có) vẫn được giữ.',
        action: 'Xóa đề',
        danger: true,
        run: () => {
          mockExams.remove(exam.id);
          const state: ExamsLocationState = { flash: 'Đã xóa đề thi' };
          void navigate(EXAM_LIST_PATH, { state });
        },
      };
    }
    if (confirm && typeof confirm === 'object') {
      const section = exam.sections.find((s) => s.id === confirm.removeSection);
      return {
        title: `Xóa ${section ? sectionTitle(section.skill, section.part) : 'Part'}?`,
        description: `Part và ${section?.questionCount ?? 0} câu trong Part sẽ bị gỡ khỏi đề. Câu hỏi trong ngân hàng không bị ảnh hưởng.`,
        action: 'Xóa Part',
        danger: true,
        run: () => {
          mockExams.removeSection(exam.id, confirm.removeSection);
          setSelectedId(exam.sections.find((s) => s.id !== confirm.removeSection)?.id);
          setFlash('Đã xóa Part khỏi đề');
        },
      };
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      <title>{`${exam.title} – Smart English Exam`}</title>
      <PageHeader
        breadcrumbs={[{ label: 'Đề thi', to: EXAM_LIST_PATH }, { label: exam.title }]}
        title={exam.title}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <ExamTypePill scale={exam.scoringScale} />
            <ExamStatusPill status={exam.status} />
            <span className="text-slate-600">
              {exam.durationMinutes} phút ·{' '}
              <span className="font-semibold">
                {expected ? `${exam.questionCount}/${expected}` : exam.questionCount} câu
              </span>{' '}
              · Cập nhật {formatDateTime(exam.updatedAt)}
            </span>
          </span>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className={outlineButton}
              onClick={() => setEditing((n) => n + 1)}
            >
              <Pencil />
              Sửa thông tin
            </Button>
            <Link to={examPreviewPath(exam.id)} className={outlineButton}>
              <Eye />
              Xem trước
            </Link>
            {published ? (
              <Button
                type="button"
                variant="outline"
                className={outlineButton}
                onClick={() => setConfirm('unpublish')}
              >
                <Undo2 />
                Gỡ xuất bản
              </Button>
            ) : (
              // Nút disabled không nhận chuột nên đặt title ở thẻ bọc ngoài
              <span title={validation.publishable ? undefined : `Còn ${errorCount} lỗi cần sửa`}>
                <Button
                  type="button"
                  disabled={!validation.publishable}
                  onClick={() => setConfirm('publish')}
                  className="h-10 rounded-xl bg-linear-to-r from-primary to-brand px-4 font-semibold shadow-md shadow-primary/30 hover:brightness-95"
                >
                  <Send />
                  Xuất bản
                </Button>
              </span>
            )}
            <MoreMenu published={published} onDelete={() => setConfirm('delete')} />
          </>
        }
      />

      {flash && <SuccessBanner message={flash} onClose={() => setFlash(undefined)} />}

      {published && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-accent px-4 py-3 text-sm text-slate-700">
          <Info className="size-5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1">
            Đề đang xuất bản nên không sửa được nội dung (Part, câu hỏi). Gỡ xuất bản để chỉnh sửa;
            thông tin đề vẫn sửa được.
          </p>
          <Button
            variant="outline"
            className="h-9 rounded-xl bg-white px-3"
            onClick={() => setConfirm('unpublish')}
          >
            <Undo2 />
            Gỡ xuất bản
          </Button>
        </div>
      )}

      {/*
        ≥1360px (85rem, cùng đơn vị rem với lg để Tailwind xếp đúng thứ tự media query): 3 cột (Part · nội dung · kiểm tra). lg–1359px: 2 cột, khung kiểm tra nằm dưới
        danh sách Part. Màn hẹp: một cột, Part thành tab cuộn ngang ở trên.
      */}
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] min-[85rem]:grid-cols-[240px_minmax(0,1fr)_300px]">
        <div className="min-w-0 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
          <PartNav
            sections={exam.sections}
            scale={exam.scoringScale}
            selectedId={selected?.id}
            readOnly={published}
            onSelect={setSelectedId}
            onAddPart={addPart}
            onAddAllParts={addAllParts}
          />
        </div>

        <div
          id="exam-section"
          className="min-w-0 scroll-mt-24 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          {selected ? (
            <SectionPanel
              section={selected}
              scale={exam.scoringScale}
              readOnly={published}
              onAddQuestions={() => setPicking(true)}
              onRemoveQuestion={(examQuestionId) =>
                mockExams.removeQuestion(exam.id, selected.id, examQuestionId)
              }
              onRemoveSection={() => setConfirm({ removeSection: selected.id })}
            />
          ) : (
            <div className="rounded-3xl border border-border bg-white">
              <EmptyState
                icon={ListPlus}
                title="Đề chưa có Part nào"
                description={
                  exam.scoringScale === 'PERCENT'
                    ? 'Thêm các Part muốn luyện, rồi chọn câu từ ngân hàng.'
                    : `${EXAM_TYPE_META[exam.scoringScale].title}: thêm đủ các Part theo cấu trúc chuẩn rồi chọn câu.`
                }
              >
                {!published && exam.scoringScale !== 'PERCENT' && (
                  <Button className="h-10 rounded-xl px-5" onClick={addAllParts}>
                    <ListPlus />
                    Thêm đủ {missingParts.length} Part
                  </Button>
                )}
              </EmptyState>
            </div>
          )}
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2 min-[85rem]:sticky min-[85rem]:top-24 min-[85rem]:col-start-3 min-[85rem]:row-start-1">
          <ValidationPanel
            validation={validation}
            published={published}
            onGoToSection={goToSection}
          />
        </div>
      </div>

      {picking && selected && (
        <QuestionPickerDialog
          section={selected}
          scale={exam.scoringScale}
          usedQuestionIds={usedQuestionIds}
          onClose={() => setPicking(false)}
          onConfirm={(ids) => {
            mockExams.addQuestions(exam.id, selected.id, ids);
            setPicking(false);
            setFlash(
              ids.groupIds.length > 0
                ? `Đã thêm ${ids.groupIds.length} nhóm vào ${sectionTitle(selected.skill, selected.part)}`
                : `Đã thêm ${ids.questionIds.length} câu vào ${sectionTitle(selected.skill, selected.part)}`,
            );
          }}
        />
      )}

      {editing > 0 && (
        <ExamFormDialog
          key={editing}
          open
          onOpenChange={(open) => !open && setEditing(0)}
          lockScale={exam.sections.length > 0}
          initial={{
            title: exam.title,
            description: exam.description ?? '',
            scoringScale: exam.scoringScale,
            durationMinutes: exam.durationMinutes,
            maxAttempts: exam.maxAttempts,
            allowPartPractice: exam.allowPartPractice,
          }}
          onSubmit={(values) => {
            mockExams.update(exam.id, values);
            setEditing(0);
            setFlash('Đã lưu thông tin đề');
          }}
        />
      )}

      <AppDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        footer={
          <>
            <Button
              variant="outline"
              className="h-10 rounded-xl px-4"
              onClick={() => setConfirm(null)}
            >
              Hủy
            </Button>
            <Button
              className={cn(
                'h-10 rounded-xl px-4 font-semibold',
                confirmDialog?.danger
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : 'bg-linear-to-r from-primary to-brand shadow-md shadow-primary/30 hover:brightness-95',
              )}
              onClick={() => {
                confirmDialog?.run();
                setConfirm(null);
              }}
            >
              {confirmDialog?.action}
            </Button>
          </>
        }
      >
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          {exam.title}
        </p>
      </AppDialog>
    </div>
  );
}

function MoreMenu({ published, onDelete }: { published: boolean; onDelete: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Thao tác khác"
        className={cn(outlineButton, 'w-10 px-0 data-[state=open]:bg-accent')}
      >
        <MoreVertical className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 w-56 rounded-xl border border-border bg-white p-1.5 shadow-xl shadow-slate-900/10"
        >
          <DropdownMenu.Item
            disabled={published}
            onSelect={onDelete}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive outline-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-danger-soft"
          >
            <Trash2 className="size-4" />
            <span>
              Xóa đề
              {published && (
                <span className="block text-[11px] text-subtle">Gỡ xuất bản trước khi xóa</span>
              )}
            </span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
