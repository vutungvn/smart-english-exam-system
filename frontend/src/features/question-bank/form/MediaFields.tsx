import { useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { ArrowUpRight, Info, TriangleAlert } from 'lucide-react';
import {
  useRemoveQuestionMediaMutation,
  useUploadQuestionMediaMutation,
  type QuestionDetail,
} from '@/api/generated';
import { MediaUploadSlot } from '@/components/media/MediaUploadSlot';
import { QuestionMedia } from '@/components/QuestionMedia';
import { IMPORT_PATH } from '@/features/question-import/import-meta';
import type { MediaKind } from '@/lib/media-file';
import { groupPath } from '../paths';
import { groupMediaKinds, questionMediaKinds, type PartRule } from '../toeic';
import type { QuestionFormValues } from './question-form';
import type { PendingMedia } from './use-pending-media';

function slotLabel(rule: PartRule, kind: MediaKind): string {
  if (kind === 'image') return rule.skill === 'LISTENING' ? 'Bức tranh' : 'Hình ảnh đề bài';
  return rule.skill === 'SPEAKING' ? 'Âm thanh đọc câu hỏi' : 'Âm thanh';
}

const GROUP_MEDIA_TEXT: Record<MediaKind, string> = { audio: 'âm thanh', image: 'hình ảnh' };

interface MediaFieldsProps {
  rule: PartRule;
  /** Có khi sửa câu đã lưu: tệp tải lên ngay. Không có (đang tạo): giữ tệp, tải lên khi lưu câu */
  question?: QuestionDetail;
  readOnly: boolean;
  disabled: boolean;
  pending: PendingMedia;
  onPendingChange: (kind: MediaKind, file: File | null) => void;
  /** Tải/gỡ tệp xong: câu có updatedAt mới (form cần cập nhật mốc để lần Lưu sau không bị 409) */
  onSaved: (previousUpdatedAt: string, saved: QuestionDetail) => void;
}

// Âm thanh & hình ảnh của câu: tải lên ngay trong form (ngoài cách nhập tệp .zip)
export function MediaFields({
  rule,
  question,
  readOnly,
  disabled,
  pending,
  onPendingChange,
  onSaved,
}: MediaFieldsProps) {
  const groupId = useWatch<QuestionFormValues, 'groupId'>({ name: 'groupId' });
  const [uploadMedia] = useUploadQuestionMediaMutation();
  const [removeMedia] = useRemoveQuestionMediaMutation();
  const kinds = questionMediaKinds(rule.skill, rule.part);
  const groupKinds = rule.group === 'required' ? groupMediaKinds(rule.skill, rule.part) : [];
  // Đổi Part trên form mà chưa lưu: server vẫn kiểm tra theo Part đã lưu, nên chờ lưu xong
  const partChanged = !!question && (question.skill !== rule.skill || question.part !== rule.part);
  const groupText = groupKinds.map((kind) => GROUP_MEDIA_TEXT[kind]).join(' và ');

  if (kinds.length === 0 && groupKinds.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0 text-subtle" />
        Part {rule.part} không dùng âm thanh hay hình ảnh.
      </p>
    );
  }

  const slot = (kind: MediaKind) => {
    const label = slotLabel(rule, kind);
    if (readOnly) {
      const url = kind === 'audio' ? question?.audioUrl : question?.imageUrl;
      return <QuestionMedia key={kind} kind={kind} url={url} label={label} />;
    }
    if (question) {
      return (
        <MediaUploadSlot
          key={kind}
          kind={kind}
          label={label}
          url={kind === 'audio' ? question.audioUrl : question.imageUrl}
          disabled={disabled || partChanged}
          onSelect={async (file) => {
            const { data } = await uploadMedia({ id: question.id, kind, body: { file } }).unwrap();
            onSaved(question.updatedAt, data);
          }}
          onRemove={async () => {
            const { data } = await removeMedia({ id: question.id, kind }).unwrap();
            onSaved(question.updatedAt, data);
          }}
        />
      );
    }
    return (
      <MediaUploadSlot
        key={kind}
        kind={kind}
        label={label}
        url={pending[kind]?.previewUrl}
        pendingName={pending[kind]?.file.name}
        disabled={disabled}
        onSelect={(file) => onPendingChange(kind, file)}
        onRemove={() => onPendingChange(kind, null)}
      />
    );
  };

  return (
    <div className="space-y-3">
      {partChanged && !readOnly && kinds.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Bạn vừa đổi kỹ năng/Part. Lưu thay đổi trước rồi mới tải tệp cho Part mới.
        </p>
      )}

      {kinds.length > 0 && (
        <div className="grid items-start gap-3 sm:grid-cols-2">{kinds.map(slot)}</div>
      )}

      {groupKinds.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-subtle" />
          <span>
            {groupText.charAt(0).toUpperCase() + groupText.slice(1)} dùng chung cho cả nhóm (Part{' '}
            {rule.part}) được tải lên ở trang nhóm câu.{' '}
            {groupId && (
              <Link
                to={groupPath(groupId)}
                className="inline-flex items-center gap-0.5 font-semibold text-primary hover:text-brand"
              >
                Mở nhóm câu
                <ArrowUpRight className="size-3.5" />
              </Link>
            )}
          </span>
        </p>
      )}

      {kinds.length > 0 && !readOnly && (
        <p className="text-xs text-subtle">
          {question
            ? 'Tệp được lưu ngay khi tải lên, không cần bấm Lưu thay đổi. '
            : 'Tệp được tải lên ngay sau khi lưu câu hỏi. '}
          Soạn nhiều câu có tệp cùng lúc thì dùng{' '}
          <Link to={IMPORT_PATH} className="font-semibold text-primary hover:text-brand">
            nhập câu hỏi từ tệp .zip
          </Link>
          .
        </p>
      )}
    </div>
  );
}
