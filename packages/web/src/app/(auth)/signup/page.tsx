'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button, useToast } from '@/components';

const PASSWORD_REQS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
];

export default function SignUpPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = PASSWORD_REQS.every((r) => r.test(password));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid) return;
    setError(null);
    setIsLoading(true);
    try {
      await api.signUp(email, password);
      showToast({
        title: 'Account created',
        description: 'Your learning space is ready.',
        variant: 'success',
      });
      router.push('/dashboard');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Sign up failed. Please try again.';
      setError(message);
      showToast({
        title: 'Could not create account',
        description: message,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleOAuth() {
    try {
      setOauthLoading(true);
      const { authorizationUrl } = await api.getGoogleOAuthUrl();
      window.location.href = authorizationUrl;
    } catch {
      const message = 'Failed to start Google sign in.';
      setError(message);
      showToast({
        title: 'Google sign in unavailable',
        description: message,
        variant: 'error',
      });
      setOauthLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[50vw] h-[50vh] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #f0a050 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ede8df 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
      </div>

      <div className="relative w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-amber flex items-center justify-center">
            <BookOpen size={18} className="text-ink" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-700 text-cream">Studium</span>
        </div>

        <div className="card p-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-700 text-cream mb-2">
              Start learning.
            </h1>
            <p className="text-cream-muted" style={{ fontFamily: 'var(--font-source-serif)' }}>
              Free forever. No credit card needed.
            </p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleOAuth}
            disabled={oauthLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-surface-border bg-surface-hover hover:bg-surface-active transition-colors mb-6"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
              <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
              <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
              <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
            </svg>
            <span className="font-mono text-sm text-cream">
              {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
            </span>
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="label-mono text-xs text-cream-muted">or</span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-mono text-xs text-cream-muted block mb-2">Email</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label-mono text-xs text-cream-muted block mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password requirements */}
              {password.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {PASSWORD_REQS.map((req) => {
                    const met = req.test(password);
                    return (
                      <div key={req.label} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          met ? 'bg-mastery' : 'border border-surface-border'
                        }`}>
                          {met && <Check size={10} className="text-ink" strokeWidth={3} />}
                        </div>
                        <span className={`font-mono text-xs transition-colors ${met ? 'text-mastery' : 'text-cream-muted'}`}>
                          {req.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400 font-mono">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={!passwordValid || oauthLoading}
              loading={isLoading}
              loadingText="Creating account..."
              className="w-full justify-center py-3 mt-2"
            >
              Create account
              <ArrowRight size={16} />
            </Button>
          </form>

          <p className="text-xs text-cream-muted text-center mt-5" style={{ fontFamily: 'var(--font-source-serif)' }}>
            By signing up you agree to our{' '}
            <Link href="/terms" className="text-amber hover:underline">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-amber hover:underline">Privacy Policy</Link>.
          </p>

          <p className="text-center mt-5 text-sm text-cream-muted" style={{ fontFamily: 'var(--font-source-serif)' }}>
            Already have an account?{' '}
            <Link href="/signin" className="text-amber hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
