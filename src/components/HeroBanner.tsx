import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  GraduationCap,
  Users,
  ArrowRight,
  MapPin,
  Bell,
  FileSpreadsheet,
  ShieldCheck,
  Microscope,
  Compass,
  ChevronRight,
  ExternalLink,
  Search
} from 'lucide-react';
import { SchoolAnnouncement, SchoolEvent } from '../data/schoolData';

interface HeroBannerProps {
  onNavigate: (tab: string) => void;
  lang: 'en' | 'am';
  announcements?: SchoolAnnouncement[];
  events?: SchoolEvent[];
  onQuickStudentLookup?: (query: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onNavigate,
  lang,
  announcements = [],
  events = [],
  onQuickStudentLookup
}) => {
  const [activeSpotlightTab, setActiveSpotlightTab] = useState<'heritage' | 'labs' | 'library' | 'notices'>('heritage');
  const [lookupQuery, setLookupQuery] = useState('');

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;
    if (onQuickStudentLookup) {
      onQuickStudentLookup(lookupQuery.trim());
    } else {
      onNavigate('portal');
    }
  };

  return (
    <div className="space-y-12">
      {/* 1. CINEMATIC ACADEMIC HERO SHOWCASE */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 shadow-2xl min-h-[460px] flex flex-col justify-end">
        {/* Real Campus Photography Backdrop */}
        <img
          src="/src/assets/images/hero_school_campus_1793721839286.jpg"
          alt="Hailemariam Mamo Secondary & Prep School Campus in Debre Berhan"
          className="absolute inset-0 w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />

        {/* Measured High-Contrast Scrim Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/30" />

        {/* Hero Content */}
        <div className="relative z-10 px-6 py-10 md:px-12 md:py-14 max-w-4xl space-y-4">
          {/* Clean Unboxed Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-300">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Debre Berhan, Ethiopia</span>
            </span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>Altitude 2,840m</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>Est. 1958 E.C. (1965 G.C.)</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-amber-300 font-semibold">MoE Center of Excellence</span>
          </div>

          {/* Institutional Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight" style={{ textWrap: 'balance' }}>
            {lang === 'am' ? (
              <>
                ደብረ ብርሃን ኃይለማሪያም ማሞ <br />
                <span className="text-amber-300">
                  አጠቃላይ ሁለተኛ እና መሰናዶ ትምህርት ቤት
                </span>
              </>
            ) : (
              <>
                Hailemariam Mamo <br />
                <span className="text-amber-300">
                  Secondary & Preparatory School
                </span>
              </>
            )}
          </h1>

          <p className="text-sm md:text-base text-slate-200 max-w-2xl leading-relaxed">
            {lang === 'am'
              ? 'በሰሜን ሸዋ ዞን ደብረ ብርሃን ከተማ የሚገኝ ታሪካዊ ሁለተኛና መሰናዶ ትምህርት ቤት። ለተማሪዎች፣ ወላጆች እና መምህራን የተዘጋጀ የተቀናጀ የውጤት፣ የምዝገባ እና የትምህርት መረጃ መረብ።'
              : 'A landmark secondary and preparatory institution in Debre Berhan, North Shewa. Comprehensive academic portal for continuous assessment, transparent student grades, registrar intake, and faculty administration.'}
          </p>

          {/* Quick Result Slip / Student ID Lookup Box */}
          <form onSubmit={handleLookupSubmit} className="pt-2 max-w-xl">
            <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700/80 backdrop-blur-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={lang === 'am' ? 'የተማሪ መለያ ቁጥር (ምሳሌ፡ DB-HMM-09-001) ወይም ስም...' : 'Enter Student ID (e.g. DB-HMM-09-001) or Name...'}
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>{lang === 'am' ? 'ውጤት ፈልግ' : 'Check Grade Slip'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* 4-Metric Strip with Tabular Numerals */}
          <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">2,450+</div>
              <div className="text-xs text-slate-300 font-medium">Enrolled Students</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">85+</div>
              <div className="text-xs text-slate-300 font-medium">Certified Faculty</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">Grades 9-12</div>
              <div className="text-xs text-slate-300 font-medium">General & Prep Streams</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">60 Years</div>
              <div className="text-xs text-slate-300 font-medium">Academic Legacy</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THREE CORE DIGITAL GATEWAYS */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {lang === 'am' ? 'የትምህርት ቤቱ መግቢያ በሮች' : 'Institutional Portals & Gateways'}
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            {lang === 'am'
              ? 'ለተማሪዎችና ወላጆች፣ ለመምህራን፣ ወይም ለሬጅስትራር አስተዳደር የተዘጋጀውን ክፍል ይምረጡ'
              : 'Dedicated digital workspaces for students, parents, faculty instructors, and registrar administrators'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* GATEWAY 1: STUDENT & PARENT ASSESSMENT HUB */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {lang === 'am' ? 'የተማሪ እና ወላጅ ውጤት ፖርታል' : 'Student & Parent Grade Hub'}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {lang === 'am'
                    ? 'የሴሚስተር 1 እና 2 ፈተና ውጤቶችን፣ ደረጃን እና የትምህርት ካርድን በቀጥታ ይመልከቱ'
                    : 'Instant lookup of Semester 1 & 2 continuous assessment, class rank, subject scorecards, and official report card slips.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('portal')}
              className="mt-6 w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
            >
              <span>{lang === 'am' ? 'ውጤት ይመልከቱ' : 'Access Grade Records'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* GATEWAY 2: TEACHER & MARKS DESK */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {lang === 'am' ? 'የመምህራን ዴስክ እና ማርክ መዝገብ' : 'Faculty Mark Entry Suite'}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {lang === 'am'
                    ? 'መምህራን የተማሪዎችን ተከታታይ ምዘና (Continuous Assessment) እና የፈተና ውጤቶችን የሚያስገቡበት'
                    : 'Course roster management, test and exam mark entries, section grading averages, and syllabus tracking.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('teacher')}
              className="mt-6 w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
            >
              <span>{lang === 'am' ? 'የመምህራን ዴስክ ይክፈቱ' : 'Open Faculty Suite'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* GATEWAY 3: REGISTRAR & ADMINISTRATION */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:border-amber-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  {lang === 'am' ? 'ሬጅስትራር እና አስተዳደር (2019 ዓ.ም.)' : 'Registrar & Intake Office'}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {lang === 'am'
                    ? 'የ2019 ዓ.ም. አዲስ ምዝገባ አውቶኮምፕሊት፣ የተመጣጠነ የክፍል ድልድል እና የክፍለ-ጊዜ መደራረብ መከላከያ'
                    : '2019 E.C. admission autocompletion, automated gender/merit-balanced section allocation, and timetable clash detection.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('registrar')}
              className="mt-6 w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer"
            >
              <span>{lang === 'am' ? 'የሬጅስትራር ክፍል' : 'Launch Registrar Desk'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE CAMPUS SPOTLIGHT TABS WITH HIGH-FIDELITY ASSETS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900">
              {lang === 'am' ? 'የትምህርት ቤቱ ቅርስ እና መገልገያዎች' : 'Campus Spotlight & Academic Facilities'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'am'
                ? 'የደጃዝማች ኃይለማሪያም ማሞ ታሪክ፣ የሳይንስ ላቦራቶሪ እና የቤተ-መጽሐፍት መገልገያዎች'
                : 'Explore our school history, science laboratories, exam preparation hall, and official bulletins'}
            </p>
          </div>

          {/* Interactive Filter Tabs (Segmented Control) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setActiveSpotlightTab('heritage')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeSpotlightTab === 'heritage'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'am' ? 'ታሪክ እና ቅርስ' : 'Patriot Legacy'}
            </button>
            <button
              onClick={() => setActiveSpotlightTab('labs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeSpotlightTab === 'labs'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'am' ? 'ላቦራቶሪ' : 'Science Labs'}
            </button>
            <button
              onClick={() => setActiveSpotlightTab('library')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeSpotlightTab === 'library'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'am' ? 'ቤተ-መጽሐፍት' : 'Library & Prep'}
            </button>
            <button
              onClick={() => setActiveSpotlightTab('notices')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeSpotlightTab === 'notices'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'am' ? 'ማስታወቂያዎች' : 'Notices & Dates'}
            </button>
          </div>
        </div>

        {/* Tab 1: Patriot Heritage */}
        {activeSpotlightTab === 'heritage' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-100">
              <img
                src="/src/assets/images/hero_heritage_portrait_1793721841302.jpg"
                alt="Memorial of Patriot Dejazmach Hailemariam Mamo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-4">
              <div className="text-xs font-semibold text-amber-700">
                1910 - 1941 G.C. (1903 - 1933 E.C.) · North Shewa
              </div>
              <h4 className="text-2xl font-bold text-slate-900">
                {lang === 'am' ? 'የደጃዝማች ኃይለማሪያም ማሞ ገድልና ቅርስ' : 'The Legacy of Dejazmach Hailemariam Mamo'}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {lang === 'am'
                  ? 'ትምህርት ቤታችን የተሰየመው በፋሽስት ወረራ ወቅት የኢትዮጵያን ሉዓላዊነትና ክብር በሰሜን ሸዋ ምድር በጀግንነት ባስከበሩት ታዋቂ አርበኛ በደጃዝማች ኃይለማሪያም ማሞ ስም ነው። የእርሳቸው ጽናት፣ ቁርጠኝነትና የሀገር ፍቅር ለትምህርት ቤታችን ተማሪዎች የየዕለት መመሪያ ነው።'
                  : 'Our institution proudly commemorates the revered Ethiopian Arbegna (anti-fascist patriot) from North Shewa who displayed legendary courage defending the nation\'s sovereignty. His valor and devotion inspire our motto: Knowledge, Discipline, and Service to the Nation.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onNavigate('about')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  <span>{lang === 'am' ? 'ሙሉ ታሪኩንና የት/ቤቱን መረጃ ያንብቡ' : 'Read full campus legacy & admissions history'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Science Labs */}
        {activeSpotlightTab === 'labs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-100">
              <img
                src="/src/assets/images/campus_science_lab_1793721841907.jpg"
                alt="Science laboratory at Hailemariam Mamo Secondary School"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-4">
              <div className="text-xs font-semibold text-blue-700">
                Grade 11 & 12 Natural Science Stream Practical Center
              </div>
              <h4 className="text-2xl font-bold text-slate-900">
                {lang === 'am' ? 'ዘመናዊ የፊዚክስ፣ ኬሚስትሪ እና ባዮሎጂ ላቦራቶሪዎች' : 'Modern Science & Practical Laboratories'}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {lang === 'am'
                  ? 'ተማሪዎቻችን በንድፈ-ሐሳብ (Theory) ብቻ ሳይሆን በተግባራዊ ሙከራዎች እንዲታነጹ የተዘጋጁ ዘመናዊ የሳይንስ መሣሪያዎች፣ ማይክሮስኮፖች እና የኬሚካል መሞከሪያዎች ያሉት ላቦራቶሪ።'
                  : 'Equipped with precision microscopes, chemical analysis apparatus, and experimental physics stations, our laboratory facilities prepare secondary and preparatory students for high-level national university entrance examinations.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onNavigate('about')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <span>{lang === 'am' ? 'ስለ ላቦራቶሪ መገልገያዎች ይመልከቱ' : 'View laboratory curriculum & safety guidelines'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Library & Study */}
        {activeSpotlightTab === 'library' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-100">
              <img
                src="/src/assets/images/campus_library_study_1793721841829.jpg"
                alt="Academic library hall with students at Hailemariam Mamo School"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-4">
              <div className="text-xs font-semibold text-emerald-700">
                Academic Reference & ESSLCE National Exam Preparation
              </div>
              <h4 className="text-2xl font-bold text-slate-900">
                {lang === 'am' ? 'የትምህርት መረጃ ማዕከልና የዝግጅት አዳራሽ' : 'Central Library & Preparatory Study Hall'}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {lang === 'am'
                  ? 'ከ10,000 በላይ የማጣቀሻ መጻሕፍት፣ የኢትዮጵያ ሀገር አቀፍ የፈተናዎች ጥያቄዎች ማህደር እና ፀጥታ የሰፈነበት የጥናት ድባብ ለሁሉም የ9-12ኛ ክፍል ተማሪዎቻችን ክፍት ነው።'
                  : 'Holding over 10,000 curriculum textbooks, historical ESSLCE national exam question banks, and dedicated reading pods to nurture deep focus and intellectual rigor.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onNavigate('calendar')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  <span>{lang === 'am' ? 'የፈተናና የትምህርት ካላንደር ይመልከቱ' : 'Check study schedules & academic calendar'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Notices & Bulletins */}
        {activeSpotlightTab === 'notices' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
            {/* Announcements */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Bell className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'am' ? 'ወቅታዊ የትምህርት ቤት ማስታወቂያዎች' : 'Official Announcements'}</span>
              </div>
              <div className="space-y-2.5">
                {announcements.slice(0, 3).map((a) => (
                  <div key={a.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-emerald-800">{a.category || 'School Bulletin'}</span>
                      <span className="font-mono tabular-nums">{a.date}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{lang === 'am' ? (a.titleAmharic || a.title) : a.title}</div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{lang === 'am' ? (a.summaryAmharic || a.summary) : a.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Dates */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>{lang === 'am' ? 'ቀጣይ የትምህርት ሁነቶች' : 'Upcoming Academic Events'}</span>
              </div>
              <div className="space-y-2.5">
                {events.slice(0, 3).map((e) => (
                  <div key={e.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start gap-3">
                    <div className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-center font-mono text-xs font-bold shrink-0">
                      {e.date.split('-')[1]}/{e.date.split('-')[2]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{lang === 'am' ? e.titleAmharic : e.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{e.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
