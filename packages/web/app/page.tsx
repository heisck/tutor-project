'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">TutorAI</div>
          <div className="flex gap-4">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-foreground hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="space-y-4">
            <p className="text-primary font-semibold uppercase tracking-wider text-sm">
              Intelligent Learning Platform
            </p>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight">
              Learn Smarter with{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                AI Tutoring
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Upload your materials—PDFs, slides, documents—and get personalized AI explanations, adaptive questions, and learning insights tailored to your pace.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all transform hover:scale-105"
            >
              Start Learning Now
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 border border-border rounded-lg font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Learn More
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold text-foreground mb-16 text-center"
        >
          Features
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: '📚',
              title: 'Smart Material Upload',
              description:
                'Upload PDFs, slides, or documents. Our AI understands and extracts content automatically.',
            },
            {
              icon: '🤖',
              title: 'AI-Powered Explanations',
              description:
                'Get detailed explanations tailored to your learning style and comprehension level.',
            },
            {
              icon: '📊',
              title: 'Learning Analytics',
              description:
                'Track your progress, streaks, and areas for improvement with detailed insights.',
            },
            {
              icon: '❓',
              title: 'Adaptive Questions',
              description:
                'Practice with AI-generated questions that adapt to your knowledge level.',
            },
            {
              icon: '🎯',
              title: 'Personalized Learning Paths',
              description:
                'Get custom learning recommendations based on your goals and performance.',
            },
            {
              icon: '⚡',
              title: 'Real-Time Feedback',
              description:
                'Receive instant feedback on your answers with step-by-step explanations.',
            },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-border hover:border-primary transition-colors hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-3xl border border-border p-12 md:p-16 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students already learning smarter with AI-powered tutoring.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-all transform hover:scale-105"
          >
            Get Started Free
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-12 bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>&copy; 2024 TutorAI. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
