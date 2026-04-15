'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

import { useTheme } from '../../providers';

const notificationItems = [
  {
    key: 'emailNotifications',
    label: 'Email updates',
    description: 'Platform notices, security updates, and important tutor changes.',
  },
  {
    key: 'progressReminders',
    label: 'Progress reminders',
    description: 'Get nudges when your streak is at risk.',
  },
  {
    key: 'weeklyDigest',
    label: 'Weekly digest',
    description: 'Receive your weekly summary of learning performance.',
  },
  {
    key: 'soundEnabled',
    label: 'Sound effects',
    description: 'Play subtle interaction sounds in the dashboard.',
  },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    email: 'jordan@example.com',
    fullName: 'Jordan Diaz',
    emailNotifications: true,
    progressReminders: true,
    weeklyDigest: false,
    soundEnabled: true,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preferences</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Account and experience settings</h2>
        <p className="text-sm text-muted-foreground sm:text-base">Adjust profile details, notification behavior, and dashboard appearance.</p>
      </section>

      <section className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Account</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Full name</span>
            <input
              value={settings.fullName}
              onChange={(event) => setSettings((prev) => ({ ...prev, fullName: event.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Email address</span>
            <input
              value={settings.email}
              onChange={(event) => setSettings((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Theme</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {(['dark', 'light', 'purple', 'ocean'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setTheme(option)}
              className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize transition-colors ${
                option === theme
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Notifications</h3>
        <div className="mt-4 space-y-3">
          {notificationItems.map((item) => {
            const enabled = settings[item.key];

            return (
              <div key={item.key} className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                    enabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <motion.span
                    animate={{ x: enabled ? 20 : 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="h-5 w-5 rounded-full bg-background"
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h3 className="text-lg font-semibold">Danger zone</h3>
        <p className="mt-1 text-sm text-muted-foreground">These actions are permanent and should be used with caution.</p>
        <button className="mt-4 rounded-xl bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/20">
          Delete account
        </button>
      </section>

      <button className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
        Save changes
      </button>
    </div>
  );
}
