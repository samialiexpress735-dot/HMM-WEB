import React, { useState } from 'react';
import {
  GraduationCap,
  Calendar,
  Award,
  Building,
  Globe,
  Menu,
  X,
  FileSpreadsheet,
  ShieldCheck,
  Layers,
  UserPlus,
  Lock,
  LogOut,
  ArrowRight
} from 'lucide-react';
import { AdminUser } from './AdminSignupPage';
import { Teacher } from '../data/schoolData';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: 'en' | 'am';
  setLang: (l: 'en' | 'am') => void;
  adminUser: AdminUser | null;
  onSignOut: () => void;
  onOpenAdminSignup: () => void;
  teacherUser?: Teacher | null;
  onSignOutTeacher?: () => void;
  onOpenTeacherLogin?: () => void;
  portalMode?: 'public' | 'admin';
  onTogglePortalMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  adminUser,
  onSignOut,
  onOpenAdminSignup: _onOpenAdminSignup,
  teacherUser,
  onSignOutTeacher,
  portalMode = 'public',
  onTogglePortalMode
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Clean Navigation Items
  const publicNavItems = [
    { id: 'home', labelEn: 'Home', labelAm: 'መነሻ', icon: Building },
    { id: 'portal', labelEn: 'Student Grades', labelAm: 'የተማሪ ውጤት', icon: Award },
    { id: 'teacher', labelEn: 'Teacher Desk', labelAm: 'መምህራን', icon: FileSpreadsheet },
    { id: 'calendar', labelEn: 'Calendar', labelAm: 'ካላንደር', icon: Calendar },
    { id: 'about', labelEn: 'Campus & Legacy', labelAm: 'ስለ ት/ቤቱ', icon: GraduationCap }
  ];

  const adminNavItems = [
    { id: 'admin', labelEn: adminUser ? 'Admin Desk' : 'Admin Login', labelAm: adminUser ? 'አድሚን ዴስክ' : 'አድሚን መግቢያ', icon: adminUser ? ShieldCheck : Lock },
    { id: 'registrar', labelEn: 'Registrar (2019 E.C.)', labelAm: 'ምዝገባ (2019 ዓ.ም.)', icon: UserPlus },
    { id: 'grades', labelEn: 'Sections & Curriculum', labelAm: 'ክፍሎችና ሥርዓተ-ትምህርት', icon: Layers },
    { id: 'teacher', labelEn: 'Teacher Suite', labelAm: 'የመምህራን ዴስክ', icon: FileSpreadsheet }
  ];

  const currentNavItems = portalMode === 'admin' ? adminNavItems : publicNavItems;

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0a1120]/95 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-all shadow-md w-full">
      {/* Subtle Ethiopian Academic Ribbon (Emerald to Gold) */}
      <div className="academic-ribbon" />

      {/* Top Bar Contract: 3-Zone Architecture */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4 lg:gap-8">
          
          {/* ZONE 1: BRAND WORDMARK (Single text element with emblem) */}
          <div
            onClick={() => handleNavClick(portalMode === 'admin' ? 'admin' : 'home')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 flex items-center justify-center border border-emerald-400/40 shadow-sm transition-transform group-hover:scale-105">
              <span className="font-bold text-xs tracking-wider text-amber-300">HMM</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white group-hover:text-amber-300 transition-colors whitespace-nowrap">
                {lang === 'am' ? 'ኃይለማሪያም ማሞ ሁለተኛና መሰናዶ' : 'Hailemariam Mamo Secondary & Prep'}
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline whitespace-nowrap">
                {lang === 'am' ? 'ደብረ ብርሃን • ኢትዮጵያ' : 'Debre Berhan, Ethiopia · Est. 1958 E.C.'}
              </span>
            </div>
          </div>

          {/* ZONE 2: 4-5 CONCISE SINGLE-LINE NAV LINKS */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 shrink-0" aria-label="Main Navigation">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{lang === 'am' ? item.labelAm : item.labelEn}</span>
                </button>
              );
            })}
          </nav>

          {/* ZONE 3: ACTIONS (Language Switch, Portal Switch & Session) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              title={lang === 'en' ? 'Switch to Amharic' : 'Switch to English'}
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">{lang === 'en' ? 'አማርኛ' : 'EN'}</span>
            </button>

            {/* Portal Switcher Button */}
            {onTogglePortalMode && (
              <button
                onClick={onTogglePortalMode}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer whitespace-nowrap"
                title={portalMode === 'public' ? 'Switch to Administrative Suite' : 'Switch to Student Portal'}
              >
                {portalMode === 'public' ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-200" />
                    <span>Admin Suite</span>
                  </>
                ) : (
                  <>
                    <span>Student Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}

            {/* Admin User Session Pill */}
            {adminUser && (
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-200 truncate max-w-[100px]">
                  {adminUser.fullName.split(' ')[0]}
                </span>
                <button
                  onClick={onSignOut}
                  title="Sign out"
                  className="text-slate-400 hover:text-white ml-1 p-0.5 rounded cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Teacher User Session Pill */}
            {teacherUser && (
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-semibold text-slate-200 truncate max-w-[100px]">
                  {teacherUser.name.split(' ')[0]}
                </span>
                {onSignOutTeacher && (
                  <button
                    onClick={onSignOutTeacher}
                    title="Sign out of Teacher Suite"
                    className="text-slate-400 hover:text-white ml-1 p-0.5 rounded cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-800 space-y-1 animate-in fade-in">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{lang === 'am' ? item.labelAm : item.labelEn}</span>
                </button>
              );
            })}

            {onTogglePortalMode && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    onTogglePortalMode();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white"
                >
                  <span>{portalMode === 'public' ? 'Open Admin Suite' : 'Open Student Portal'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
