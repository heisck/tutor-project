'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const validate = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      // TODO: Implement actual password reset logic with backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Password reset for:', email);
      setSuccess(true);
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
      console.error('Reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md"
    >
      {success ? (
        <div className="space-y-6 text-center">
          <motion.div variants={itemVariants} className="space-y-2">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Check Your Email
            </h1>
            <p className="text-muted-foreground">
              We&apos;ve sent a password reset link to <strong>{email}</strong>
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Click the link in your email to reset your password. The link
              expires in 24 hours.
            </p>
            <p className="text-muted-foreground">
              Don&apos;t see the email? Check your spam folder or try another
              email address.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex gap-3">
            <Link
              href="/auth/login"
              className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all"
            >
              Back to Sign In
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="flex-1 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-all"
            >
              Try Another Email
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="space-y-8">
          <motion.div variants={itemVariants} className="space-y-2 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Reset Password
            </h1>
            <p className="text-muted-foreground">
              Enter your email to receive a reset link
            </p>
          </motion.div>

          <motion.form
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Email Input */}
            <motion.div variants={itemVariants} className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground block"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </motion.div>

            {/* Submit Button */}
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Sending Email...' : 'Send Reset Link'}
            </motion.button>

            {/* Back to Login */}
            <motion.div variants={itemVariants} className="text-center">
              <Link
                href="/auth/login"
                className="text-primary hover:underline font-medium transition-colors"
              >
                Back to Sign In
              </Link>
            </motion.div>
          </motion.form>
        </div>
      )}
    </motion.div>
  );
}
