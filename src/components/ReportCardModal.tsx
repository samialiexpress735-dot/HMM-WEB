import React from 'react';
import { X, Printer, Award, CheckCircle, Shield, Building2 } from 'lucide-react';
import { Student } from '../data/schoolData';
import { evaluateSemesterPerformance, evaluateSubjectGrade } from '../utils/gradeCalculations';

interface ReportCardModalProps {
  student: Student;
  semester: 1 | 2;
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'am';
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  student,
  semester,
  isOpen,
  onClose,
  lang
}) => {
  if (!isOpen) return null;

  const currentSemesterData = student.semesters.find(s => s.semester === semester) || student.semesters[0];
  const evaluatedSubjects = currentSemesterData.subjects.map(evaluateSubjectGrade);
  const summary = evaluateSemesterPerformance(currentSemesterData.subjects, student.grade);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-6 border border-slate-200 print:m-0 print:border-none print:shadow-none print:w-full flex flex-col max-h-[92vh]">
        {/* Top Control Bar (Sticky & Hidden when printing) */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-xs sm:text-sm">
              {lang === 'am' ? 'ይፋዊ የተማሪ ውጤት ካርድ (ማረጋገጫ)' : 'Official Student Grade Transcript & Report Card'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'am' ? 'አትም / Print' : 'Print / Save PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="p-6 md:p-10 bg-white text-slate-900 font-sans print:p-4 print:text-black overflow-y-auto">
          {/* Official Emblem & Header */}
          <div className="text-center border-b-2 border-emerald-900/20 pb-6 mb-6">
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-emerald-900 text-amber-400 flex items-center justify-center font-bold text-2xl border-4 border-amber-400 shadow-md">
                <span>HMM</span>
              </div>
              <div className="text-left">
                <p className="text-xs uppercase tracking-widest text-emerald-800 font-bold">
                  Federal Democratic Republic of Ethiopia • Ministry of Education
                </p>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  HAILEMARIAM MAMO SECONDARY & PREPARATORY SCHOOL
                </h1>
                <p className="text-sm font-semibold text-emerald-900">
                  ደብረ ብርሃን ኃይለማሪያም ማሞ አጠቃላይ ሁለተኛ እና መሰናዶ ትምህርት ቤት
                </p>
                <p className="text-xs text-slate-600">
                  North Shewa Zone, Debre Berhan, Amhara Region • Est. 1958 E.C.
                </p>
              </div>
            </div>
            <div className="inline-block bg-slate-100 text-slate-800 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-2 border border-slate-300">
              Official Academic Transcript • Semester {semester} ({student.academicYear})
            </div>
          </div>

          {/* Student Biodata Card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6">
            <div>
              <span className="text-slate-700 block">{lang === 'am' ? 'የተማሪው ስም' : 'Student Full Name'}:</span>
              <span className="font-bold text-slate-900 text-sm">{student.fullName}</span>
              <span className="block text-slate-600">{student.fullNameAmharic}</span>
            </div>
            <div>
              <span className="text-slate-700 block">{lang === 'am' ? 'መለያ ቁጥር' : 'Student ID'}:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{student.studentId}</span>
            </div>
            <div>
              <span className="text-slate-700 block">{lang === 'am' ? 'ክፍል እና ክፍልፋይ' : 'Grade & Section'}:</span>
              <span className="font-bold text-slate-900 text-sm">
                Grade {student.grade} - Section &quot;{student.section}&quot;
              </span>
              {student.stream && (
                <span className="text-emerald-700 font-semibold block">{student.stream} Stream</span>
              )}
            </div>
            <div>
              <span className="text-slate-700 block">{lang === 'am' ? 'የክፍል ደረጃ' : 'Class Rank'}:</span>
              <span className="font-bold text-emerald-700 text-sm">
                Rank #{student.rank} of {student.totalStudentsInSection}
              </span>
              <span className="text-slate-700 block">Attendance: {student.attendanceRate}%</span>
            </div>
          </div>

          {/* Grades Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold">
                  <th className="py-2.5 px-3 rounded-tl-lg">#</th>
                  <th className="py-2.5 px-3">Subject Name</th>
                  <th className="py-2.5 px-3 text-center">Continuous (30%)</th>
                  <th className="py-2.5 px-3 text-center">Mid Exam (20%)</th>
                  <th className="py-2.5 px-3 text-center">Final Exam (50%)</th>
                  <th className="py-2.5 px-3 text-center font-bold">Total (100%)</th>
                  <th className="py-2.5 px-3 text-center">Letter Grade</th>
                  <th className="py-2.5 px-3 rounded-tr-lg">Verbal Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 border-x border-b border-slate-200">
                {currentSemesterData.subjects.map((subj, idx) => {
                  const ev = evaluatedSubjects[idx];
                  return (
                    <tr key={subj.subjectId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="py-2 px-3 text-slate-700 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {subj.subjectName}
                        <span className="text-slate-600 block text-[11px] font-normal">{subj.subjectAmharic}</span>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-700 font-mono">{subj.continuousAssessment}</td>
                      <td className="py-2 px-3 text-center text-slate-700 font-mono">{subj.midExam}</td>
                      <td className="py-2 px-3 text-center text-slate-700 font-mono">{subj.finalExam}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 font-mono text-sm">
                        {ev.totalScore}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded font-bold text-xs bg-emerald-100 text-emerald-800">
                          {ev.letterGrade}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-medium">{ev.remarks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Academic Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 mb-8">
            <div>
              <span className="text-xs text-emerald-800 font-medium block">Semester Average</span>
              <div className="text-2xl font-black text-emerald-950 font-mono">
                {summary.overallAverage}%
              </div>
            </div>
            <div>
              <span className="text-xs text-emerald-800 font-medium block">Total Marks (ድምር)</span>
              <div className="text-2xl font-black text-emerald-950 font-mono">
                {summary.totalMarksObtained} <span className="text-xs font-normal text-emerald-800">/ {summary.totalPossibleMarks}</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-emerald-800 font-medium block">Conduct (ስነ-ምግባር)</span>
              <div className="text-2xl font-black text-emerald-950 font-mono">
                Rating &quot;{student.conduct || 'A'}&quot;
              </div>
            </div>
            <div>
              <span className="text-xs text-emerald-800 font-medium block">Official Status</span>
              <div className="text-sm font-bold text-emerald-900 flex items-center gap-1.5 mt-1">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{summary.status}</span>
              </div>
            </div>
          </div>

          {/* Signatures & Official Stamp section */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center text-xs">
            <div className="space-y-4">
              <p className="font-semibold text-slate-700">Homeroom Teacher</p>
              <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 font-serif italic text-slate-600">
                {student.homeroomTeacher.split('(')[0]}
              </div>
              <p className="text-[11px] text-slate-700">Signature & Date</p>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-800/60 flex flex-col items-center justify-center p-2 text-emerald-900 text-[10px] uppercase font-bold text-center leading-tight">
                <Building2 className="w-4 h-4 mb-1 text-emerald-800" />
                <span>School Seal</span>
                <span className="text-[8px] font-normal">Debre Berhan, Ethiopia</span>
                <span className="text-[8px] text-emerald-700">VERIFIED OFFICIAL</span>
              </div>
            </div>

            <div className="space-y-4">
              <p className="font-semibold text-slate-700">Principal / Director</p>
              <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 font-serif italic text-slate-600">
                Berhanu Wolde, M.Ed.
              </div>
              <p className="text-[11px] text-slate-700">Signature & Official Stamp</p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-700" />
              Cryptographically verifiable through Hailemariam Mamo School SIS Portal
            </span>
            <span>Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
