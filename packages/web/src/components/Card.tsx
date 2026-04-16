'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'gradient';
  hover?: boolean;
}

export function Card({ children, variant = 'default', hover = true, className, ...props }: CardProps) {
  const variants = {
    default: 'bg-ink-800 border border-ink-700 shadow-md',
    elevated:
      'bg-gradient-to-br from-ink-700 to-ink-800 border border-ink-600 shadow-xl shadow-ink-900/50',
    glass:
      'bg-ink-800/60 backdrop-blur-md border border-ink-600/50 shadow-lg shadow-amber-950/20',
    gradient:
      'bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 border border-amber-500/20 shadow-lg shadow-amber-900/30',
  };

  return (
    <div
      className={cn(
        'rounded-lg p-6 transition-all duration-300',
        hover && 'hover:shadow-lg hover:border-amber-500/50',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function CardHeader({ title, description, icon }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className="text-xl font-semibold text-cream-50 font-fraunces flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {description && <p className="text-sm text-cream-400 mt-1">{description}</p>}
      </div>
    </div>
  );
}

export function CardContent({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  align?: 'start' | 'center' | 'end' | 'between';
}

export function CardFooter({ children, align = 'between' }: CardFooterProps) {
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={cn('flex gap-3 pt-4 border-t border-ink-700 mt-6', alignClasses[align])}>
      {children}
    </div>
  );
}
