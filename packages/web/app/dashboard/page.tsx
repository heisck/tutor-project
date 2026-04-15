'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function DashboardPage() {
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

  // Mock data
  const stats = [
    { label: 'Current Streak', value: '12 Days', icon: '🔥', color: 'from-orange-500/20 to-red-500/20' },
    { label: 'Total Hours', value: '45.5h', icon: '⏱️', color: 'from-blue-500/20 to-cyan-500/20' },
    { label: 'Materials Uploaded', value: '8', icon: '📚', color: 'from-purple-500/20 to-pink-500/20' },
    { label: 'Questions Answered', value: '156', icon: '✅', color: 'from-green-500/20 to-emerald-500/20' },
  ];

  const recentCourses = [
    {
      id: 1,
      title: 'Advanced Python Programming',
      progress: 65,
      lastAccessed: '2 hours ago',
      icon: '🐍',
    },
    {
      id: 2,
      title: 'Machine Learning Basics',
      progress: 42,
      lastAccessed: '1 day ago',
      icon: '🤖',
    },
    {
      id: 3,
      title: 'Web Development with React',
      progress: 78,
      lastAccessed: '3 hours ago',
      icon: '⚛️',
    },
    {
      id: 4,
      title: 'Data Science Fundamentals',
      progress: 31,
      lastAccessed: '5 days ago',
      icon: '📊',
    },
  ];

  const streakDays = Array.from({ length: 12 }, (_, i) => ({
    day: i + 1,
    active: i < 12 && i % 2 === 0,
  }));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Welcome Back!</h1>
        <p className="text-muted-foreground text-lg">
          Continue your learning journey with AI-powered tutoring
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className={`p-6 rounded-2xl border border-border bg-gradient-to-br ${stat.color} hover:border-primary transition-all`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
              </div>
              <div className="text-3xl">{stat.icon}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Learning Streak */}
      <motion.div
        variants={itemVariants}
        className="p-8 rounded-2xl border border-border bg-muted/30 hover:border-primary transition-all"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Learning Streak</h2>
              <p className="text-muted-foreground mt-1">
                Keep your momentum going! You&apos;re on a 12-day streak 🎉
              </p>
            </div>
            <div className="text-5xl animate-pulse-glow">🔥</div>
          </div>

          {/* Streak Calendar */}
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {streakDays.map((day, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.1 }}
                className={`aspect-square rounded-lg flex items-center justify-center font-semibold text-sm transition-all ${
                  day.active
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {day.day}
              </motion.div>
            ))}
          </div>

          <div className="text-sm text-muted-foreground">
            Complete one activity per day to maintain your streak!
          </div>
        </div>
      </motion.div>

      {/* Recent Courses */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-foreground">Your Courses</h2>
          <Link
            href="/dashboard/courses"
            className="text-primary hover:underline text-sm font-medium"
          >
            View All
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {recentCourses.map((course, idx) => (
            <motion.div
              key={course.id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="p-6 rounded-2xl border border-border bg-background hover:border-primary transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{course.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Last accessed {course.lastAccessed}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold text-primary">{course.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${course.progress}%` }}
                        transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                      />
                    </div>
                  </div>

                  <button className="mt-4 w-full py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium text-sm">
                    Continue Learning
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        variants={itemVariants}
        className="grid md:grid-cols-2 gap-6"
      >
        <Link
          href="/dashboard/upload"
          className="p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary transition-all hover:bg-muted/50 text-center group"
        >
          <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">📤</div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Upload New Material</h3>
          <p className="text-muted-foreground text-sm">
            Add PDFs, slides, or documents for AI analysis
          </p>
        </Link>

        <Link
          href="/dashboard/streaks"
          className="p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary transition-all hover:bg-muted/50 text-center group"
        >
          <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">📈</div>
          <h3 className="text-lg font-semibold text-foreground mb-1">View Detailed Analytics</h3>
          <p className="text-muted-foreground text-sm">
            Track your learning progress and insights
          </p>
        </Link>
      </motion.div>
    </motion.div>
  );
}
