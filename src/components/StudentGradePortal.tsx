import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Download,
  Filter,
  GraduationCap,
  Percent,
  Printer,
  Search,
  Sparkles,
  TrendingUp,
  User,
  Users
} from 'lucide-react';
import { Student } from '../data/schoolData';
import {
  evaluateSemesterPerformance,
  evaluateSubjectGrade
} from '../utils/gradeCalculations';
import { ReportCardModal } from './ReportCardModal';
import { formatYear, yearDigits } from '../utils/academicYear';

interface StudentGradePortalProps {
  students: Student[];
  lang: 'en' | 'am';
  initialSearchQuery?: string;
}

export const StudentGradePortal: React.FC<StudentGradePortalProps> = ({ students, lang, initialSearchQuery = '' }) => {
  const initialMatched = initialSearchQuery
    ? students.find(
        (s) =>
          s.studentId.toLowerCase().includes(initialSearchQuery.toLowerCase()) ||
          s.fullName.toLowerCase().includes(initialSearchQuery.toLowerCase())
      )
    : null;

  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialMatched?.id || students[0]?.id || '');
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Target Simulator State
  const [simulatorSubjectId, setSimulatorSubjectId] = useState<string>('math');
  const [targetScore, setTargetScore] = useState<number>(85);

  const filteredStudents = students.filter((s) => {
    const matchesGrade = selectedGradeFilter === 'all' || s.grade === selectedGradeFilter;
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fullNameAmharic.includes(searchQuery);
    return matchesGrade && matchesSearch;
  });

  const activeStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const activeSemesterData =
    activeStudent?.semesters?.find((sem) => sem.semester === selectedSemester) ||
    activeStudent?.semesters?.[0];

  const evaluatedSubjects = activeSemesterData
    ? activeSemesterData.subjects.map(evaluateSubjectGrade)
    : [];

  const semesterSummary = activeSemesterData && activeStudent
    ? evaluateSemesterPerformance(activeSemesterData.subjects, activeStudent.grade)
    : null;

  // Simulator computation
  const simSubject = activeSemesterData?.subjects.find((s) => s.subjectId === simulatorSubjectId);
  const currentNonFinal = (simSubject?.continuousAssessment || 0) + (simSubject?.midExam || 0);
  const requiredFinal = Math.max(0, targetScore - currentNonFinal);
  const isTargetFeasible = requiredFinal <= 50;

  if (!activeStudent || students.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm my-8">
        <div className="w-16 h-16 mx-auto rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
          <Award className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">
          {lang === 'am' ? 'የተማሪዎች ውጤት መከታተያ ፖርታል' : 'Student & Parent Academic Portal'}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          {lang === 'am'
            ? 'በአሁኑ ሰዓት በሲስተሙ የተመዘገቡ ተማሪዎች የሉም። የትምህርት ቤቱ አድሚኒስትሬተር ተማሪዎችን ሲያስመዘግብና መምህራን ማርክ ሲሞሉ የተረጋገጠ የውጤት ካርድ እዚህ ይታያል።'
            : 'No student grade transcripts are currently published. As soon as students are enrolled by the registrar and teachers submit assessments, official report cards and mark slips will appear here.'}
        </p>
        <div className="pt-2 text-[11px] font-semibold text-slate-500">
          Official Grading Protocol · Ministry of Education Standard
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Controls & Student Selector Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-5 md:p-7">
        <div className="academic-ribbon absolute inset-x-0 top-0" aria-hidden="true" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/10 text-amber-300 rounded-xl">
                <Award className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {lang === 'am' ? 'የተማሪዎች ውጤት መከታተያ ፖርታል' : 'Student Grade & Academic Performance Portal'}
              </h2>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              {lang === 'am'
                ? 'የ9ኛ - 12ኛ ክፍል ተማሪዎች የትምህርት ውጤት፣ የመማሪያ ክፍለ-ጊዜ እና የክፍል ደረጃ'
                : 'Official grading records for Grades 9 through 12, continuous assessments, midterms & finals'}
            </p>
          </div>

          {/* Quick Actions: Print Transcript */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs md:text-sm rounded-full transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'am' ? 'ይፋዊ የውጤት ካርድ አትም' : 'Print Official Transcript'}</span>
            </button>
          </div>
        </div>

        {/* Student Filtering / Picker Bar */}
        <div className="pt-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Grade Level Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              {lang === 'am' ? 'ክፍል:' : 'Grade:'}
            </span>
            {(['all', 9, 10, 11, 12] as const).map((g) => (
              <button
                key={String(g)}
                onClick={() => setSelectedGradeFilter(g)}
                className={`px-3.5 py-2 md:py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedGradeFilter === g
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-white/10 hover:bg-white/15 text-slate-200'
                }`}
              >
                {g === 'all' ? (lang === 'am' ? 'ሁሉም (9-12)' : 'All (9-12)') : `Grade ${g}`}
              </button>
            ))}
          </div>

          {/* Search box & Student Select */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0 md:max-w-md">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={lang === 'am' ? 'ተማሪ በስም ወይም በID ይፈልጉ...' : 'Search student by name or ID...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 md:py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full sm:w-auto sm:max-w-[14rem] min-w-0 bg-slate-900 border border-white/10 rounded-xl py-2.5 md:py-1.5 px-3 text-xs font-medium text-white focus:outline-none focus:border-amber-400 cursor-pointer truncate"
              aria-label="Select student profile"
            >
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} (Gr. {s.grade}{s.stream ? ` - ${s.stream.split(' ')[0]}` : ''})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Student Profile Banner */}
      {activeStudent && (
        <div className="bg-[#0f172a] text-white rounded-2xl shadow-md p-6 border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Student initials & identity */}
            <div className="flex items-center space-x-4">
              <div className="avatar-monogram w-16 h-16 rounded-xl text-lg font-bold border border-emerald-400/30 shadow-md flex-shrink-0">
                {activeStudent.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('') || 'ST'}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold tracking-tight text-white">{activeStudent.fullName}</h3>
                  <span className="text-xs text-amber-300 font-medium">({activeStudent.fullNameAmharic})</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {activeStudent.studentId}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-2">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                    <strong>Grade {activeStudent.grade}</strong> - Section {activeStudent.section}
                  </span>
                  {activeStudent.stream && (
                    <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-400/30">
                      {activeStudent.stream} Stream
                    </span>
                  )}
                  <span>Academic Year: {formatYear(yearDigits(activeStudent.academicYear, activeStudent.academicYear))}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Homeroom Teacher: <span className="text-slate-200">{activeStudent.homeroomTeacher}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics (Rank, Attendance, Semester Switcher) */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center min-w-[100px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Class Rank</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  #{activeStudent.rank} <span className="text-xs font-normal text-slate-400">/ {activeStudent.totalStudentsInSection}</span>
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center min-w-[100px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {activeStudent.attendanceRate}%
                </span>
              </div>

              {/* Semester Switcher Tabs */}
              <div className="bg-slate-950/80 p-1.5 rounded-xl border border-slate-700 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 text-center font-bold">Semester View</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedSemester(1)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedSemester === 1
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semester 1
                  </button>
                  <button
                    onClick={() => setSelectedSemester(2)}
                    disabled={activeStudent.semesters.length < 2}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedSemester === 2
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white disabled:opacity-40'
                    }`}
                  >
                    Semester 2
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Semester Academic Summary Cards */}
      {semesterSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                {lang === 'am' ? 'አማካይ ውጤት' : 'Semester Average'}
              </span>
              <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
                {semesterSummary.overallAverage}%
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">Out of 100% scale</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
              <Percent className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                {lang === 'am' ? 'ጠቅላላ ድምር ውጤት' : 'Total Marks Obtained'}
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1">
                {semesterSummary.totalMarksObtained}{' '}
                <span className="text-xs font-normal text-slate-400">/ {semesterSummary.totalPossibleMarks}</span>
              </div>
              <span className="text-[11px] text-slate-500">Conduct (ስነ-ምግባር): <strong className="text-slate-800">{activeStudent.conduct || 'A'}</strong></span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                {lang === 'am' ? 'የትምህርት ሁኔታ' : 'Promotion Status'}
              </span>
              <div className="text-base font-bold text-emerald-700 mt-1 leading-snug">
                {lang === 'am' ? semesterSummary.statusAmharic : semesterSummary.status}
              </div>
              <span className="text-[11px] text-slate-500">
                {semesterSummary.passedCount} Passed{semesterSummary.failedCount > 0 ? `, ${semesterSummary.failedCount} Failed` : ''}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                {lang === 'am' ? 'የትምህርት መስክ ብቁነት' : 'Track / Stream Eligibility'}
              </span>
              <div className="text-base font-bold text-slate-900 mt-1">
                {activeStudent.stream ? `${activeStudent.stream}` : (semesterSummary.streamEligible || 'Eligible for Preparatory')}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">MoE Debre Berhan Standard</span>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Detailed Subject Assessment Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>
                {lang === 'am'
                  ? `የወሰነ-ትምህርት ${selectedSemester} የትምህርት አይነቶች ዝርዝር ውጤት`
                  : `Semester ${selectedSemester} Subject Grade Breakdown`}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              National Secondary Assessment Weighting: Continuous (30%) + Midterm (20%) + Final Exam (50%)
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200">
            Total Enrolled: {evaluatedSubjects.length} Subjects
          </span>
        </div>

        {/* Phone layout: one card per subject, no sideways scrolling */}
        <ul className="md:hidden divide-y divide-slate-100">
          {activeSemesterData?.subjects.map((subj, idx) => {
            const evalData = evaluatedSubjects[idx];
            const tone = evalData.letterGrade.startsWith('A')
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : evalData.letterGrade.startsWith('B')
              ? 'bg-blue-100 text-blue-800 border-blue-300'
              : evalData.letterGrade.startsWith('C')
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-rose-100 text-rose-800 border-rose-300';
            return (
              <li key={subj.subjectId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 leading-snug">{subj.subjectName}</p>
                    <p className="text-[11px] text-slate-600">{subj.subjectAmharic}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{subj.teacherName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-black text-slate-950 text-xl leading-none">
                      {evalData.totalScore}<span className="text-[11px] font-medium text-slate-400">/100</span>
                    </p>
                    <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full font-bold text-xs border ${tone}`}>
                      {evalData.letterGrade}
                    </span>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Continuous', subj.continuousAssessment, 30],
                    ['Mid exam', subj.midExam, 20],
                    ['Final exam', subj.finalExam, 50]
                  ].map(([label, val, max]) => (
                    <div key={String(label)} className="rounded-lg bg-slate-50 border border-slate-100 py-1.5">
                      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
                      <dd className="font-mono text-sm font-semibold text-slate-800">
                        {val}<span className="text-[10px] text-slate-400"> /{max}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {evalData.isPassing ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>
                  )}
                  <span className="text-xs text-slate-700 font-medium">{evalData.remarks}</span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-3">Instructor</th>
                <th className="py-3 px-3 text-center">Continuous (30)</th>
                <th className="py-3 px-3 text-center">Mid Exam (20)</th>
                <th className="py-3 px-3 text-center">Final Exam (50)</th>
                <th className="py-3 px-3 text-center font-bold text-slate-900">Total (100)</th>
                <th className="py-3 px-3 text-center">Letter Grade</th>
                <th className="py-3 px-4">Status & Verbal Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {activeSemesterData?.subjects.map((subj, idx) => {
                const evalData = evaluatedSubjects[idx];
                return (
                  <tr key={subj.subjectId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{subj.subjectName}</div>
                      <div className="text-[11px] text-slate-600 font-normal">{subj.subjectAmharic}</div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">{subj.teacherName}</td>
                    <td className="py-3.5 px-3 text-center font-mono font-medium text-slate-700">
                      {subj.continuousAssessment}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-medium text-slate-700">
                      {subj.midExam}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-medium text-slate-700">
                      {subj.finalExam}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-black text-slate-950 text-sm">
                      {evalData.totalScore}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          evalData.letterGrade.startsWith('A')
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : evalData.letterGrade.startsWith('B')
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : evalData.letterGrade.startsWith('C')
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {evalData.letterGrade}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {evalData.isPassing ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>
                        )}
                        <span className="text-xs text-slate-700 font-medium">{evalData.remarks}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target Simulator & Exam Goal Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h4 className="font-bold text-slate-900 text-base">
                {lang === 'am' ? 'የፈተና ውጤት ግምት አስሊ (Grade Target Simulator)' : 'Final Exam Target Simulator'}
              </h4>
              <p className="text-xs text-slate-500">
                Calculate required Final Exam score (out of 50) to reach your target letter grade
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Select Subject:
              </label>
              <select
                value={simulatorSubjectId}
                onChange={(e) => setSimulatorSubjectId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {activeSemesterData?.subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectName} (Current non-final score: {s.continuousAssessment + s.midExam} / 50)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Desired Target Overall Score:</span>
                <span className="font-mono text-emerald-700 font-bold">{targetScore}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="98"
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Pass (50%)</span>
                <span>Good (70%)</span>
                <span>Distinction (85%)</span>
                <span>High Distinction (90%+)</span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-xs ${
              isTargetFeasible ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              {isTargetFeasible ? (
                <div>
                  <div className="font-bold text-sm text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Achievable Target!
                  </div>
                  <p className="mt-1">
                    You need to score at least <strong className="font-mono text-emerald-900 text-sm">{requiredFinal} / 50</strong> on your final exam ({Math.round((requiredFinal / 50) * 100)}%) to reach {targetScore}%.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-sm text-rose-800">Target Exceeds Maximum Final Exam Points</div>
                  <p className="mt-1">
                    Even with a perfect 50/50 in the final exam, the maximum achievable total would be {currentNonFinal + 50}%.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Class Timetable Preview */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  {lang === 'am' ? 'የክፍል የሳምንት ፕሮግራም' : 'Weekly Academic Schedule'}
                </h4>
                <p className="text-xs text-slate-500">
                  Debre Berhan Campus: Period 1 (8:30 AM) to Period 7 (3:30 PM)
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
              Section {activeStudent.section}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100">
              <div>
                <span className="font-bold text-slate-900">Period 1 & 2 (8:30 AM - 10:10 AM)</span>
                <p className="text-slate-500 text-[11px]">
                  {activeStudent.stream === 'Natural Science' ? 'Advanced Physics (Science Lab 2)' : 'History & Civilization (Room 14)'}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                Morning Session
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100">
              <div>
                <span className="font-bold text-slate-900">Period 3 & 4 (10:30 AM - 12:10 PM)</span>
                <p className="text-slate-500 text-[11px]">
                  Mathematics & Calculus Problem Solving (Main Academic Block)
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                Morning Session
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-amber-900">
              <div>
                <span className="font-bold">Lunch & Midday Study Break (12:10 PM - 1:30 PM)</span>
                <p className="text-[11px] text-amber-700">Cafeteria, Library & Campus Garden</p>
              </div>
              <span className="text-[10px] font-bold">1h 20m</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100">
              <div>
                <span className="font-bold text-slate-900">Period 5 & 6 (1:30 PM - 3:10 PM)</span>
                <p className="text-slate-500 text-[11px]">
                  English Language, Essay Composition & National Exam Practice
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[10px]">
                Afternoon Session
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Printable Report Card Modal */}
      {activeStudent && (
        <ReportCardModal
          student={activeStudent}
          semester={selectedSemester}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          lang={lang}
        />
      )}
    </div>
  );
};
