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
    { id: 'teacher', labelEn: 'Teacher portal', labelAm: 'መምህራን', icon: FileSpreadsheet },
    { id: 'calendar', labelEn: 'Calendar', labelAm: 'ካላንደር', icon: Calendar },
    { id: 'about', labelEn: 'Campus & Legacy', labelAm: 'ስለ ት/ቤቱ', icon: GraduationCap }
  ];

  const adminNavItems = [
    { id: 'admin', labelEn: adminUser ? 'Admin portal' : 'Admin Login', labelAm: adminUser ? 'አድሚን ዴስክ' : 'አድሚን መግቢያ', icon: adminUser ? ShieldCheck : Lock },
    { id: 'registrar', labelEn: 'Registrar (2017 E.C.)', labelAm: 'ምዝገባ (2017 ዓ.ም.)', icon: UserPlus },
    { id: 'grades', labelEn: 'Sections & Curriculum', labelAm: 'ክፍሎችና ሥርዓተ-ትምህርት', icon: Layers },
    { id: 'teacher', labelEn: 'Teacher Suite', labelAm: 'የመምህራን ዴስክ', icon: FileSpreadsheet }
  ];

  const currentNavItems = portalMode === 'admin' ? adminNavItems : publicNavItems;

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  const isAm = lang === 'am';
  const navBtn = (active: boolean) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
      active ? 'bg-white/10 text-amber-300' : 'text-slate-300 hover:text-white hover:bg-white/5'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full px-3 sm:px-6 pt-3">
      <div className="glass max-w-7xl mx-auto rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,.5)] overflow-hidden text-slate-100">
        <div className="academic-ribbon" />
        <div className="flex items-center justify-between h-14 px-3 sm:px-4 gap-3">
          <button
            onClick={() => handleNavClick(portalMode === 'admin' ? 'admin' : 'home')}
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer text-left"
            aria-label="Hailemariam Mamo home"
          >
            <span className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-800 grid place-items-center font-display font-extrabold text-[11px] text-amber-200 ring-1 ring-white/15">
              HMM
            </span>
            <span className="block min-w-0 leading-tight">
              <span className="block truncate font-display text-[13px] font-semibold text-white whitespace-nowrap max-[360px]:text-[12px]">
                {isAm ? 'ኃይለማሪያም ማሞ ት/ቤት' : 'Hailemariam Mamo School'}
              </span>
              <span className="hidden sm:block text-[11px] text-slate-400 whitespace-nowrap">
                {isAm ? 'ደብረ ብርሃን፣ ኢትዮጵያ' : 'Debre Berhan, Ethiopia'}
              </span>
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button key={item.id} onClick={() => handleNavClick(item.id)} className={navBtn(active)} aria-current={active ? 'page' : undefined}>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{isAm ? item.labelAm : item.labelEn}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={lang === 'en' ? 'Switch to Amharic' : 'Switch to English'}
            >
              <Globe className="w-3.5 h-3.5 text-amber-300" />
              {lang === 'en' ? 'አማርኛ' : 'English'}
            </button>

            {onTogglePortalMode && (
              <button
                onClick={onTogglePortalMode}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
              >
                {portalMode === 'public' ? (<><Lock className="w-3.5 h-3.5" />{isAm ? 'የአስተዳደር መግቢያ' : 'Staff sign in'}</>) : (<>{isAm ? 'ወደ ት/ቤቱ ገጽ' : 'Back to school site'}<ArrowRight className="w-3.5 h-3.5" /></>)}
              </button>
            )}

            {adminUser && (
              <div className="hidden lg:flex items-center gap-1.5 bg-white/5 px-3 py-2 rounded-full text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span className="font-semibold truncate max-w-[90px]">{adminUser.fullName.split(' ')[0]}</span>
                <button onClick={onSignOut} title="Sign out" aria-label="Sign out" className="text-slate-400 hover:text-white cursor-pointer"><LogOut className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {teacherUser && (
              <div className="hidden lg:flex items-center gap-1.5 bg-white/5 px-3 py-2 rounded-full text-xs">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-semibold truncate max-w-[90px]">{teacherUser.name.split(' ')[0]}</span>
                {onSignOutTeacher && (
                  <button onClick={onSignOutTeacher} title="Sign out" aria-label="Sign out of teacher desk" className="text-slate-400 hover:text-white cursor-pointer"><LogOut className="w-3.5 h-3.5" /></button>
                )}
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 -mr-1 rounded-full text-slate-200 hover:bg-white/10"
              aria-label="Toggle navigation menu" aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-3 pb-3 pt-2 border-t border-white/10 space-y-1 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button key={item.id} onClick={() => handleNavClick(item.id)} className={`${navBtn(active)} w-full rounded-xl`}>
                  <Icon className="w-4 h-4" />
                  <span>{isAm ? item.labelAm : item.labelEn}</span>
                </button>
              );
            })}
            {(adminUser || teacherUser) && (
              <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                {adminUser && (
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/5 text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span className="font-semibold truncate">{adminUser.fullName}</span>
                    </span>
                    <button
                      onClick={() => { onSignOut(); setMobileMenuOpen(false); }}
                      className="flex items-center gap-1.5 font-semibold text-slate-300 hover:text-white shrink-0 py-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />{isAm ? 'ውጣ' : 'Sign out'}
                    </button>
                  </div>
                )}
                {teacherUser && (
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/5 text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="font-semibold truncate">{teacherUser.name}</span>
                    </span>
                    {onSignOutTeacher && (
                      <button
                        onClick={() => { onSignOutTeacher(); setMobileMenuOpen(false); }}
                        className="flex items-center gap-1.5 font-semibold text-slate-300 hover:text-white shrink-0 py-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />{isAm ? 'ውጣ' : 'Sign out'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {onTogglePortalMode && (
              <button
                onClick={() => { onTogglePortalMode(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 mt-1 rounded-xl text-xs font-bold bg-amber-400 text-slate-950"
              >
                <span>{portalMode === 'public' ? (isAm ? 'የአስተዳደር መግቢያ' : 'Staff sign in') : (isAm ? 'ወደ ት/ቤቱ ገጽ' : 'Back to school site')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
