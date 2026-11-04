import React, { useState } from 'react';
import {
  X,
  Lock,
  User,
  Shield,
  Key,
  CheckCircle,
  GraduationCap,
  Users,
  Building,
  Sparkles
} from 'lucide-react';
import { authenticateUser, UserAccount } from '../utils/authUtils';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (role: 'Student' | 'Teacher' | 'Parent' | 'Admin', name: string) => void;
  lang: 'en' | 'am';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  lang
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const demoAccounts = [
    { role: 'Admin' as const, name: 'Principal Berhanu Wolde', id: 'admin', pass: 'debberhan2017', label: 'School Director' },
    { role: 'Teacher' as const, name: 'Ato Daniel Girma', id: 'daniel.math', pass: 'math2017!', label: 'Subject Faculty' },
    { role: 'Student' as const, name: 'Abebe Bikila', id: 'HMM-2024-0901', pass: 'abebe2017', label: 'Enrolled Student' },
    { role: 'Parent' as const, name: 'Ato Bikila Desta', id: '0911421100', pass: 'parent2017', label: 'Student Guardian' },
  ];

  const handleDemoLogin = (role: 'Student' | 'Teacher' | 'Parent' | 'Admin', name: string) => {
    onLoginSuccess(role, name);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both ID/Username and password.');
      return;
    }

    // Check if matches any demo account or pattern
    const matched = demoAccounts.find(
      (a) => a.id.toLowerCase() === username.trim().toLowerCase()
    );

    if (matched) {
      onLoginSuccess(matched.role, matched.name);
      onClose();
      return;
    }

    // Default fallback to student or teacher
    if (username.startsWith('HMM-') || username.toLowerCase().includes('student')) {
      onLoginSuccess('Student', username);
    } else if (username.toLowerCase().includes('teacher') || username.toLowerCase().includes('math')) {
      onLoginSuccess('Teacher', 'Teacher ' + username);
    } else if (username.toLowerCase().includes('admin') || username.toLowerCase().includes('dir')) {
      onLoginSuccess('Admin', 'Principal Administrator');
    } else {
      onLoginSuccess('Parent', 'Guardian of ' + username);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="moe-gradient-bar" />

        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-400 flex items-center justify-center font-bold text-base border border-amber-400">
              HMM
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {lang === 'am' ? 'የትምህርት ቤት ፖርታል መግቢያ' : 'School Portal Secure Login'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Hailemariam Mamo Secondary & Prep • Debre Berhan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close login dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Student ID, Staff Email or Phone:
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. HMM-2024-0901 or admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Password or Credential PIN:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Enter your security passcode"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-animated w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Sign In to Portal
            </button>
          </form>

          {/* Quick Demo Sign-in Shortcuts */}
          <div className="pt-3 border-t border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Instant One-Click Demo Access:
            </span>

            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleDemoLogin(acc.role, acc.name)}
                  className="p-2 text-left bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition-colors cursor-pointer"
                >
                  <span className="font-bold text-slate-900 block truncate">{acc.label}</span>
                  <span className="text-[10px] text-emerald-800 font-semibold">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
