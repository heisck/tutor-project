'use client';

import {
  ACADEMIC_LEVELS,
  type AuthenticatedUser,
  type UserProfileResponse,
} from '@ai-tutor-pwa/shared';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Palette, Save, Sun, UserCircle2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Navbar,
  useTheme,
  useToast,
} from '@/components';
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

function SettingsField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-cream-200">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { showToast } = useToast();
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
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const hasChanges = useMemo(() => {
    if (profile === null) {
      return false;
    }

    const normalizedCurrent = JSON.stringify(toProfileFormState(profile));
    const normalizedNext = JSON.stringify(formState);
    return normalizedCurrent !== normalizedNext;
  }, [formState, profile]);

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

  async function saveProfile() {
    try {
      setSaving(true);
      setPageError(null);

      const updatedProfile = await api.updateProfile({
        department:
          formState.department.trim().length === 0
            ? null
            : formState.department.trim(),
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
          formState.username.trim().length === 0
            ? null
            : formState.username.trim(),
      });

      setProfile(updatedProfile);
      setFormState(toProfileFormState(updatedProfile));
      showToast({
        title: 'Settings saved',
        description: 'Your profile is ready for the next session.',
        variant: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save profile settings.';
      setPageError(message);
      showToast({
        title: 'Could not save settings',
        description: message,
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleThemeToggle() {
    toggleTheme();
    showToast({
      title: `Switched to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`,
      description: 'You can change this again anytime.',
      variant: 'info',
    });
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
      <Navbar user={user} onLogout={loggingOut ? undefined : handleLogout} />

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div className="space-y-3">
          <Badge variant="info" size="sm">
            Account and appearance
          </Badge>
          <div>
            <h1 className="text-4xl font-bold text-cream-50 font-fraunces mb-2">
              Settings
            </h1>
            <p className="text-lg text-cream-300">
              Keep your profile current and make the workspace comfortable to use.
            </p>
          </div>
        </div>

        {pageError && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
            {pageError}
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <Card variant="gradient">
            <CardHeader
              title="Learning profile"
              description="These details shape how sessions are prepared for you."
              icon={<UserCircle2 className="text-amber-300" size={20} />}
            />
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <SettingsField label="Username">
                  <input
                    className="input w-full"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        username: event.target.value,
                      }))
                    }
                    type="text"
                    value={formState.username}
                  />
                </SettingsField>
                <SettingsField label="Department">
                  <input
                    className="input w-full"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        department: event.target.value,
                      }))
                    }
                    type="text"
                    value={formState.department}
                  />
                </SettingsField>
                <SettingsField label="Academic level">
                  <select
                    className="input w-full"
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
                </SettingsField>
                <SettingsField label="Institution name">
                  <input
                    className="input w-full"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        institutionName: event.target.value,
                      }))
                    }
                    type="text"
                    value={formState.institutionName}
                  />
                </SettingsField>
                <SettingsField label="Institution type">
                  <input
                    className="input w-full"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        institutionType: event.target.value,
                      }))
                    }
                    type="text"
                    value={formState.institutionType}
                  />
                </SettingsField>
                <SettingsField label="Institution country">
                  <input
                    className="input w-full"
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        institutionCountry: event.target.value,
                      }))
                    }
                    type="text"
                    value={formState.institutionCountry}
                  />
                </SettingsField>
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  className="min-w-[180px]"
                  disabled={!hasChanges}
                  icon={<Save size={16} />}
                  loading={saving}
                  loadingText="Saving..."
                  onClick={() => void saveProfile()}
                  variant="primary"
                >
                  Save changes
                </Button>
                <Button
                  disabled={!hasChanges}
                  onClick={() =>
                    profile !== null && setFormState(toProfileFormState(profile))
                  }
                  variant="ghost"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Appearance"
                description="Pick the mode that feels easiest to read."
                icon={<Palette className="text-ai-blue-300" size={20} />}
              />
              <CardContent>
                <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-cream-50">Theme</p>
                      <p className="text-sm text-cream-400">
                        {resolvedTheme === 'dark'
                          ? 'Dark mode is active.'
                          : 'Light mode is active.'}
                      </p>
                    </div>
                    <Button
                      icon={
                        resolvedTheme === 'dark' ? (
                          <Sun size={16} />
                        ) : (
                          <Moon size={16} />
                        )
                      }
                      onClick={handleThemeToggle}
                      variant="outline"
                    >
                      {resolvedTheme === 'dark' ? 'Switch to light' : 'Switch to dark'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title="Account snapshot"
                description="A quick view of the profile currently stored."
              />
              <CardContent>
                <div className="space-y-3 text-sm text-cream-300">
                  <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
                    <p className="text-cream-400 mb-1">Email</p>
                    <p>{profile?.email ?? user.email}</p>
                  </div>
                  <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
                    <p className="text-cream-400 mb-1">Username</p>
                    <p>{profile?.username ?? 'Not set'}</p>
                  </div>
                  <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-4">
                    <p className="text-cream-400 mb-1">Academic level</p>
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
    </div>
  );
}
