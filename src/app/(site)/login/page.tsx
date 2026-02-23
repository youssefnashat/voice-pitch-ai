'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, User } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/leaderboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        // In a real app, you'd call your signup API here:
        // await fetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, username }) });
        console.log('Signup mode:', { email, username });
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setLoading(false);
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-10 backdrop-blur-xl shadow-2xl shadow-cyan-500/10"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="relative h-12 w-12 rounded-full bg-[#00F5FF] shadow-[0_0_20px_rgba(0,245,255,0.4)]">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/30" />
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white text-center">
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-gray-400 text-sm text-center mt-2 mb-8">
          Sign in to save your scores and rank on the leaderboard
        </p>

        {/* Toggle Tabs */}
        <div className="flex justify-center gap-8 mb-8 border-b border-white/5">
          <button
            onClick={() => setMode('signin')}
            className={`pb-2 text-sm font-medium transition-all relative ${
              mode === 'signin' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
            {mode === 'signin' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(0,245,255,0.5)]" />
            )}
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`pb-2 text-sm font-medium transition-all relative ${
              mode === 'signup' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account
            {mode === 'signup' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(0,245,255,0.5)]" />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-gray-300 text-sm ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="How you'll appear"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 outline-none ring-2 ring-cyan-500/20 transition-all"
                    required
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-gray-300 text-sm ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@startup.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 outline-none ring-2 ring-cyan-500/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-gray-300 text-sm ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 outline-none ring-2 ring-cyan-500/20 transition-all"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-400 text-xs mt-2 ml-1"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold py-3 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all flex justify-center items-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-cyan-400 text-sm hover:underline"
          >
            {mode === 'signin' ? "Don't have an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center px-4 overflow-hidden relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.08)_0%,transparent_70%)] pointer-events-none" />
      
      <Suspense fallback={<Loader2 className="animate-spin text-cyan-400" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
