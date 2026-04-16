'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variants = {
    default: 'bg-amber-500/20 text-amber-300 border border-amber-500/50',
    success: 'bg-mastery-500/20 text-mastery-300 border border-mastery-500/50',
    warning: 'bg-amber-600/20 text-amber-200 border border-amber-600/50',
    error: 'bg-red-500/20 text-red-300 border border-red-500/50',
    info: 'bg-ai-blue-500/20 text-ai-blue-300 border border-ai-blue-500/50',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full font-medium', variants[variant], sizes[size])}>
      {children}
    </span>
  );
}

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning';
  showLabel?: boolean;
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
}: ProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const variantClasses = {
    default: 'from-amber-400 to-amber-600',
    success: 'from-mastery-400 to-mastery-600',
    warning: 'from-amber-500 to-red-500',
  };

  return (
    <div>
      <div
        className={cn('w-full bg-ink-700 rounded-full overflow-hidden shadow-inner', sizeClasses[size])}
      >
        <div
          className={cn(
            'h-full bg-gradient-to-r transition-all duration-500 ease-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-cream-400 mt-1">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
}

interface StatProps {
  label: string;
  value: string | number;
  trend?: number;
  icon?: ReactNode;
}

export function Stat({ label, value, trend, icon }: StatProps) {
  const isPositive = trend && trend > 0;

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-ink-700 to-ink-800 border border-ink-600">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-cream-400 font-medium">{label}</p>
        {icon && <div className="text-amber-500">{icon}</div>}
      </div>
      <p className="text-2xl font-bold text-cream-50 font-fraunces">{value}</p>
      {trend !== undefined && (
        <p className={cn('text-xs mt-2', isPositive ? 'text-mastery-400' : 'text-red-400')}>
          {isPositive ? '↑' : '↓'} {Math.abs(trend)}% from last month
        </p>
      )}
    </div>
  );
}
