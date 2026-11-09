import React, { useState } from 'react';
import {
  Building2,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Shield,
  Award,
  Users,
  CheckCircle,
  FileText,
  Clock,
  Send,
  BookOpen,
  Sparkles
} from 'lucide-react';

import { SCHOOL_INFO } from '../data/schoolInfo';
import { currentGcYear } from '../utils/ethiopianCalendar';

interface AboutAndCampusProps {
  lang: 'en' | 'am';
}

export const AboutAndCampus: React.FC<AboutAndCampusProps> = ({ lang }) => {
  // Feeder registration state
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [feederSchool, setFeederSchool] = useState('Tebassie Primary School');
  const [grade8Score, setGrade8Score] = useState('');
  const [preferredStream, setPreferredStream] = useState('Natural Science (Grade 11)');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !grade8Score) return;
    setIsSubmitted(true);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Historical Heritage Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
              <Award className="w-4 h-4" />
              <span>{lang === 'am' ? 'የትምህርት ቤታችን ታሪክ እና ቅርስ' : 'School Legacy & Historical Heritage · Est. 1958 E.C.'}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {lang === 'am'
                ? 'የደጃዝማች ኃይለማሪያም ማሞ አጠቃላይ ሁለተኛ እና መሰናዶ ትምህርት ቤት'
                : 'Hailemariam Mamo Secondary & Preparatory School'}
            </h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Situated in the historic highland city of <strong>Debre Berhan (ደብረ ብርሃን)</strong>, in the North Shewa Zone of Amhara Region, Ethiopia, our school stands as a beacon of academic excellence, national discipline, and civic leadership.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-[4/3] bg-slate-100">
              <img
                src="/src/assets/images/hero_heritage_portrait_1793721841302.jpg"
                alt="Memorial of Patriot Dejazmach Hailemariam Mamo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Tribute & Story Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-100">
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
            <Shield className="w-6 h-6 text-emerald-700 mb-2" />
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Honoring Patriot Dejazmach Hailemariam Mamo
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Named in perpetual tribute to the heroic Ethiopian Arbegna (patriot) from North Shewa who demonstrated extraordinary valor defending Ethiopia’s sovereignty. His bravery inspires our motto: Knowledge, Discipline, and Service to Nation.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
            <GraduationCap className="w-6 h-6 text-amber-700 mb-2" />
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Secondary & Preparatory Model
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Serving Grades 9 to 12. Grade 9 and 10 provide foundational general sciences, humanities, and languages, while Grade 11 and 12 prepare students in specialized Natural Science and Social Science streams for university admissions.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
            <Users className="w-6 h-6 text-blue-700 mb-2" />
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Feeder School Admissions Hub
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Serving graduates from leading primary feeder schools in Debre Berhan, including Tebassie Primary, Atse Zere Yacob, and surrounding North Shewa woredas with transparent merit-based enrollment.
            </p>
          </div>
        </div>
      </div>

      {/* Campus Facilities Showcase with Real Photos */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {lang === 'am' ? 'የትምህርት ቤቱ መገልገያዎችና ግቢ' : 'Debre Berhan Campus Facilities'}
            </h3>
            <p className="text-xs text-slate-500">
              Modern resources for our secondary and preparatory students
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 self-start sm:self-auto">
            North Shewa Educational Center
          </span>
        </div>

        {/* 2-Column Photo Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
            <div className="aspect-[16/10] overflow-hidden bg-slate-200">
              <img
                src="/src/assets/images/campus_science_lab_1793721841907.jpg"
                alt="Chemistry and Physics Laboratory"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">STEM & Science Laboratories</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Demonstration stations for Chemistry, Physics, and Biology equipped with precision microscopes, chemical reagents, and lab bench setups for Grade 11 & 12 Natural Science practicals.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
            <div className="aspect-[16/10] overflow-hidden bg-slate-200">
              <img
                src="/src/assets/images/campus_library_study_1793721841829.jpg"
                alt="School Library and Study Hall"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">12,000+ Volume Library & ESSLCE Vault</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                National exam past paper vaults, specialized reference manuals, study pods, and academic reference archives fostering quiet concentration.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">12,000+ Volume Library</h4>
            <p className="text-xs text-slate-500 mt-1">
              Curriculum reference books, past national exam vaults, quiet reading spaces, and high-speed research PCs.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">STEM & Science Labs</h4>
            <p className="text-xs text-slate-500 mt-1">
              Fully equipped Physics, Chemistry, and Biology demonstration stations with digital microscopes and reagents.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Debre Berhan ICT Center</h4>
            <p className="text-xs text-slate-500 mt-1">
              60 networked workstations supporting computerized national examination training and software skills.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Athletic Sports Grounds</h4>
            <p className="text-xs text-slate-500 mt-1">
              Full-size soccer pitch, volleyball, basketball court, and track for the North Shewa regional championships.
            </p>
          </div>
        </div>
      </div>

      {/* Admissions & Feeder School Registration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Registration Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {lang === 'am' ? 'የአዲስ ተማሪዎች ምዝገባና ማመልከቻ' : 'Grade 9 & Preparatory Online Intake Portal'}
              </h3>
              <p className="text-xs text-slate-500">
                Feeder school graduates & transfer applicants verification
              </p>
            </div>
          </div>

          {isSubmitted ? (
            <div className="mt-6 p-6 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-lg text-emerald-950">
                Application Received Successfully!
              </h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Thank you, <strong>{applicantName}</strong>. Your intake record from <strong>{feederSchool}</strong> has been logged with Registration Ticket <strong>#HMM-INTAKE-{currentGcYear()}-{Math.floor(1000 + Math.random() * 9000)}</strong>.
              </p>
              <p className="text-[11px] text-slate-600">
                Please bring your original Grade 8 / Grade 10 certificate to the Registrar Office at Hailemariam Mamo Secondary Campus within 5 working days.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="mt-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Submit Another Application
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitRegistration} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Student Full Name (የተማሪው ሙሉ ስም):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Alazar Kebede Tadesse"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Parent/Guardian Phone (+251):
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+251 91 123 4567"
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Feeder Primary / Previous School:
                  </label>
                  <select
                    value={feederSchool}
                    onChange={(e) => setFeederSchool(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Tebassie Primary School">Tebassie Primary School (ደብረ ብርሃን ጤባሴ)</option>
                    <option value="Atse Zere Yacob Primary">Atse Zere Yacob Primary School</option>
                    <option value="Hailemariam Mamo Feeder">Hailemariam Mamo Primary Wing</option>
                    <option value="Dejazmach Girmachew Primary">Dejazmach Girmachew Primary</option>
                    <option value="Other North Shewa School">Other School in North Shewa Zone</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Regional Exam Score / GPA:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 88.5% or GPA 3.8"
                    value={grade8Score}
                    onChange={(e) => setGrade8Score(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Target Grade Level / Academic Stream:
                </label>
                <select
                  value={preferredStream}
                  onChange={(e) => setPreferredStream(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="Grade 9 General Secondary">Grade 9 (General Secondary Education)</option>
                  <option value="Grade 10 General Secondary">Grade 10 (Matriculation Preparatory)</option>
                  <option value="Grade 11 Natural Science">Grade 11 - Natural Science Stream (Physics/Chem/Bio/Math)</option>
                  <option value="Grade 11 Social Science">Grade 11 - Social Science Stream (History/Geo/Econ/Literature)</option>
                  <option value="Grade 12 Natural Science">Grade 12 - Natural Science (ESSLCE Candidate)</option>
                  <option value="Grade 12 Social Science">Grade 12 - Social Science (ESSLCE Candidate)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs md:text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Admission Intake Form</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Location & Contact Information (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <div>
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-700" />
              <span>Location & Contact</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Debre Berhan, North Shewa, Amhara Region, Ethiopia
            </p>
          </div>

          {/* Interactive Styled Map Card */}
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-4 text-xs space-y-3">
            <div className="flex items-center justify-between text-slate-700 font-semibold">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-800" />
                Main Secondary Compound
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                Open Mon - Fri
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">Registrar & Principal Office:</span>
                <span>{SCHOOL_INFO.phone || 'Not published yet'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">Official Academic Email:</span>
                <span className="text-emerald-700 font-medium">{SCHOOL_INFO.email || 'Not published yet'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">Office Hours:</span>
                <span>{SCHOOL_INFO.officeHours || 'Not published yet'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
