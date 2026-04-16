'use client';

import { ACADEMIC_LEVELS, type AuthenticatedUser, type UserProfileResponse } from '@ai-tutor-pwa/shared';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, Navbar } from '@/components';
import { api, ApiError } from '@/lib/api';

interface ProfileFormState {
  department: string;
  institutionCountry: string;
  institutionName: string;
  institutionType: string;
  level: string;
  username: string;
}

function toProfileFormState(profile: UserProfileResponse): ProfileFormState {
  return {
    department: profile.department ?? '',
    institutionCountry: profile.institution?.country ?? '',
    institutionName: profile.institution?.name ?? '',
    institutionType: profile.institution?.type ?? '',
    level: profile.level ?? '',
    username: profile.username ?? '',
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [formState, setFormState] = useState<ProfileFormState>({
    department: '',
    institutionCountry: '',
    institutionName: '',
    institutionType: '',
    level: '',
    username: '',
  });
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        const [session, nextProfile] = await Promise.all([
          api.getSession(),
          api.getProfile(),
        ]);
        setUser(session.user);
        setProfile(nextProfile);
        setFormState(toProfileFormState(nextProfile));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push('/signin');
          return;
        }

        setPageError(
          error instanceof Error ? error.message : 'Failed to load settings.',
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

  async function saveProfile() {
    try {
      setSaving(true);
      setPageError(null);
      setSuccessMessage(null);

      const updatedProfile = await api.updateProfile({
        department:
          formState.department.trim().length === 0 ? null : formState.department.trim(),
        institution:
          formState.institutionName.trim().length === 0
            ? null
            : {
                country:
                  formState.institutionCountry.trim().length === 0
                    ? null
                    : formState.institutionCountry.trim(),
                name: formState.institutionName.trim(),
                type:
                  formState.institutionType.trim().length === 0
                    ? null
                    : formState.institutionType.trim(),
              },
        level:
          formState.level.trim().length === 0
            ? null
            : (formState.level as UserProfileResponse['level']),
        username:
          formState.username.trim().length === 0 ? null : formState.username.trim(),
      });

      setProfile(updatedProfile);
      setFormState(toProfileFormState(updatedProfile));
      setSuccessMessage('Profile settings saved.');
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to save profile settings.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-cream-300">
        Loading settings...
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
            Settings
          </h1>
          <p className="text-lg text-cream-300">
            These values are used by session creation and profile-aware tutoring.
          </p>
        </div>

        {pageError && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
            {pageError}
          </div>
        )}

        {successMessage && (
          <div className="px-4 py-3 rounded-lg bg-mastery-500/10 border border-mastery-500/20 text-mastery-300">
            {successMessage}
          </div>
        )}

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
          <Card variant="gradient">
            <CardHeader
              description="Update the persisted profile returned by the backend profile routes."
              title="Profile"
            />
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
                    Username
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 text-cream-50"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        username: event.target.value,
                      }))
                    }
                    type="text"
                    value={formState.username}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
                    Department
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 text-cream-50"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        department: event.target.value,
                      }))
                    }
                    type="text"
                    value={formState.department}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
                    Academic Level
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 text-cream-50"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        level: event.target.value,
                      }))
                    }
                    value={formState.level}
                  >
                    <option value="">Not set</option>
                    {ACADEMIC_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
                    Institution Name
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 text-cream-50"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        institutionName: event.target.value,
                      }))
                    }
                    type="text"
                    value={formState.institutionName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
                    Institution Type
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 text-cream-50"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        institutionType: event.target.value,
                      }))
                    }
                    type="text"
                    value={formState.institutionType}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream-200 mb-2 font-fraunces">
                    Institution Country
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-ink-700 text-cream-50"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        institutionCountry: event.target.value,
                      }))
                    }
                    type="text"
                    value={formState.institutionCountry}
                  />
                </div>
              </div>
            </CardContent>
            <div className="pt-6">
              <Button
                className="w-full"
                loading={saving}
                onClick={() => void saveProfile()}
                variant="primary"
              >
                Save Settings
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader
              description="Current profile values coming back from the API."
              title="Snapshot"
            />
            <CardContent>
              <div className="space-y-4 text-sm text-cream-300">
                <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
                  <p className="text-cream-400 mb-1">Email</p>
                  <p>{profile?.email ?? user.email}</p>
                </div>
                <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
                  <p className="text-cream-400 mb-1">Username</p>
                  <p>{profile?.username ?? 'Not set'}</p>
                </div>
                <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
                  <p className="text-cream-400 mb-1">Academic Level</p>
                  <p>{profile?.level ?? 'Not set'}</p>
                </div>
                <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
                  <p className="text-cream-400 mb-1">Institution</p>
                  <p>{profile?.institution?.name ?? 'Not set'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
