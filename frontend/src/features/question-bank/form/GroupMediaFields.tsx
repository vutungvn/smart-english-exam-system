import { Link } from 'react-router';
import { Info } from 'lucide-react';
import {
  useRemoveQuestionGroupMediaMutation,
  useUploadQuestionGroupMediaMutation,
  type QuestionGroupDetail,
} from '@/api/generated';
import { MediaUploadSlot } from '@/components/media/MediaUploadSlot';
import { IMPORT_PATH } from '@/features/question-import/import-meta';
import type { MediaKind } from '@/lib/media-file';
import { groupMediaKinds, groupMediaLabel, groupMediaOptional, type PartRule } from '../toeic';
import type { PendingMedia } from './use-pending-media';

interface GroupMediaFieldsProps {
  rule: PartRule;
  /** Có khi sửa nhóm đã lưu: tệp tải lên ngay. Không có (đang tạo): giữ tệp, tải lên khi tạo nhóm */
  group?: QuestionGroupDetail;
  disabled: boolean;
  pending: PendingMedia;
  onPendingChange: (kind: MediaKind, file: File | null) => void;
  /** Tải/gỡ tệp xong: nhóm có updatedAt mới (form cần cập nhật mốc để lần Lưu sau không bị 409) */
  onSaved: (previousUpdatedAt: string, saved: QuestionGroupDetail) => void;
}

// Âm thanh & hình ảnh dùng chung của nhóm: tải lên ngay trong form (giống form câu hỏi)
export function GroupMediaFields({
  rule,
  group,
  disabled,
  pending,
  onPendingChange,
  onSaved,
}: GroupMediaFieldsProps) {
  const [uploadMedia] = useUploadQuestionGroupMediaMutation();
  const [removeMedia] = useRemoveQuestionGroupMediaMutation();
  const kinds = groupMediaKinds(rule.skill, rule.part);
  const listening = rule.skill === 'LISTENING';

  if (kinds.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0 text-subtle" />
        Nhóm Part {rule.part} không dùng âm thanh hay hình ảnh.
      </p>
    );
  }

  const slot = (kind: MediaKind) => {
    const common = {
      kind,
      label: groupMediaLabel(rule.skill, rule.part, kind),
      optional: groupMediaOptional(kind),
      owner: 'nhóm câu',
      disabled,
    };
    if (group) {
      return (
        <MediaUploadSlot
          key={kind}
          {...common}
          url={kind === 'audio' ? group.audioUrl : group.imageUrl}
          onSelect={async (file) => {
            const { data } = await uploadMedia({ id: group.id, kind, body: { file } }).unwrap();
            onSaved(group.updatedAt, data);
          }}
          onRemove={async () => {
            const { data } = await removeMedia({ id: group.id, kind }).unwrap();
            onSaved(group.updatedAt, data);
          }}
        />
      );
    }
    return (
      <MediaUploadSlot
        key={kind}
        {...common}
        url={pending[kind]?.previewUrl}
        pendingName={pending[kind]?.file.name}
        onSelect={(file) => onPendingChange(kind, file)}
        onRemove={() => onPendingChange(kind, null)}
      />
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid items-start gap-3 sm:grid-cols-2">{kinds.map(slot)}</div>

      {listening && (
        <p className="flex items-start gap-2 text-xs text-subtle">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Âm thanh phải khớp đúng lời thoại; nhóm thiếu âm thanh vẫn lưu được nhưng đề thi sẽ cảnh
          báo khi xuất bản. Hình ảnh chỉ cần khi có câu hỏi về biểu đồ, bảng.
        </p>
      )}

      <p className="text-xs text-subtle">
        {group
          ? 'Tệp được lưu ngay khi tải lên, không cần bấm Lưu thay đổi. '
          : 'Tệp được tải lên ngay sau khi tạo nhóm. '}
        Soạn nhiều nhóm có tệp cùng lúc thì dùng{' '}
        <Link to={IMPORT_PATH} className="font-semibold text-primary hover:text-brand">
          nhập câu hỏi từ tệp .zip
        </Link>
        .
      </p>
    </div>
  );
}
