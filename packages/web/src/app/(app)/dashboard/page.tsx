'use client';

import type {
  AuthenticatedUser,
  CourseResponse,
  DocumentListItemResponse,
} from '@ai-tutor-pwa/shared';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronRight, LoaderCircle, Upload } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Navbar,
  useToast,
} from '@/components';
import { api, ApiError } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [documents, setDocuments] = useState<DocumentListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

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
    try {
      setLoggingOut(true);
      await api.signOut();
      showToast({
        title: 'Signed out',
        description: 'Your session ended safely.',
        variant: 'success',
      });
      router.push('/');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sign out.';
      setPageError(message);
      showToast({
        title: 'Could not sign out',
        description: message,
        variant: 'error',
      });
    } finally {
      setLoggingOut(false);
    }
  }

  function startLesson(documentId: string) {
    setNavigatingTo(documentId);
    router.push(`/session?documentId=${documentId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="flex items-center gap-3 text-cream-300">
          <LoaderCircle className="animate-spin" size={18} />
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

      <Navbar user={user} onLogout={loggingOut ? undefined : handleLogout} />

      <div className="relative max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-cream-50 font-fraunces mb-1">
            Welcome back, {user.username || user.email.split('@')[0]}
          </h1>
          <p className="text-cream-400">
            Pick the next ready lesson or upload something new.
          </p>
        </div>

        {pageError && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
            {pageError}
          </div>
        )}

        {readyDocuments.length > 0 ? (
          <Card variant="gradient">
            <CardHeader
              title="Continue learning"
              description="Ready lessons open straight into tutoring."
            />
            <CardContent>
              <div className="space-y-3">
                {readyDocuments.slice(0, 3).map((document) => {
                  const opening = navigatingTo === document.documentId;

                  return (
                    <button
                      key={document.documentId}
                      onClick={() => startLesson(document.documentId)}
                      className="w-full text-left p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 active:scale-[0.99] transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                      disabled={opening}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <BookOpen
                            size={20}
                            className="text-amber mt-1 shrink-0"
                          />
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-cream-50">
                              {document.fileName}
                            </h3>
                            <p className="text-xs text-cream-400 mt-1">
                              {opening
                                ? 'Opening your lesson...'
                                : 'Start learning from this file'}
                            </p>
                          </div>
                        </div>
                        {opening ? (
                          <LoaderCircle
                            size={18}
                            className="animate-spin text-amber shrink-0"
                          />
                        ) : (
                          <ChevronRight
                            size={18}
                            className="text-cream-400 group-hover:text-amber transition-colors shrink-0"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
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
          <Card variant="gradient">
            <CardHeader
              title="Upload your first file"
              description="Bring in a document, then we will turn it into a lesson."
            />
            <CardContent>
              <p className="text-cream-300">
                PDF, notes, audio, and class material can all become guided study
                sessions here.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => router.push('/upload')}
                size="sm"
                variant="primary"
              >
                Upload file <Upload size={16} />
              </Button>
            </CardFooter>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-cream-400">
          <Badge variant="info" size="sm">
            {courses.length} course{courses.length === 1 ? '' : 's'}
          </Badge>
          <span>
            {readyDocuments.length} ready
            {processingDocuments.length > 0
              ? ` • ${processingDocuments.length} preparing`
              : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
