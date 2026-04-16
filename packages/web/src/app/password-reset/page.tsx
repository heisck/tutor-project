'use client';

import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export default function PasswordResetPage() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-ink-700 bg-ink-900/60 p-8 space-y-6">
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-300 flex items-center justify-center">
            <Mail size={20} />
          </div>
          <h1 className="text-3xl font-bold text-cream-50 font-fraunces">
            Password reset
          </h1>
          <p className="text-cream-300">
            Password reset is not configured in this environment yet. If you need
            access immediately, sign in with your existing password or contact the
            app administrator before deploying this flow publicly.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-ink-600 text-cream-200 hover:bg-ink-800 transition-colors"
            href="/signin"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
          <Link
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-ink font-medium"
            href="/signup"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
