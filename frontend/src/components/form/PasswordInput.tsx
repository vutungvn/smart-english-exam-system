import { useState, type ReactNode } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { IconInput, type IconInputProps } from './IconInput';

type PasswordInputProps = Omit<IconInputProps, 'type' | 'icon' | 'endAdornment'> & {
  icon?: ReactNode;
};

export function PasswordInput({ icon = <Lock />, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <IconInput
      {...props}
      icon={icon}
      type={visible ? 'text' : 'password'}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-600"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}
