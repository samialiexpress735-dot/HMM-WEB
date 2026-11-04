/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Database,
  Cloud,
  Check,
  Copy,
  ExternalLink,
  CheckCircle2,
  GitBranch,
  Terminal,
  ShieldCheck,
  Server
} from 'lucide-react';
import { getSupabaseStatus } from '../lib/supabase';

interface CloudDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'am';
}

export const CloudDeployModal: React.FC<CloudDeployModalProps> = ({ isOpen, onClose, lang }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const status = getSupabaseStatus();

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const sampleEnv = `VITE_SUPABASE_URL="https://your-project.supabase.co"\nVITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`;

  const gitCommands = `git init\ngit add .\ngit commit -m "feat: School management with Supabase & Vercel"\ngit remote add origin https://github.com/YOUR_USER/hailemariam-mamo-portal.git\ngit push -u origin main`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 animate-scale-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-emerald-800 to-slate-900 text-amber-400 rounded-2xl shadow-sm">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                {lang === 'am' ? 'የቨርሰልና ሱፓቤዝ ማስተካከያ መመሪያ' : 'Vercel & Supabase Deployment Readiness'}
              </h3>
              <p className="text-xs text-slate-500">
                Full-stack compatibility with GitHub, Vercel SPA routing, and Supabase PostgreSQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Status */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-700">Supabase Cloud Connection:</span>
              {status.isConfigured ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active Cloud PostgreSQL
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  ⚡ Local Fallback Mode (Ready for API keys)
                </span>
              )}
            </div>
            <p className="text-slate-500 text-[11px]">
              {status.isConfigured
                ? `Connected to ${status.url}`
                : 'The application runs offline with local persistence. Once deployed to Vercel with your Supabase keys, cloud sync activates automatically.'}
            </p>
          </div>

          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 text-[11px] flex-shrink-0 cursor-pointer shadow-sm"
          >
            <span>Open Supabase</span>
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          </a>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4">
          <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-700" />
            <span>3-Step Deployment Checklist</span>
          </h4>

          {/* Step 1: Push to GitHub */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-slate-700" />
                <span>1. Push Repository to GitHub</span>
              </span>
              <button
                onClick={() => handleCopy(gitCommands, 'git')}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'git' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'git' ? 'Copied!' : 'Copy Git Commands'}</span>
              </button>
            </div>
            <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
              {gitCommands}
            </pre>
          </div>

          {/* Step 2: Supabase SQL Schema */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>2. Create PostgreSQL Tables in Supabase</span>
              </span>
              <span className="text-[10px] text-slate-500">File: supabase/schema.sql</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Open your Supabase project, go to <strong>SQL Editor</strong>, and paste the schema from <code>supabase/schema.sql</code>. It creates all tables and teacher timetable clash checks.
            </p>
          </div>

          {/* Step 3: Vercel Deploy & Environment Variables */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>3. Deploy on Vercel & Set Environment Variables</span>
              </span>
              <button
                onClick={() => handleCopy(sampleEnv, 'env')}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'env' ? 'Copied!' : 'Copy Env Keys'}</span>
              </button>
            </div>
            <p className="text-slate-600 text-[11px]">
              <code>vercel.json</code> is pre-configured with SPA route rewrites. In Vercel Project Settings $\rightarrow$ Environment Variables, add:
            </p>
            <pre className="p-2.5 bg-slate-900 text-amber-300 rounded-xl font-mono text-[11px] overflow-x-auto">
              {sampleEnv}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Compatible with Vercel, Supabase, and GitHub</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold cursor-pointer transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
