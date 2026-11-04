import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle,
  HelpCircle,
  Filter,
  User,
  Shield,
  Search,
  Sparkles,
  BookOpen,
  Tag,
  Clock,
  Check
} from 'lucide-react';
import { MessageThread, Teacher } from '../data/schoolData';

interface MessagingBoardProps {
  initialThreads: MessageThread[];
  teachers: Teacher[];
  userRole: 'Student' | 'Teacher' | 'Parent' | 'Admin';
  lang: 'en' | 'am';
}

export const MessagingBoard: React.FC<MessagingBoardProps> = ({
  initialThreads,
  teachers,
  userRole,
  lang
}) => {
  const [threads, setThreads] = useState<MessageThread[]>(initialThreads);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string>(initialThreads[0]?.id || '');

  // New thread form state
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MessageThread['category']>('Physics');
  const [newGrade, setNewGrade] = useState<number>(12);
  const [newContent, setNewContent] = useState('');

  // Reply form state
  const [replyText, setReplyText] = useState('');

  const subjects = [
    'all',
    'Physics',
    'Mathematics',
    'Chemistry',
    'Biology',
    'English',
    'General',
    'PTA',
    'Exam Prep'
  ];

  const filteredThreads = threads.filter((t) => {
    const matchesSubject = selectedSubject === 'all' || t.category === selectedSubject;
    const matchesGrade = selectedGrade === 'all' || t.gradeLevel === 0 || t.gradeLevel === selectedGrade;
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesGrade && matchesSearch;
  });

  const activeThread = threads.find((t) => t.id === activeThreadId) || filteredThreads[0];

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    let authorName = 'Selamawit Tadesse (Student)';
    let authorAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

    if (userRole === 'Teacher') {
      authorName = 'W/ro Almaz Kebede (Physics Dept Head)';
      authorAvatar = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80';
    } else if (userRole === 'Parent') {
      authorName = 'Ato Tadesse Bekele (Parent)';
      authorAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
    } else if (userRole === 'Admin') {
      authorName = 'Principal Berhanu Wolde';
      authorAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80';
    }

    const newThreadObj: MessageThread = {
      id: `msg-${Date.now()}`,
      subject: newTitle,
      category: newCategory,
      gradeLevel: newGrade,
      authorName,
      authorRole: userRole,
      authorAvatar,
      datePosted: 'Just now',
      content: newContent,
      replies: [],
      resolved: false
    };

    setThreads([newThreadObj, ...threads]);
    setActiveThreadId(newThreadObj.id);
    setNewTitle('');
    setNewContent('');
    setIsCreatingThread(false);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread) return;

    let authorName = 'Selamawit Tadesse';
    let authorAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
    const isTeacher = userRole === 'Teacher' || userRole === 'Admin';

    if (userRole === 'Teacher') {
      authorName = 'W/ro Almaz Kebede (Physics Dept)';
      authorAvatar = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80';
    } else if (userRole === 'Parent') {
      authorName = 'Ato Tadesse Bekele';
      authorAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';
    } else if (userRole === 'Admin') {
      authorName = 'Principal Berhanu Wolde';
      authorAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80';
    }

    const newReply = {
      id: `rep-${Date.now()}`,
      authorName,
      authorRole: userRole,
      authorAvatar,
      datePosted: 'Just now',
      content: replyText,
      isVerifiedTeacher: isTeacher
    };

    setThreads(
      threads.map((t) => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            replies: [...t.replies, newReply]
          };
        }
        return t;
      })
    );

    setReplyText('');
  };

  const toggleResolved = (threadId: string) => {
    setThreads(
      threads.map((t) => {
        if (t.id === threadId) {
          return { ...t, resolved: !t.resolved };
        }
        return t;
      })
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <MessageSquare className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                {lang === 'am' ? 'የመምህራን እና የተማሪዎች የቀጥታ ውይይት መድረክ' : 'Secure Teacher & Student Discussion Board'}
              </h2>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              {lang === 'am'
                ? 'ከመምህራን ጋር የትምህርት ጥያቄዎችና መልሶች፣ የቤት ስራ ማብራሪያ እና ይፋዊ የት/ቤት መልዕክቶች'
                : 'Direct Q&A with Hailemariam Mamo faculty, homework guidance, and official academic notices'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreatingThread(!isCreatingThread)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs md:text-sm rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{isCreatingThread ? 'Cancel Post' : (lang === 'am' ? 'አዲስ ጥያቄ ጠይቅ' : 'Ask Question / Post Notice')}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="pt-5 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Subject Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedSubject === sub
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {sub === 'all' ? (lang === 'am' ? 'ሁሉም የትምህርት አይነቶች' : 'All Subjects') : sub}
              </button>
            ))}
          </div>

          {/* Search & Grade */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={lang === 'am' ? 'በውይይት ፈልግ...' : 'Search questions...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={String(selectedGrade)}
              onChange={(e) => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Grades</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </div>
        </div>
      </div>

      {/* New Question Form Modal / Dropdown */}
      {isCreatingThread && (
        <form
          onSubmit={handleCreateThread}
          className="bg-white rounded-2xl p-6 border-2 border-emerald-500/40 shadow-lg space-y-4 animate-in slide-in-from-top-2"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'am' ? 'አዲስ ጥያቄ ወይም ይፋዊ ማስታወቂያ ያጋሩ' : 'Start a New Academic Discussion or Inquiry'}</span>
            </h3>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">
              Posting as: <strong className="text-emerald-800">{userRole}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Subject Title / Question Headline:
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Grade 12 Chemistry: Acid-Base Titration Model Exam Question #12"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Subject Category:
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MessageThread['category'])}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {subjects.filter((s) => s !== 'all').map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Detailed Question or Message:
            </label>
            <textarea
              required
              rows={4}
              placeholder="Provide context, problem steps, or specific textbook pages you need assistance with..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs md:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingThread(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post to Board</span>
            </button>
          </div>
        </form>
      )}

      {/* Main Two-Column Messaging Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Thread List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 flex items-center justify-between">
            <span>Discussions ({filteredThreads.length})</span>
            <span className="text-[10px] text-emerald-700">Encrypted Board</span>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredThreads.map((t) => {
              const isSelected = t.id === activeThread?.id;
              const hasTeacherReply = t.replies.some((r) => r.isVerifiedTeacher);

              return (
                <div
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-emerald-950 text-white border-emerald-700 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-800 text-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.category} • Gr. {t.gradeLevel === 0 ? 'All' : t.gradeLevel}
                    </span>

                    {t.resolved ? (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Resolved
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-semibold">Active</span>
                    )}
                  </div>

                  <h4 className="font-bold text-xs md:text-sm line-clamp-2 leading-snug">
                    {t.subject}
                  </h4>

                  <p className={`text-[11px] line-clamp-2 mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {t.content}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/20 text-[11px]">
                    <div className="flex items-center space-x-1.5 truncate">
                      <img
                        src={t.authorAvatar}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="truncate">{t.authorName.split(' ')[0]}</span>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {hasTeacherReply && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-300 font-semibold" title="Teacher Replied">
                          <Shield className="w-3 h-3 text-amber-400" />
                          Faculty
                        </span>
                      )}
                      <span className={isSelected ? 'text-emerald-300' : 'text-slate-400'}>
                        {t.replies.length} replies
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Thread Detail & Replies (7 cols) */}
        <div className="lg:col-span-7">
          {activeThread ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              {/* Thread Header */}
              <div className="p-5 md:p-6 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {activeThread.category}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Grade {activeThread.gradeLevel === 0 ? 'All' : activeThread.gradeLevel}
                      </span>
                      <span className="text-xs text-slate-400">• {activeThread.datePosted}</span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900">
                      {activeThread.subject}
                    </h3>
                  </div>

                  <button
                    onClick={() => toggleResolved(activeThread.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0 ${
                      activeThread.resolved
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{activeThread.resolved ? 'Resolved' : 'Mark Resolved'}</span>
                  </button>
                </div>

                {/* Original Question Post */}
                <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 flex items-start gap-3">
                  <img
                    src={activeThread.authorAvatar}
                    alt={activeThread.authorName}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-300 flex-shrink-0"
                  />
                  <div className="flex-1 text-xs md:text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <strong className="text-slate-900 font-bold">{activeThread.authorName}</strong>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {activeThread.authorRole}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {activeThread.content}
                    </p>
                  </div>
                </div>
              </div>

              {/* Replies Thread Feed */}
              <div className="p-5 md:p-6 space-y-4 max-h-[480px] overflow-y-auto">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Replies ({activeThread.replies.length})</span>
                  <span className="text-[11px] text-slate-400">Official Academic Records</span>
                </div>

                {activeThread.replies.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No answers posted yet. As a teacher, student or parent, you can reply below.
                  </div>
                ) : (
                  activeThread.replies.map((rep) => (
                    <div
                      key={rep.id}
                      className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                        rep.isVerifiedTeacher
                          ? 'bg-gradient-to-r from-amber-50/70 to-emerald-50/50 border-amber-300/80 shadow-sm'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <img
                        src={rep.authorAvatar}
                        alt={rep.authorName}
                        className={`w-9 h-9 rounded-xl object-cover flex-shrink-0 ${
                          rep.isVerifiedTeacher ? 'border-2 border-amber-400' : 'border border-slate-300'
                        }`}
                      />
                      <div className="flex-1 text-xs md:text-sm">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900">{rep.authorName}</span>
                          {rep.isVerifiedTeacher && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
                              <Shield className="w-3 h-3 fill-slate-950" />
                              Faculty Verified
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">{rep.datePosted}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                          {rep.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Composer Box */}
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <form onSubmit={handleSendReply} className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Replying as: <strong className="text-emerald-800">{userRole}</strong>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Debre Berhan Secondary Learning Network
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      required
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        userRole === 'Teacher'
                          ? 'Write an instructor explanation or reference textbook formula...'
                          : 'Write your follow-up question or clarification...'
                      }
                      className="flex-1 bg-white border border-slate-300 rounded-xl p-2.5 text-xs md:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                    <button
                      type="submit"
                      className="px-5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs md:text-sm rounded-xl flex flex-col items-center justify-center transition-colors shadow-sm cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span className="mt-1">Send</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
              Select a discussion thread from the left list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
