'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  hint?: string;
}

export function Input({ label, error, icon, hint, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500">{icon}</div>}
        <input
          className={cn(
            'w-full px-4 py-3 rounded-lg transition-all duration-200',
            'bg-ink-800 border border-ink-700 text-cream-50 placeholder-cream-600',
            'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
            'hover:border-ink-600',
            error && 'border-red-500 focus:ring-red-500/20',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-xs text-cream-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full px-4 py-3 rounded-lg transition-all duration-200',
          'bg-ink-800 border border-ink-700 text-cream-50 placeholder-cream-600',
          'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
          'hover:border-ink-600',
          'resize-none',
          error && 'border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-cream-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full px-4 py-3 rounded-lg transition-all duration-200',
          'bg-ink-800 border border-ink-700 text-cream-50',
          'focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
          'hover:border-ink-600',
          'cursor-pointer',
          error && 'border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
