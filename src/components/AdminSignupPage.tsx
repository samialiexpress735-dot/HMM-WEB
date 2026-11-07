/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Database,
  KeyRound,
  Check,
  Settings
} from 'lucide-react';
import { authenticateAdminFromCloud } from '../lib/supabase';

export interface AdminUser {
  fullName: string;
  fullNameAmharic?: string;
  email: string;
  phone: string;
  roleTitle: string;
  adminId: string;
  dateRegistered: string;
  password?: string;
}

interface AdminSignupPageProps {
  onAdminAuthenticated: (admin: AdminUser) => void;
  onPreviewPublicSite: () => void;
  lang: 'en' | 'am';
  setLang: (lang: 'en' | 'am') => void;
}

export const AdminSignupPage: React.FC<AdminSignupPageProps> = ({
  onAdminAuthenticated,
  onPreviewPublicSite,
  lang,
  setLang,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login credentials fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const id = loginIdentifier.trim();
    const pass = loginPassword.trim();

    if (!id || !pass) {
      setErrorMsg(
        lang === 'am'
          ? 'እባክዎ ኢሜይል ወይም መለያ እና የይለፍ ቃል ያስገቡ።'
          : 'Please enter both administrator username/email and password.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Authenticate against Supabase "profiles" table (or Supabase Auth / default director)
      const res = await authenticateAdminFromCloud(id, pass);

      if (!res.success || !res.admin) {
        setIsSubmitting(false);
        setErrorMsg(
          res.error ||
            (lang === 'am'
              ? 'የተሳሳተ የአስተዳዳሪ መለያ ወይም የይለፍ ቃል! እባክዎ በሱፓቤዝ (Supabase) የተመዘገበውን ያስገቡ።'
              : 'Invalid credentials. Please verify your administrator email and password in your Supabase "profiles" table.')
        );
        return;
      }

      const authenticatedAdmin = res.admin;

      try {
        localStorage.setItem('hmm_admin_logged_in', 'true');
        localStorage.setItem('hmm_school_admin', JSON.stringify(authenticatedAdmin));
      } catch {
        // fallback
      }

      setSuccessMsg(
        lang === 'am'
          ? `እንኳን ደህና መጡ ${authenticatedAdmin.fullName}! ወደ አስተዳዳሪ ዴስክ በመግባት ላይ...`
          : `Authenticated as ${authenticatedAdmin.fullName}! Opening School Administration Desk...`
      );

      setTimeout(() => {
        setIsSubmitting(false);
        onAdminAuthenticated(authenticatedAdmin);
      }, 400);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Authentication error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-6 px-3 sm:px-6 w-full max-w-full overflow-x-hidden font-sans">
      {/* Top Ministry Ribbon */}
      <div className="w-full max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between py-2 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
            <span className="text-[11px] sm:text-xs text-slate-600 font-medium pl-1">
              Federal Democratic Republic of Ethiopia · Ministry of Education (MoE)
            </span>
          </div>

          <button
            onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer transition-colors shadow-sm"
          >
            {lang === 'en' ? 'አማርኛ' : 'English'}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Card Header in Deep Academic Midnight */}
        <div className="p-6 sm:p-8 bg-[#0a1120] border-b border-slate-800 text-center relative text-white">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-slate-900 border border-emerald-400/30 shadow-md mb-3">
            <div className="text-center font-bold tracking-tight text-amber-300">
              <span className="text-lg block leading-none">HMM</span>
              <span className="text-[8px] block text-slate-300">1958 E.C.</span>
            </div>
          </div>

          <div className="text-xs text-emerald-400 font-medium mb-1">
            Debre Berhan, Ethiopia · Altitude 2,840m
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            ደብረ ብርሃን ኃይለማሪያም ማሞ
          </h1>
          <p className="text-xs font-semibold text-amber-300 mt-0.5">
            Hailemariam Mamo Secondary & Preparatory School
          </p>
          <p className="text-xs text-slate-300 mt-1">
            {lang === 'am'
              ? 'የትምህርት ቤት አስተዳዳሪና ዳይሬክተር መግቢያ'
              : 'School Director & Administration Sign In'}
          </p>
        </div>

        {/* Card Body: Pure Sign In Form */}
        <div className="p-6 sm:p-8 bg-white">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">
                {lang === 'am' ? 'የአስተዳዳሪ ኢሜይል ወይም መለያ' : 'Administrator Email or Username'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder={
                    lang === 'am'
                      ? 'ኢሜይል ወይም መለያ ያስገቡ (ምሳሌ፡ director@hailemariammamo.edu.et)'
                      : 'Enter administrator username or email (e.g. director@hailemariammamo.edu.et)'
                  }
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">
                {lang === 'am' ? 'የይለፍ ቃል' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={lang === 'am' ? 'የይለፍ ቃልዎን ያስገቡ' : 'Enter your password'}
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
                <span>
                  {isSubmitting
                    ? (lang === 'am' ? 'ማረጋገጫ በመፈተሽ ላይ...' : 'Verifying...')
                    : (lang === 'am' ? 'ወደ አስተዳዳሪ ዴስክ ግባ' : 'Sign In as Administrator')}
                </span>
                {!isSubmitting && <ArrowRight className="w-4 h-4 text-amber-300" />}
              </button>
            </div>
          </form>

          {/* Public Preview Alternative */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onPreviewPublicSite}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <span>{lang === 'am' ? 'የትምህርት ቤቱን ድረ-ገጽ ያለመግቢያ ተመልከት' : 'Preview Public School Website as Visitor'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>



      {/* Footer attribution */}
      <div className="max-w-4xl mx-auto text-center mt-6 text-xs text-[#786154]">
        <p>Hailemariam Mamo Secondary & Preparatory School • Established 1958 E.C. (1965 G.C.) • Debre Berhan, Ethiopia</p>
      </div>
    </div>
  );
};
