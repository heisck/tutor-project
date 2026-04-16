'use client';

import type { AuthenticatedUser, CourseResponse } from '@ai-tutor-pwa/shared';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, Navbar } from '@/components';
import { api, ApiError } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

export default function CoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [level, setLevel] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        const [session, nextCourses] = await Promise.all([
          api.getSession(),
          api.listCourses(),
        ]);
        setUser(session.user);
        setCourses(nextCourses);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push('/signin');
          return;
        }

        setPageError(
          error instanceof Error ? error.message : 'Failed to load courses.',
        );
      } finally {
        setInitializing(false);
      }
    }

    void initialize();
  }, [router]);

  async function handleLogout() {
    await api.signOut();
    router.push('/');
  }

  async function createCourse() {
    if (name.trim().length === 0) {
      setPageError('Course name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setPageError(null);
      const createdCourse = await api.createCourse({
        code: code.trim().length === 0 ? null : code.trim(),
        level: level.trim().length === 0 ? null : level.trim(),
        name: name.trim(),
      });
      setCourses((currentCourses) => [createdCourse, ...currentCourses]);
      setName('');
      setCode('');
      setLevel('');
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to create course.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-cream-300">
        Loading courses...
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  return (
    <div className="min-h-screen bg-ink">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-cream-50 font-fraunces mb-2">
            Courses
          </h1>
          <p className="text-lg text-cream-300">
            Organize your study material by course and keep the dashboard tied to
            real data.
          </p>
        </div>

        {pageError && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
            {pageError}
          </div>
        )}

        <Card>
          <CardHeader
            description="Courses help organize your materials by subject."
            title={`Your Courses (${courses.length})`}
          />
            <CardContent>
              {courses.length === 0 ? (
                <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-6 text-cream-400">
                  No courses yet. Create one here and it will immediately show up
                  on the dashboard.
                </div>
              ) : (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-lg border border-ink-700 bg-ink-900/40 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <BookOpen size={16} className="text-amber-400" />
                            <h2 className="text-lg font-semibold text-cream-50 font-fraunces">
                              {course.name}
                            </h2>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-cream-400">
                            <span>{course.code ?? 'No code'}</span>
                            <span>{course.level ?? 'No level'}</span>
                            <span>Updated {formatRelativeTime(course.updatedAt)}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => router.push('/upload')}
                          variant="outline"
                        >
                          Upload Material
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader title="Add Course (Optional)" />
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-cream-400 mb-4">
                Create course shells to organize materials, or just upload documents directly.
              </p>
              <div>
                <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
                  Course Name
                </label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 text-cream-50"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Introduction to Computing"
                  type="text"
                  value={name}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
                  Course Code
                </label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 text-cream-50"
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="CSC101"
                  type="text"
                  value={code}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
                  Level
                </label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 text-cream-50"
                  onChange={(event) => setLevel(event.target.value)}
                  placeholder="100"
                  type="text"
                  value={level}
                />
              </div>
              <Button
                className="w-full"
                loading={submitting}
                onClick={() => void createCourse()}
                variant="primary"
              >
                <Plus size={16} />
                Create Course
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
