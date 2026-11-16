import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { FieldError } from './FieldError';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode; // nội dung bên phải nhãn (link, ghi chú)
  error?: string;
  children: ReactNode;
}

export function FormField({ id, label, required, hint, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="gap-1 text-xs font-semibold text-slate-700">
          {label}
          {required && <span className="text-rose-500">*</span>}
        </Label>
        {hint}
      </div>
      {children}
      <FieldError message={error} />
    </div>
  );
}
