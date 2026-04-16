'use client';

import type {
  AuthenticatedUser,
  CourseResponse,
  DocumentListItemResponse,
} from '@ai-tutor-pwa/shared';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { Button, Card, CardContent, CardFooter, CardHeader, Navbar } from '@/components';
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

      <div className="relative max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Simple greeting */}
        <div>
          <h1 className="text-3xl font-bold text-cream-50 font-fraunces mb-1">
            Welcome back, {user.username || user.email.split('@')[0]}
          </h1>
        </div>

        {pageError && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
            {pageError}
          </div>
        )}

        {/* Main action card */}
        {readyDocuments.length > 0 ? (
          // Continue Learning card (if documents exist)
          <Card variant="gradient">
            <CardHeader>
              <div>
                <p className="label-mono text-xs text-amber mb-2">Ready to learn</p>
                <h2 className="display-md text-cream-50 font-fraunces mb-1">
                  What would you like to study?
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {readyDocuments.slice(0, 3).map((document) => (
                  <button
                    key={document.documentId}
                    onClick={() => router.push('/session')}
                    className="w-full text-left p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all group"
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <BookOpen size={20} className="text-amber mt-1 shrink-0" />
                        <div>
                          <h3 className="font-semibold text-cream-50">
                            {document.fileName}
                          </h3>
                          <p className="text-xs text-cream-400 mt-1">
                            Start learning from this document
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-cream-400 group-hover:text-amber transition-colors shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => router.push('/upload')}
                size="sm"
                variant="outline"
              >
                Upload more
              </Button>
            </CardFooter>
          </Card>
        ) : (
          // Start Learning card (if no documents)
          <Card variant="gradient">
            <CardHeader>
              <div>
                <p className="label-mono text-xs text-amber mb-2">Get started</p>
                <h2 className="display-md text-cream-50 font-fraunces">
                  Upload your first document
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-cream-300 mb-6">
                Upload a PDF or document, and we&apos;ll guide you through learning its content.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => router.push('/upload')}
                size="sm"
                variant="primary"
              >
                Upload document <Upload size={16} />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Progress snapshot - minimal and non-interactive */}
        {readyDocuments.length > 0 && (
          <div className="text-center text-cream-400 text-sm py-4">
            <p>
              {readyDocuments.length > 0 && `${readyDocuments.length} document${readyDocuments.length !== 1 ? 's' : ''} ready`}
              {processingDocuments.length > 0 && ` • ${processingDocuments.length} processing`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
