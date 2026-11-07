import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
  UserPlus,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { Teacher, GradeSection } from '../data/schoolData';
import { getSectionsAssignedToTeacher } from '../utils/sectionUtils';

interface TeacherLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  sections?: GradeSection[];
  onSelectTeacher: (teacher: Teacher) => void;
  lang: 'en' | 'am';
}

export const TeacherLoginModal: React.FC<TeacherLoginModalProps> = ({
  isOpen,
  onClose,
  teachers,
  sections = [],
  onSelectTeacher,
  lang
}) => {
  const [activeMode, setActiveMode] = useState<'roster' | 'manual'>('roster');
  const [selectedTeacherPrompt, setSelectedTeacherPrompt] = useState<Teacher | null>(null);
  const [promptPassword, setPromptPassword] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const verifyTeacherPassword = (teacher: Teacher, pass: string): boolean => {
    const cleanPass = pass.trim();
    if (!cleanPass) return false;
    const defaultStaffPass = 'debberhan2017';
    const surnamePass = `${teacher.name.toLowerCase().split(' ')[0]}2017!`;
    const specificPass = (teacher as any).password;

    return cleanPass === defaultStaffPass || cleanPass === surnamePass || cleanPass === specificPass;
  };

  const handleSelectFromRoster = (teacher: Teacher) => {
    setErrorMsg('');
    setPromptPassword('');
    setSelectedTeacherPrompt(teacher);
  };

  const handleConfirmPromptLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherPrompt) return;

    if (verifyTeacherPassword(selectedTeacherPrompt, promptPassword)) {
      onSelectTeacher(selectedTeacherPrompt);
      setSelectedTeacherPrompt(null);
      setPromptPassword('');
      onClose();
    } else {
      setErrorMsg(
        lang === 'am'
          ? 'የተሳሳተ የመምህር የይለፍ ቃል! (ትክክለኛውን የይለፍ ቃል ያስገቡ፡ debberhan2017)'
          : 'Invalid passcode for this faculty account. (Institutional key: debberhan2017)'
      );
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const query = manualEmail.trim().toLowerCase();
    const matched = teachers.find(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.email && t.email.toLowerCase() === query) ||
        t.id.toLowerCase() === query
    );

    if (!matched) {
      setErrorMsg(
        lang === 'am'
          ? 'ይህ መምህር በመዝገብ ውስጥ አልተገኘም። እባክዎ በትክክል መጻፍዎን ያረጋግጡ።'
          : 'Faculty record not found. Please verify your email or name.'
      );
      return;
    }

    if (verifyTeacherPassword(matched, manualPassword)) {
      onSelectTeacher(matched);
      onClose();
    } else {
      setErrorMsg(
        lang === 'am'
          ? 'የተሳሳተ የመምህር የይለፍ ቃል! (ትክክለኛውን የይለፍ ቃል ያስገቡ፡ debberhan2017)'
          : 'Invalid passcode. Access denied. (Staff key: debberhan2017)'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-sm border border-emerald-100 flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">
                {lang === 'am' ? 'የመምህራን መግቢያ እና ማርክ መዝገብ' : 'Faculty Sign In & Mark Suite'}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Debre Berhan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'am'
                ? 'ደህንነቱ የተጠበቀ የመምህራን መግቢያ (የይለፍ ቃል ያስፈልጋል)'
                : 'Authenticated faculty access (Passcode verification required)'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Password Prompt for Selected Teacher */}
        {selectedTeacherPrompt ? (
          <div className="bg-slate-50 rounded-2xl border border-emerald-300 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-300 font-bold text-xs flex items-center justify-center">
                  {selectedTeacherPrompt.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{selectedTeacherPrompt.name}</div>
                  <div className="text-xs text-emerald-800 font-semibold">{selectedTeacherPrompt.subject} Department</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacherPrompt(null)}
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Change Teacher
              </button>
            </div>

            <form onSubmit={handleConfirmPromptLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Enter Faculty Passcode for {selectedTeacherPrompt.name.split(' ')[0]}:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Enter teacher passcode..."
                    value={promptPassword}
                    onChange={(e) => setPromptPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeacherPrompt(null)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-1.5"
                >
                  <span>Verify & Open Gradebook</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Segmented Mode Switcher */}
            <div className="flex items-center gap-1 mb-4 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setActiveMode('roster')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeMode === 'roster'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'am' ? 'የመምህራን ዝርዝር' : 'Faculty Roster'}
              </button>
              <button
                onClick={() => setActiveMode('manual')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeMode === 'manual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'am' ? 'በኢሜይል / መለያ' : 'Email & Passcode'}
              </button>
            </div>

            {activeMode === 'roster' ? (
              /* List of Teachers */
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>{lang === 'am' ? 'የተመዘገቡ መምህራን' : 'Faculty Roster'}: {teachers.length}</span>
                  <span className="text-[10px] text-emerald-700 font-medium">Requires Security Key</span>
                </div>

                {teachers.map((teacher) => {
                  const initials = teacher.name
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'ED';

                  return (
                    <div
                      key={teacher.id}
                      onClick={() => handleSelectFromRoster(teacher)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 text-amber-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate group-hover:text-emerald-700">
                              {teacher.name}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {teacher.subject}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {teacher.department} • Assigned: {getSectionsAssignedToTeacher(teacher, sections).join(', ') || 'Faculty'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 bg-slate-100 group-hover:bg-emerald-700 group-hover:text-white text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 flex-shrink-0 transition-colors"
                      >
                        <Lock className="w-3 h-3 text-slate-400 group-hover:text-amber-300" />
                        <span>Sign In</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Manual Form */
              <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-900 block mb-1">
                    Faculty Email or Name:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. daniel.girma@hailemariammamo.edu.et"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-900 block mb-1">
                    Teacher Passcode:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Enter teacher password"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Authenticate & Access Suite</span>
                    <ArrowRight className="w-4 h-4 text-amber-300" />
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
