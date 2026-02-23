'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { href: '/about', label: 'About' },
    { href: '/pitch/select', label: 'Pitch' },
    { href: '/history', label: 'History' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 px-6 flex justify-between items-center">
      {/* Left: Logo */}
      <Link href="/" className="group flex items-center gap-2">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="relative h-8 w-8 rounded-full bg-[#00F5FF] shadow-[0_0_15px_rgba(0,245,255,0.4)] group-hover:shadow-[0_0_20px_rgba(0,245,255,0.6)] transition-all duration-200"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/30" />
        </motion.div>
        <span className="font-display font-bold text-lg tracking-tight text-white">VoicePitch</span>
      </Link>

      {/* Center: Nav Links */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`relative text-sm font-medium tracking-wider uppercase transition-colors duration-200 ${
                isActive ? 'text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              {link.label}
              {isActive && (
                <motion.div 
                  layoutId="nav-underline"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(0,245,255,0.5)]"
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Right: Auth Section */}
      <div className="flex items-center gap-4">
        {/* Leaderboard Link (Always visible) */}
        <Link 
          href="/leaderboard"
          className={`text-sm font-medium tracking-wider uppercase transition-colors duration-200 px-4 py-2 rounded-lg ${
            pathname === '/leaderboard' 
              ? 'text-cyan-400 bg-cyan-500/10' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Leaderboard
        </Link>

        {status === 'loading' ? (
          <div className="h-8 w-24 bg-white/5 animate-pulse rounded-lg" />
        ) : !session ? (
          <button
            onClick={() => signIn()}
            className="px-4 py-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-200"
          >
            Login
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="relative h-8 w-8 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 to-purple-500 overflow-hidden"
              >
                <div className="h-full w-full rounded-full bg-[#050505] flex items-center justify-center overflow-hidden">
                  {session.user?.image ? (
                    <img src={session.user.image} alt="User" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-white">{session.user?.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-48 py-2 bg-[#0A0A0F] border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl"
                  >
                    <button
                      disabled
                      className="w-full text-left px-4 py-2 text-sm text-gray-500 cursor-not-allowed"
                    >
                      Profile
                    </button>
                    <div className="my-1 border-t border-white/5" />
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
                    >
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
