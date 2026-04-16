'use client';

import type {
  AuthenticatedUser,
  CourseResponse,
  DocumentListItemResponse,
} from '@ai-tutor-pwa/shared';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Clock,
  Settings,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react';
import { Button, Card, CardContent, CardFooter, CardHeader, Navbar, Stat } from '@/components';
import { api, ApiError } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [documents, setDocuments] = useState<DocumentListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const readyDocuments = useMemo(
    () => documents.filter((document) => document.processingStatus === 'complete'),
    [documents],
  );
  const processingDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          document.processingStatus !== 'complete' &&
          document.processingStatus !== 'failed',
      ),
    [documents],
  );

  useEffect(() => {
    async function initialize() {
      try {
        const [session, nextCourses, nextDocuments] = await Promise.all([
          api.getSession(),
          api.listCourses(),
          api.listDocuments(),
        ]);
        setUser(session.user);
        setCourses(nextCourses);
        setDocuments(nextDocuments);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push('/signin');
          return;
        }

        setPageError(
          error instanceof Error
            ? error.message
            : 'Failed to load your dashboard.',
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [router]);

  async function handleLogout() {
    await api.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="text-center text-cream-300">
          Loading your learning space...
        </div>
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  return (
    <div className="min-h-screen bg-ink">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-ai-blue-600/5 rounded-full blur-3xl" />
      </div>

      <Navbar user={user} onLogout={handleLogout} />

      <div className="relative max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-gradient-to-r from-ink-800 via-ink-700 to-ink-800 rounded-xl p-8 border border-amber-500/20 shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-transparent" />
          </div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold text-cream-50 font-fraunces mb-2">
              Welcome back, {user.username || user.email.split('@')[0]}
            </h1>
            <p className="text-cream-300 text-lg">
              Your dashboard is now connected to live course and document data.
            </p>
          </div>
        </div>

        {pageError && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
            {pageError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Stat
            icon={<BookOpen size={20} />}
            label="Courses"
            value={courses.length}
          />
          <Stat
            icon={<TrendingUp size={20} />}
            label="Ready Documents"
            value={readyDocuments.length}
          />
          <Stat
            icon={<Clock size={20} />}
            label="Processing"
            value={processingDocuments.length}
          />
          <Stat
            icon={<Zap size={20} />}
            label="Failed"
            value={documents.filter((document) => document.processingStatus === 'failed').length}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card variant="gradient">
              <CardHeader
                description="Real courses returned by the backend profile routes."
                title="Courses"
              />
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen size={32} className="mx-auto mb-3 text-cream-400 opacity-50" />
                    <p className="text-cream-400">No courses yet</p>
                    <p className="text-cream-500 text-sm mt-1">
                      Create a course to organize future uploads.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courses.slice(0, 4).map((course) => (
                      <div
                        key={course.id}
                        className="rounded-lg border border-ink-700 bg-ink-900/40 p-5"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-cream-50 font-fraunces">
                              {course.name}
                            </h3>
                            <p className="text-sm text-cream-400">
                              {course.code ?? 'No code'} • {course.level ?? 'No level'}
                            </p>
                          </div>
                          <p className="text-sm text-cream-500">
                            Updated {formatRelativeTime(course.updatedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => router.push('/courses')}
                  size="sm"
                  variant="outline"
                >
                  View All Courses
                </Button>
                <Button
                  onClick={() => router.push('/session')}
                  size="sm"
                  variant="primary"
                >
                  Start Session <ArrowUpRight size={16} />
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-6">
            <Card variant="elevated">
              <CardHeader title="Quick Actions" />
              <CardContent>
                <div className="space-y-3">
                  <button
                    className="w-full p-3 rounded-lg bg-gradient-to-r from-mastery-500/20 to-mastery-600/20 border border-mastery-500/50 text-mastery-300 hover:bg-mastery-500/30 transition-all flex items-center justify-between group"
                    onClick={() => router.push('/session')}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      <Zap size={18} />
                      Start Session
                    </span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    className="w-full p-3 rounded-lg bg-gradient-to-r from-ai-blue-500/20 to-ai-blue-600/20 border border-ai-blue-500/50 text-ai-blue-300 hover:bg-ai-blue-500/30 transition-all flex items-center justify-between group"
                    onClick={() => router.push('/upload')}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      <Upload size={18} />
                      Upload Content
                    </span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    className="w-full p-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 transition-all flex items-center justify-between group"
                    onClick={() => router.push('/settings')}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      <Settings size={18} />
                      Settings
                    </span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader
                description="The most recent uploaded documents in your workspace."
                title="Recent Documents"
              />
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-cream-400 text-sm">
                    No documents uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {documents.slice(0, 3).map((document) => (
                      <div
                        key={document.documentId}
                        className="rounded-lg border border-ink-700 bg-ink-900/40 p-4"
                      >
                        <p className="text-sm font-medium text-cream-50">
                          {document.fileName}
                        </p>
                        <p className="text-xs text-cream-500 mt-1">
                          {document.processingStatus} • Updated {formatRelativeTime(document.updatedAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
