'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useTheme } from '../../providers';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    email: 'john@example.com',
    fullName: 'John Doe',
    emailNotifications: true,
    progressReminders: true,
    weeklyDigest: false,
    soundEnabled: true,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const handleToggle = (key: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof settings],
    }));
  };

  const handleSave = () => {
    // TODO: Implement actual save logic
    console.log('Settings saved:', settings);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-2xl"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and learning experience
        </p>
      </motion.div>

      {/* Account Settings */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Account</h2>
          <p className="text-muted-foreground">Your personal information</p>
        </div>

        <div className="space-y-4 p-6 rounded-2xl border border-border bg-muted/30">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">Full Name</label>
            <input
              type="text"
              value={settings.fullName}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, fullName: e.target.value }))
              }
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">Email Address</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          <button className="text-sm text-primary hover:underline">
            Change Password
          </button>
        </div>
      </motion.div>

      {/* Theme Settings */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Appearance</h2>
          <p className="text-muted-foreground">Customize how the app looks</p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-muted/30 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">Theme</label>
            <div className="grid grid-cols-2 gap-2">
              {(['dark', 'light', 'purple', 'ocean'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-4 py-3 rounded-lg border transition-all font-medium ${
                    theme === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notification Settings */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Notifications</h2>
          <p className="text-muted-foreground">Control how and when you receive updates</p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-muted/30 space-y-4">
          {[
            {
              key: 'emailNotifications',
              label: 'Email Notifications',
              description: 'Receive important updates via email',
            },
            {
              key: 'progressReminders',
              label: 'Progress Reminders',
              description: 'Get reminded to continue your learning',
            },
            {
              key: 'weeklyDigest',
              label: 'Weekly Digest',
              description: 'Receive a summary of your weekly progress',
            },
            {
              key: 'soundEnabled',
              label: 'Sound Effects',
              description: 'Enable sounds for interactions and notifications',
            },
          ].map((notification) => (
            <div
              key={notification.key}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-1">
                <p className="font-medium text-foreground">{notification.label}</p>
                <p className="text-sm text-muted-foreground">{notification.description}</p>
              </div>
              <button
                onClick={() => handleToggle(notification.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings[notification.key as keyof typeof settings]
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              >
                <motion.span
                  animate={
                    settings[notification.key as keyof typeof settings]
                      ? { x: 24 }
                      : { x: 2 }
                  }
                  className="inline-block h-4 w-4 transform rounded-full bg-background"
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={itemVariants} className="space-y-6 pt-8 border-t border-border">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Danger Zone</h2>
          <p className="text-muted-foreground">Irreversible actions</p>
        </div>

        <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Delete Account</h3>
            <p className="text-sm text-muted-foreground">
              Once you delete your account, there is no going back. Please be certain.
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-medium text-sm">
            Delete Account
          </button>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.button
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all"
      >
        Save Changes
      </motion.button>
    </motion.div>
  );
}
