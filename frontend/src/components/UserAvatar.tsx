import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/user-display';

interface UserAvatarProps {
  fullName: string;
  avatarUrl?: string | null;
  className?: string;
}

// Ảnh Google trả về cỡ 96px ("...=s96-c"), xin cỡ 256px để avatar lớn không bị mờ trên màn hình nét
function sharpenGoogleAvatar(url: string): string {
  return url.includes('googleusercontent.com') ? url.replace(/=s\d+-c$/, '=s256-c') : url;
}

// Ảnh đại diện (tài khoản Google lấy ảnh từ Google); chưa có ảnh hoặc ảnh lỗi thì hiện chữ cái đầu
export function UserAvatar({ fullName, avatarUrl, className }: UserAvatarProps) {
  // Nhớ URL bị lỗi thay vì cờ boolean: đổi sang ảnh khác thì tự thử tải lại
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = avatarUrl && avatarUrl !== failedUrl ? avatarUrl : null;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-bold text-brand',
        className,
      )}
    >
      {imageUrl ? (
        <img
          src={sharpenGoogleAvatar(imageUrl)}
          alt=""
          // Ảnh trên googleusercontent.com hay trả 403 khi request có Referer từ trang khác
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        getInitials(fullName)
      )}
    </span>
  );
}
