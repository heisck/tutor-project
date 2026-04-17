'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  loadingText,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'font-medium transition-all duration-150 flex items-center justify-center gap-2 rounded-lg relative select-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] focus-visible:ring-[var(--amber)] ' +
    'active:scale-[0.985] disabled:pointer-events-none';

  const variants = {
    primary:
      'bg-gradient-to-br from-amber-400 to-amber-600 text-ink shadow-sm shadow-amber-900/20 ' +
      'hover:brightness-105 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/25',
    secondary:
      'bg-gradient-to-br from-ai-blue-200 to-ai-blue-400 text-ink shadow-sm shadow-sky-950/20 ' +
      'hover:brightness-105 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ai-blue/25',
    outline:
      'border border-[color:var(--surface-border)] bg-transparent text-[color:var(--cream)] ' +
      'hover:bg-[color:var(--surface-hover)] hover:border-[color:var(--amber)] hover:text-[color:var(--cream)]',
    ghost:
      'text-[color:var(--cream-muted)] bg-transparent hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--cream)]',
    gradient:
      'bg-gradient-to-r from-ai-blue-400 via-mastery-400 to-amber-400 text-ink font-bold shadow-lg shadow-ink/15 ' +
      'hover:brightness-[1.03] hover:-translate-y-0.5 hover:shadow-xl',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        (disabled || loading) &&
          'cursor-not-allowed opacity-60 shadow-none saturate-75 translate-y-0',
        className
      )}
      aria-busy={loading}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>{loadingText ?? children}</span>
        </>
      ) : icon ? (
        <>
          {icon}
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
