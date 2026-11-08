import React, { useState } from 'react';
import { Shield, MapPin, Phone, Mail, Award, ExternalLink, Globe, Cloud } from 'lucide-react';
import { CloudDeployModal } from './CloudDeployModal';

import { SCHOOL_INFO } from '../data/schoolInfo';

interface FooterProps {
  onNavigate: (tab: string) => void;
  lang: 'en' | 'am';
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, lang }) => {
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  return (
    <footer className="bg-[#070b16] text-slate-400 text-xs border-t border-slate-800 mt-16 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Identity & Motto */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
                <span className="font-bold text-white text-xs">HMM</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Hailemariam Mamo</h3>
                <p className="text-[11px] text-amber-300">Secondary & Preparatory School</p>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              ደብረ ብርሃን ኃይለማሪያም ማሞ አጠቃላይ ሁለተኛ እና መሰናዶ ትምህርት ቤት • Serving Grades 9 to 12 in North Shewa Zone, Amhara Region, Ethiopia.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <Shield className="w-3.5 h-3.5" />
              <span>&quot;Excellence in Character & Knowledge&quot;</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              {lang === 'am' ? 'ፈጣን ማውጫዎች' : 'Academic Portal'}
            </h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onNavigate('portal')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Student Grades & Transcript
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Academic Calendar & Exams
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('messaging')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Teacher Q&A & Messaging
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('esslce')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Grade 12 ESSLCE Preparation
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Grade 9 Admissions Intake
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Official National Educational Portals */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              Ethiopian MoE Portals
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <a
                  href="https://study.moe.gov.et"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 flex items-center gap-1"
                >
                  <span>MoE Digital E-Learning (study.moe.gov.et)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://eaes.et"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 flex items-center gap-1"
                >
                  <span>EAES National Exam Services (eaes.et)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://moe.gov.et"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 flex items-center gap-1"
                >
                  <span>Ministry of Education Ethiopia</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <span className="text-slate-500">Debre Berhan Feeder Schools:</span>
                <p className="text-slate-400 text-[10px]">Tebassie Primary, Atse Zere Yacob, HMM Primary</p>
              </li>
            </ul>
          </div>

          {/* Col 4: Campus Contact */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              {lang === 'am' ? 'አድራሻና ግንኙነት' : 'Debre Berhan Campus'}
            </h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{SCHOOL_INFO.address || 'Debre Berhan, Ethiopia'}</span>
              </div>
              {SCHOOL_INFO.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>{SCHOOL_INFO.phone}</span>
              </div>
              )}
              {SCHOOL_INFO.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>{SCHOOL_INFO.email}</span>
              </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Hailemariam Mamo Secondary & Preparatory School. All Rights Reserved.</p>
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Official Student Information System · Debre Berhan, Ethiopia</span>
            </p>
          </div>
        </div>
      </div>

      {/* Cloud & Vercel Deployment Modal */}
      <CloudDeployModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        lang={lang}
      />
    </footer>
  );
};
