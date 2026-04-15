'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function CoursesPage() {
  const courses = [
    {
      id: 1,
      title: 'Advanced Python Programming',
      description: 'Master advanced Python concepts and best practices',
      progress: 65,
      lessons: 24,
      completedLessons: 16,
      icon: '🐍',
      lastAccessed: '2 hours ago',
    },
    {
      id: 2,
      title: 'Machine Learning Basics',
      description: 'Introduction to ML algorithms and applications',
      progress: 42,
      lessons: 32,
      completedLessons: 13,
      icon: '🤖',
      lastAccessed: '1 day ago',
    },
    {
      id: 3,
      title: 'Web Development with React',
      description: 'Build modern web applications with React',
      progress: 78,
      lessons: 28,
      completedLessons: 22,
      icon: '⚛️',
      lastAccessed: '3 hours ago',
    },
    {
      id: 4,
      title: 'Data Science Fundamentals',
      description: 'Learn data analysis and visualization techniques',
      progress: 31,
      lessons: 20,
      completedLessons: 6,
      icon: '📊',
      lastAccessed: '5 days ago',
    },
    {
      id: 5,
      title: 'JavaScript ES6+',
      description: 'Modern JavaScript syntax and features',
      progress: 55,
      lessons: 18,
      completedLessons: 10,
      icon: '⚡',
      lastAccessed: '1 week ago',
    },
    {
      id: 6,
      title: 'Cloud Computing with AWS',
      description: 'Deploy and manage applications in the cloud',
      progress: 23,
      lessons: 26,
      completedLessons: 6,
      icon: '☁️',
      lastAccessed: '2 weeks ago',
    },
  ];

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">My Courses</h1>
        <p className="text-muted-foreground text-lg">
          Continue learning with your personalized courses
        </p>
      </motion.div>

      {/* Filter/Sort */}
      <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
        <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          All Courses
        </button>
        <button className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:border-primary border border-border transition-all">
          In Progress
        </button>
        <button className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:border-primary border border-border transition-all">
          Completed
        </button>
      </motion.div>

      {/* Courses Grid */}
      <motion.div
        variants={containerVariants}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {courses.map((course, idx) => (
          <motion.div
            key={course.id}
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="p-6 rounded-2xl border border-border bg-background hover:border-primary transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl group-hover:scale-110 transition-transform">
                {course.icon}
              </div>
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                {course.progress}%
              </span>
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {course.title}
            </h3>

            <p className="text-sm text-muted-foreground mb-4">{course.description}</p>

            {/* Progress Bar */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>
                  {course.completedLessons}/{course.lessons} lessons
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${course.progress}%` }}
                  transition={{ duration: 1, delay: 0.2 + idx * 0.05 }}
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Last accessed {course.lastAccessed}
              </span>
              <Link
                href="/session"
                className="text-primary hover:underline text-sm font-medium"
              >
                Continue →
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State CTA */}
      <motion.div
        variants={itemVariants}
        className="mt-12 p-12 rounded-2xl border-2 border-dashed border-border text-center hover:border-primary transition-all"
      >
        <div className="text-5xl mb-4">📚</div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Want to add more courses?</h3>
        <p className="text-muted-foreground mb-6">
          Upload new materials to create custom learning experiences
        </p>
        <Link
          href="/dashboard/upload"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all"
        >
          Upload Material
        </Link>
      </motion.div>
    </motion.div>
  );
}
