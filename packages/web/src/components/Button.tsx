'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'font-medium transition-all duration-200 flex items-center justify-center gap-2 rounded-lg';

  const variants = {
    primary: 'bg-gradient-to-br from-amber-400 to-amber-600 text-ink hover:shadow-lg hover:shadow-amber-500/30 active:scale-95',
    secondary: 'bg-gradient-to-br from-ai-blue-200 to-ai-blue-400 text-ink hover:shadow-lg hover:shadow-ai-blue/30 active:scale-95',
    outline: 'border-2 border-cream-400 text-cream hover:bg-cream-400/10 hover:border-cream-300',
    ghost: 'text-cream hover:bg-ink-700 hover:text-cream-50',
    gradient: 'bg-gradient-to-r from-ai-blue-400 via-mastery-400 to-amber-400 text-ink font-bold shadow-lg hover:shadow-xl active:scale-95',
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
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
