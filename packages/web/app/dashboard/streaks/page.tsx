'use client';

import { motion } from 'framer-motion';

export default function StreaksPage() {
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

  // Mock data for the last 30 days
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks = 4;

  const streakData = Array.from({ length: weeks * 7 }, (_, i) => ({
    day: i + 1,
    active: Math.random() > 0.3,
    minutes: Math.floor(Math.random() * 120) + 10,
  }));

  const stats = [
    {
      label: 'Current Streak',
      value: '12 Days',
      icon: '🔥',
      change: '+2 from last week',
    },
    {
      label: 'Best Streak',
      value: '28 Days',
      icon: '🏆',
      change: 'All time',
    },
    {
      label: 'Total Hours',
      value: '45.5h',
      icon: '⏱️',
      change: '+8.5h this month',
    },
    {
      label: 'Average per Day',
      value: '1h 32m',
      icon: '📊',
      change: 'Up 15 mins from last month',
    },
  ];

  const milestones = [
    { days: 7, title: '7-Day Learner', completed: true },
    { days: 14, title: '14-Day Warrior', completed: true },
    { days: 30, title: 'Monthly Master', completed: false, progress: 40 },
    { days: 100, title: 'Century Scholar', completed: false, progress: 12 },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Learning Streaks & Analytics</h1>
        <p className="text-muted-foreground">Track your learning consistency and achievements</p>
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
            className="p-6 rounded-2xl border border-border bg-muted/30 hover:border-primary transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl">{stat.icon}</div>
            </div>
            <p className="text-muted-foreground text-sm font-medium">{stat.label}</p>
            <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Activity Calendar */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Last 30 Days</h2>
          <p className="text-muted-foreground">Your learning activity overview</p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-muted/30">
          <div className="space-y-4">
            {Array.from({ length: weeks }).map((_, weekIdx) => (
              <div key={weekIdx}>
                <div className="flex gap-2 mb-2">
                  {weekDays.map((day, dayIdx) => (
                    <div key={dayIdx} className="text-xs font-semibold text-muted-foreground text-center flex-1">
                      {dayIdx === 0 || dayIdx === 6 ? day : ''}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: 7 }).map((_, dayIdx) => {
                    const dataIdx = weekIdx * 7 + dayIdx;
                    const data = streakData[dataIdx];
                    return (
                      <motion.div
                        key={dayIdx}
                        whileHover={{ scale: 1.1 }}
                        className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                          data.active
                            ? 'bg-gradient-to-br from-primary to-secondary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                        title={`${data.minutes} minutes`}
                      >
                        {data.active ? '✓' : ''}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
            <p>Each square = one day. Click to see details.</p>
          </div>
        </div>
      </motion.div>

      {/* Milestones */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Achievements</h2>
          <p className="text-muted-foreground">Keep building your streak to unlock more</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {milestones.map((milestone, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className={`p-6 rounded-2xl border transition-all ${
                milestone.completed
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/30 hover:border-primary'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">{milestone.days}-Day Streak</p>
                  <h3 className="text-lg font-semibold text-foreground">{milestone.title}</h3>
                </div>
                {milestone.completed ? (
                  <div className="text-3xl">🏆</div>
                ) : (
                  <div className="text-3xl">🎯</div>
                )}
              </div>

              {!milestone.completed && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold text-primary">{milestone.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${milestone.progress}%` }}
                      transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    />
                  </div>
                </div>
              )}

              {milestone.completed && (
                <p className="text-sm text-primary font-medium">Unlocked!</p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Weekly Summary */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">This Week</h2>
          <p className="text-muted-foreground">Your weekly breakdown</p>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-muted/30">
          <div className="space-y-3">
            {weekDays.map((day, idx) => {
              const minutes = Math.floor(Math.random() * 120) + 10;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-foreground">{day}</span>
                    <span className="text-muted-foreground">{minutes} mins</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(minutes / 120) * 100}%` }}
                      transition={{ duration: 1, delay: 0.2 + idx * 0.05 }}
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-foreground">Total this week</span>
              <span className="text-lg font-bold text-primary">10h 42m</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
