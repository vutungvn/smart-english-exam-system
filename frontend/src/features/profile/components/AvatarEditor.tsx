import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { DropdownMenu } from 'radix-ui';
import { Camera, CircleAlert, CircleCheck, ImagePlus, ImageUp, Trash2 } from 'lucide-react';
import { useRemoveAvatarMutation, useUploadAvatarMutation } from '@/api/generated';
import { FormAlert } from '@/components/form/FormAlert';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { useAppDispatch } from '@/hooks/hooks';
import { cn } from '@/lib/utils';
import { userUpdated } from '@/store/slice/auth-slice';
import { AVATAR_ACCEPT, describeAvatarError, formatFileSize, validateAvatarFile } from '../avatar';
import { useSavedFlag } from '../hooks/use-saved-flag';
import { ProfileDialog } from './ProfileDialog';

// Ảnh vừa chọn, chờ xem trước rồi mới tải lên; id đổi theo mỗi lần chọn để làm mới hộp thoại
interface PendingImage {
  id: number;
  file: File;
  previewUrl: string;
  error: string | null;
}

const menuItemClass =
  'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium outline-none select-none';

interface AvatarEditorProps {
  fullName: string;
  avatarUrl: string | null;
}

// Avatar trên thẻ danh tính kèm nút đổi ảnh: tải ảnh mới (xem trước rồi mới lưu) hoặc xóa ảnh
export function AvatarEditor({ fullName, avatarUrl }: AvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImage | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const { saved, markSaved } = useSavedFlag(4000);

  // Giải phóng URL xem trước khi chọn ảnh khác hoặc đóng hộp thoại.
  // Chỉ chạy khi URL đổi (không chạy lúc mount) nên StrictMode không thu hồi nhầm URL đang dùng.
  const previewUrl = pending?.previewUrl;
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const pickFile = () => inputRef.current?.click();

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Xóa giá trị để chọn lại đúng tệp vừa chọn vẫn kích hoạt onChange
    event.target.value = '';
    if (!file) return;
    setPending({
      id: Date.now(),
      file,
      previewUrl: URL.createObjectURL(file),
      error: validateAvatarFile(file),
    });
  };

  return (
    <div className="relative flex flex-col items-center">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Đổi ảnh đại diện"
            className="group relative rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            <UserAvatar
              fullName={fullName}
              avatarUrl={avatarUrl}
              className="size-24 border-4 border-white text-3xl shadow-md"
            />
            {/* Lớp phủ khi rê chuột (máy tính); nút máy ảnh nhỏ luôn hiện cho màn cảm ứng */}
            <span className="absolute inset-1 flex items-center justify-center rounded-full bg-slate-900/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100">
              <Camera className="size-6" />
            </span>
            <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-md transition-colors group-hover:bg-brand">
              <Camera className="size-4" />
            </span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="center"
            sideOffset={8}
            collisionPadding={16}
            className="z-50 w-56 rounded-2xl border border-border bg-white p-1.5 shadow-xl shadow-slate-900/10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <DropdownMenu.Item
              onSelect={pickFile}
              className={cn(
                menuItemClass,
                'text-foreground data-highlighted:bg-accent data-highlighted:text-brand',
              )}
            >
              <ImageUp className="size-4" />
              {avatarUrl ? 'Tải ảnh mới' : 'Tải ảnh lên'}
            </DropdownMenu.Item>
            {avatarUrl && (
              <DropdownMenu.Item
                onSelect={() => setConfirmingRemove(true)}
                className={cn(menuItemClass, 'text-destructive data-highlighted:bg-danger-soft')}
              >
                <Trash2 className="size-4" />
                Xóa ảnh đại diện
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        onChange={onFileChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />

      {/* Nhãn xác nhận nổi trên dải gradient phía trên avatar, không đẩy bố cục */}
      <p role="status" className="absolute -top-9 left-1/2 -translate-x-1/2">
        {saved && (
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold whitespace-nowrap text-success shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1">
            <CircleCheck className="size-3.5" />
            Đã cập nhật ảnh đại diện
          </span>
        )}
      </p>

      {pending && (
        <UploadDialog
          key={pending.id}
          image={pending}
          fullName={fullName}
          onPickAnother={pickFile}
          onClose={() => setPending(null)}
          onSaved={() => {
            setPending(null);
            markSaved();
          }}
        />
      )}

      <RemoveDialog
        open={confirmingRemove}
        onOpenChange={setConfirmingRemove}
        onRemoved={() => {
          setConfirmingRemove(false);
          markSaved();
        }}
      />
    </div>
  );
}

interface UploadDialogProps {
  image: PendingImage;
  fullName: string;
  onPickAnother: () => void;
  onClose: () => void;
  onSaved: () => void;
}

function UploadDialog({ image, fullName, onPickAnother, onClose, onSaved }: UploadDialogProps) {
  const dispatch = useAppDispatch();
  const [uploadAvatar, { isLoading, error, reset }] = useUploadAvatarMutation();

  const save = async () => {
    try {
      const { data } = await uploadAvatar({ file: image.file }).unwrap();
      // Thanh trên, menu tài khoản đổi ảnh ngay; thẻ hồ sơ tự tải lại nhờ tag 'Me'
      dispatch(userUpdated({ avatarUrl: data.avatarUrl }));
      onSaved();
    } catch {
      // Lỗi hiện trong hộp thoại qua `error` của hook
    }
  };

  return (
    <ProfileDialog
      open
      onOpenChange={(open) => !open && onClose()}
      busy={isLoading}
      title="Cập nhật ảnh đại diện"
      description="Ảnh được cắt vuông ở giữa và hiển thị dạng tròn trên toàn hệ thống."
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            className="mr-auto h-10 rounded-xl px-3 text-primary"
            disabled={isLoading}
            onClick={onPickAnother}
          >
            <ImagePlus />
            Chọn ảnh khác
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4"
            disabled={isLoading}
            onClick={onClose}
          >
            Hủy
          </Button>
          {!image.error && (
            <SubmitButton
              type="button"
              loading={isLoading}
              className="h-10 w-auto px-5 text-sm"
              onClick={() => void save()}
            >
              Lưu ảnh
            </SubmitButton>
          )}
        </>
      }
    >
      {image.error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-destructive/40 bg-danger-soft/40 px-4 py-8 text-center">
          <CircleAlert className="size-8 text-destructive" />
          <p className="text-sm font-medium text-on-danger-soft">{image.error}</p>
          <p className="max-w-60 truncate text-xs text-subtle" title={image.file.name}>
            {image.file.name}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div className="flex items-end gap-6">
            <img
              src={image.previewUrl}
              alt="Xem trước ảnh đại diện"
              className="size-40 rounded-full border-4 border-white object-cover shadow-lg ring-1 ring-border"
            />
            {/* Cỡ nhỏ như trên thanh trên, để biết ảnh còn nhận ra được khi thu nhỏ */}
            <div className="flex flex-col items-center gap-1.5">
              <img
                src={image.previewUrl}
                alt=""
                className="size-10 rounded-full border-2 border-primary object-cover"
              />
              <span className="text-[11px] text-subtle">Thanh trên</span>
            </div>
          </div>
          <p className="flex max-w-full items-center gap-2 text-xs text-subtle">
            <span className="truncate" title={image.file.name}>
              {image.file.name}
            </span>
            <span className="shrink-0">· {formatFileSize(image.file.size)}</span>
          </p>
          <span className="sr-only">Ảnh của {fullName}</span>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <FormAlert message={describeAvatarError(error)} onClose={reset} />
        </div>
      )}
    </ProfileDialog>
  );
}

interface RemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
}

function RemoveDialog({ open, onOpenChange, onRemoved }: RemoveDialogProps) {
  const dispatch = useAppDispatch();
  const [removeAvatar, { isLoading, error, reset }] = useRemoveAvatarMutation();

  const remove = async () => {
    try {
      await removeAvatar().unwrap();
      dispatch(userUpdated({ avatarUrl: null }));
      onRemoved();
    } catch {
      // Lỗi hiện trong hộp thoại qua `error` của hook
    }
  };

  return (
    <ProfileDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      busy={isLoading}
      title="Xóa ảnh đại diện?"
      description="Hệ thống sẽ hiển thị chữ cái đầu trong họ tên của bạn thay cho ảnh. Bạn có thể tải ảnh mới bất cứ lúc nào."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <SubmitButton
            type="button"
            loading={isLoading}
            className="h-10 w-auto bg-none bg-destructive px-5 text-sm shadow-destructive/30 hover:bg-destructive/90"
            onClick={() => void remove()}
          >
            <Trash2 />
            Xóa ảnh
          </SubmitButton>
        </>
      }
    >
      {error ? (
        <FormAlert message={describeAvatarError(error)} onClose={reset} />
      ) : (
        <p className="text-sm text-muted-foreground">Ảnh hiện tại sẽ bị xóa khỏi hệ thống.</p>
      )}
    </ProfileDialog>
  );
}
