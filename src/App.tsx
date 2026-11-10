/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { StudentGradePortal } from './components/StudentGradePortal';
import { mergeCloudStudents } from './utils/marksMerge';
import { TeacherPortal } from './components/TeacherPortal';
import { AdminPortal } from './components/AdminPortal';
import { AcademicCalendar } from './components/AcademicCalendar';
import { MessagingBoard } from './components/MessagingBoard';
import { AboutAndCampus } from './components/AboutAndCampus';
import { GradesOfYearPage } from './components/GradesOfYearPage';
import { RegistrarAdminPage } from './components/RegistrarAdminPage';
import { AdminSignupPage, AdminUser } from './components/AdminSignupPage';
import { TeacherLoginModal } from './components/TeacherLoginModal';
import { Footer } from './components/Footer';
import {
  SEED_STUDENTS,
  SCHOOL_EVENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_MESSAGES,
  TEACHERS,
  INITIAL_GRADE_SECTIONS,
  Student,
  SchoolEvent,
  SchoolAnnouncement,
  MessageThread,
  Teacher,
  GradeSection
} from './data/schoolData';
import {
  fetchTeachersFromCloud,
  syncTeacherToCloud,
  deleteTeacherFromCloud,
  fetchSectionsFromCloud,
  syncSectionToCloud,
  fetchStudentsFromCloud,
  syncActiveStudentToCloud,
  fetchCurrentAcademicYear,
  setCurrentAcademicYearInCloud,
  getUnsavedStudentIds,
  getFailedStudentIds,
  subscribeToAllSchoolDataRealtime,
  isSupabaseConfigured
} from './lib/supabase';
import { useAcademicYear, getAcademicYear, setAcademicYear, previousYear, yearDigits } from './utils/academicYear';
import { isOnRoster, deriveSectionCode, mergeRosterUpdate, stampNewStudents as stampNew } from './utils/rosterView';
import { getSectionsAssignedToTeacher, findSectionsWithStaleCounts } from './utils/sectionUtils';

export default function App() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [teacherUser, setTeacherUser] = useState<Teacher | null>(null);
  const [isVisitorPreview, setIsVisitorPreview] = useState<boolean>(true); // Default to open public site
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [lang, setLang] = useState<'en' | 'am'>('en');

  // Multi-Site / Vercel Portal Mode ('public' = Student/Parent & School Site; 'admin' = Administration & Faculty Suite)
  const [portalMode, setPortalMode] = useState<'public' | 'admin'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlPortal = params.get('portal');
      if (urlPortal === 'admin' || urlPortal === 'public') return urlPortal;

      const envMode = (import.meta as any).env?.VITE_PORTAL_MODE;
      if (envMode === 'admin' || envMode === 'public') return envMode;

      const saved = localStorage.getItem('hmm_portal_mode');
      if (saved === 'admin' || saved === 'public') return saved;
    } catch {
      // fallback
    }
    return 'public';
  });

  const [currentTab, setCurrentTab] = useState<string>(portalMode === 'admin' ? 'admin' : 'home');
  const [portalSearchQuery, setPortalSearchQuery] = useState<string>('');

  // Active section & subject for teacher suite navigation
  const [activeTeacherSection, setActiveTeacherSection] = useState<string>('9A');
  const [activeTeacherSubject, setActiveTeacherSubject] = useState<string>('math');

  // Application Data States (initialized empty or from localStorage for user additions)
  // When each student was last edited on THIS device (protects fresh typing from a stale cloud refresh)
  const localEditAt = useRef<Map<string, number>>(new Map());

  // True once the first load from the database has finished (or there is no database to wait for)
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // The current academic year (E.C. digits). It is kept in the database; this is the last value seen.
  const academicYear = useAcademicYear();

  // EVERY student of the current year: placed in a class, waiting for a class, or left the school (inactive).
  // Only the registrar works with all of them; the other portals get the `students` roster below.
  const [allStudents, setAllStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('hmm_persisted_students');
      if (saved) {
        const year = getAcademicYear();
        // Rows saved for an earlier year are not this year's roster.
        return (JSON.parse(saved) as Student[]).filter((st) => yearDigits(st.academicYear, year) === year);
      }
    } catch {
      // ignore
    }
    return SEED_STUDENTS;
  });
  // Last year's students: only used to recognise returning students when registering.
  const [pastStudents, setPastStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('hmm_persisted_past_students');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
  // What the portals see: students who are in a class and still at the school.
  const students = useMemo(() => allStudents.filter(isOnRoster), [allStudents]);

  const allStudentsRef = useRef(allStudents);
  allStudentsRef.current = allStudents;
  const sectionsRef = useRef<GradeSection[]>([]);

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem('hmm_persisted_teachers');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return TEACHERS;
  });

  const [sections, setSections] = useState<GradeSection[]>(() => {
    try {
      const saved = localStorage.getItem('hmm_persisted_sections');
      if (saved) {
        const parsed: GradeSection[] = JSON.parse(saved);
        const seen = new Set<string>();
        return parsed.filter((s) => {
          const key = (s.section || '').toUpperCase().trim();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    } catch {
      // ignore
    }
    return INITIAL_GRADE_SECTIONS;
  });

  const [events, setEvents] = useState<SchoolEvent[]>(() => {
    try {
      const saved = localStorage.getItem('hmm_persisted_events');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return SCHOOL_EVENTS;
  });

  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>(() => {
    try {
      const saved = localStorage.getItem('hmm_persisted_announcements');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_ANNOUNCEMENTS;
  });
  const [threads, setThreads] = useState<MessageThread[]>(INITIAL_MESSAGES);

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hmm_persisted_students', JSON.stringify(allStudents));
    } catch {
      // ignore
    }
  }, [allStudents]);

  useEffect(() => {
    try {
      localStorage.setItem('hmm_persisted_past_students', JSON.stringify(pastStudents));
    } catch {
      // ignore
    }
  }, [pastStudents]);

  useEffect(() => {
    try {
      localStorage.setItem('hmm_persisted_teachers', JSON.stringify(teachers));
    } catch {
      // ignore
    }
  }, [teachers]);

  useEffect(() => {
    try {
      localStorage.setItem('hmm_persisted_sections', JSON.stringify(sections));
    } catch {
      // ignore
    }
  }, [sections]);
  sectionsRef.current = sections;

  useEffect(() => {
    try {
      localStorage.setItem('hmm_persisted_events', JSON.stringify(events));
    } catch {
      // ignore
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem('hmm_persisted_announcements', JSON.stringify(announcements));
    } catch {
      // ignore
    }
  }, [announcements]);

  // Repair the head counts saved on each section. If students were deleted straight from the database,
  // the numbers saved on the sections still include them. Once the real students have loaded, correct
  // any section whose saved count differs and save the fix so every page and device agrees.
  // `students` is the roster (placed, still at the school), so waiting and left students are not counted.
  useEffect(() => {
    if (!cloudLoaded) return;
    const stale = findSectionsWithStaleCounts(sections, students);
    if (stale.length === 0) return;
    const byId = new Map(stale.map((sec) => [sec.id, sec]));
    setSections((prev) => prev.map((sec) => byId.get(sec.id) || sec));
    if (isSupabaseConfigured()) {
      stale.forEach((sec) => {
        syncSectionToCloud(sec).catch(() => {});
      });
    }
  }, [cloudLoaded, sections, students]);

  const handleAddEvent = (event: SchoolEvent) => {
    setEvents((prev) => [event, ...prev]);
  };

  const handleAddAnnouncement = (ann: SchoolAnnouncement) => {
    setAnnouncements((prev) => [ann, ...prev]);
  };

  // Check stored admin/teacher session or URL tab parameter on initial load
  useEffect(() => {
    try {
      const isLoggedIn = localStorage.getItem('hmm_admin_logged_in');
      const savedAdmin = localStorage.getItem('hmm_school_admin');
      if (isLoggedIn === 'true' && savedAdmin) {
        setAdminUser(JSON.parse(savedAdmin));
      }

      const savedTeacher = localStorage.getItem('hmm_teacher_user');
      if (savedTeacher) {
        setTeacherUser(JSON.parse(savedTeacher));
      }
    } catch {
      // LocalStorage access fallback
    }

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['home', 'teacher', 'admin', 'grades', 'registrar', 'portal', 'calendar', 'messaging', 'esslce', 'about'].includes(tabParam)) {
      setCurrentTab(tabParam);
    }

    // Automatic silent background load.
    // The database is the truth: a list it returns replaces the local copy, so rows deleted in Supabase
    // disappear here too. Safeguards keep local work safe:
    //  - if the database cannot be reached (null), the local copy is left alone;
    //  - an EMPTY list only clears the local copy if the database has held rows before (i.e. they were
    //    deleted), never when nothing has been saved to it yet;
    //  - students whose save has not been confirmed yet are kept, and failed saves are sent again.
    const shouldApplyCloudList = (name: string, list: unknown[] | null): boolean => {
      if (list === null) return false;
      const seenKey = `hmm_cloud_has_held_${name}`;
      try {
        if (list.length > 0) {
          localStorage.setItem(seenKey, '1');
          return true;
        }
        return localStorage.getItem(seenKey) === '1';
      } catch {
        return list.length > 0;
      }
    };
    const applyCloudList = <T,>(name: string, list: T[] | null, apply: (rows: T[]) => void) => {
      if (shouldApplyCloudList(name, list)) apply(list as T[]);
    };

    async function loadCloudData() {
      if (!isSupabaseConfigured()) {
        setCloudLoaded(true);
        return;
      }
      try {
        applyCloudList('teachers', await fetchTeachersFromCloud(), setTeachers);

        // 1. Which academic year is running? If another device started a new one, drop the old year's lists.
        const cloudYear = await fetchCurrentAcademicYear();
        if (cloudYear && cloudYear !== getAcademicYear()) {
          setAllStudents([]);
          setSections([]);
          setPastStudents([]);
          try {
            localStorage.removeItem('hmm_persisted_registered_students');
            localStorage.removeItem('hmm_persisted_timetable_slots');
          } catch {
            // ignore
          }
          setAcademicYear(cloudYear);
        }
        const year = getAcademicYear();

        // 2. This year's classes and students
        const cloudSections = await fetchSectionsFromCloud(year);
        const cloudStudents = await fetchStudentsFromCloud(year);

        // Students first, then classes, so the head counts are never checked against a half-loaded roster.
        if (cloudStudents !== null && shouldApplyCloudList(`students:${year}`, cloudStudents)) {
          const cloudIds = new Set(cloudStudents.map((st) => st.id));
          const unsaved = getUnsavedStudentIds();
          const local = allStudentsRef.current;

          // Students saved here but not (yet) in the database stay visible; failed saves are sent again.
          const keepLocal = local.filter((st) => !cloudIds.has(st.id) && unsaved.has(st.id));
          const failed = getFailedStudentIds();
          keepLocal.filter((st) => failed.has(st.id)).forEach((st) => syncActiveStudentToCloud(st).catch(() => {}));

          // Keep what was just typed on this device and the per-column marks (see marksMerge.ts).
          const merged = mergeCloudStudents(local, cloudStudents, localEditAt.current);
          const codeSource = cloudSections ?? sectionsRef.current;
          setAllStudents([
            ...merged.map((st) => (st.sectionCode || !st.section ? st : { ...st, sectionCode: deriveSectionCode(st, codeSource) })),
            ...keepLocal
          ]);
        }
        if (cloudSections !== null && shouldApplyCloudList(`sections:${year}`, cloudSections)) setSections(cloudSections);

        // 3. Last year's records, for recognising returning students
        const cloudPast = await fetchStudentsFromCloud(previousYear(year));
        if (cloudPast !== null) setPastStudents(cloudPast);
      } catch (e) {
        console.warn('Background cloud sync error:', e);
      }
      setCloudLoaded(true);
    }
    loadCloudData();

    // Realtime background sync across all devices via WebSockets
    const unsubscribe = subscribeToAllSchoolDataRealtime(() => {
      loadCloudData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleTogglePortalMode = () => {
    const nextMode = portalMode === 'public' ? 'admin' : 'public';
    setPortalMode(nextMode);
    try {
      localStorage.setItem('hmm_portal_mode', nextMode);
    } catch {
      // ignore
    }
    if (nextMode === 'admin') {
      setCurrentTab(adminUser ? 'admin' : 'admin');
    } else {
      setCurrentTab('home');
    }
  };

  const handleAdminAuthenticated = (admin: AdminUser) => {
    setAdminUser(admin);
    setCurrentTab('admin');
  };

  const handleSignOutAdmin = () => {
    try {
      localStorage.removeItem('hmm_admin_logged_in');
    } catch {
      // ignore
    }
    setAdminUser(null);
    if (portalMode === 'admin') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('home');
    }
  };

  // 1-Click Teacher Login Handler
  const handleSelectTeacher = (teacher: Teacher) => {
    setTeacherUser(teacher);
    setCurrentTab('teacher');

    // Auto-select their subject if recognized
    const s = teacher.subject.toLowerCase();
    if (s.startsWith('cte') || s.includes('career')) setActiveTeacherSubject('cte');
    else if (s.includes('physical education') || s.includes('sport')) setActiveTeacherSubject('pe');
    else if (s.includes('agri')) setActiveTeacherSubject('agri');
    else if (s.includes('math')) setActiveTeacherSubject('math');
    else if (s.includes('phys')) setActiveTeacherSubject('phys');
    else if (s.includes('chem')) setActiveTeacherSubject('chem');
    else if (s.includes('bio')) setActiveTeacherSubject('bio');
    else if (s.includes('eng')) setActiveTeacherSubject('eng');
    else if (s.includes('amh')) setActiveTeacherSubject('amh');
    else if (s.includes('geo')) setActiveTeacherSubject('geo');
    else if (s.includes('hist')) setActiveTeacherSubject('hist');
    else if (s.includes('civ')) setActiveTeacherSubject('civ');
    else if (s.includes('ict') || s.includes('inf')) setActiveTeacherSubject('ict');

    try {
      localStorage.setItem('hmm_teacher_user', JSON.stringify(teacher));
    } catch {
      // ignore
    }
  };

  const handleSignOutTeacher = () => {
    try {
      localStorage.removeItem('hmm_teacher_user');
    } catch {
      // ignore
    }
    setTeacherUser(null);
  };

  const handleAddTeacher = (newTeacher: Teacher) => {
    setTeachers((prev) => [newTeacher, ...prev.filter((t) => t.id !== newTeacher.id)]);
    syncTeacherToCloud(newTeacher).catch(() => {});
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    try {
      await deleteTeacherFromCloud(teacherId);
    } catch (e) {
      console.warn('Failed to delete teacher from Supabase:', e);
    }
  };

  const handleUpdateSection = (updated: GradeSection) => {
    setSections((prev) => {
      const nextSections = prev.map((s) => (s.id === updated.id ? updated : s));
      // Keep teachers' sectionsTeaching in complete sync with section assignments
      setTeachers((prevTeachers) =>
        prevTeachers.map((t) => ({
          ...t,
          sectionsTeaching: getSectionsAssignedToTeacher(t, nextSections)
        }))
      );
      // If the currently active teacher user is affected, refresh their session
      setTeacherUser((prevTeacher) => {
        if (!prevTeacher) return null;
        const updatedAssigned = getSectionsAssignedToTeacher(prevTeacher, nextSections);
        const refreshed = { ...prevTeacher, sectionsTeaching: updatedAssigned };
        try {
          localStorage.setItem('hmm_teacher_user', JSON.stringify(refreshed));
        } catch {
          // ignore
        }
        return refreshed;
      });
      return nextSections;
    });
    syncSectionToCloud(updated).catch(() => {});
  };

  const handleAddSections = (newSections: GradeSection[]) => {
    setSections((prev) => {
      const incomingCodes = new Set(newSections.map((s) => s.section.toUpperCase().trim()));
      const remainingPrev = prev.filter((s) => !incomingCodes.has(s.section.toUpperCase().trim()));
      const nextSections = [...newSections, ...remainingPrev];
      setTeachers((prevTeachers) =>
        prevTeachers.map((t) => ({
          ...t,
          sectionsTeaching: getSectionsAssignedToTeacher(t, nextSections)
        }))
      );
      return nextSections;
    });
    newSections.forEach((sec) => {
      syncSectionToCloud(sec).catch(() => {});
    });
  };

  /** Sends every student whose record changed to the database (unchanged ones keep the same object reference). */
  const syncChangedStudents = (prev: Student[], next: Student[]) => {
    if (!isSupabaseConfigured()) return;
    const prevById = new Map(prev.map((st) => [st.id, st]));
    next.forEach((st) => {
      if (prevById.get(st.id) !== st) {
        localEditAt.current.set(st.id, Date.now());
        syncActiveStudentToCloud(st).catch(() => {});
      }
    });
  };

  const stampNewStudents = (prev: Student[], next: Student[]): Student[] =>
    stampNew(prev, next, getAcademicYear(), sectionsRef.current);

  // The registrar's handler: sees and changes ALL of this year's students (waiting and left ones included).
  const handleUpdateAllStudents = (updatedStudents: Student[] | ((prev: Student[]) => Student[])) => {
    setAllStudents((prev) => {
      const raw = typeof updatedStudents === 'function' ? updatedStudents(prev) : updatedStudents;
      const next = stampNewStudents(prev, raw);
      syncChangedStudents(prev, next);
      return next;
    });
  };

  // The handler of every other portal: they only see the roster, so rows they cannot see (waiting or left) are
  // never lost when they save their own list back.
  const handleUpdateStudents = (updatedStudents: Student[] | ((prev: Student[]) => Student[])) => {
    setAllStudents((prev) => {
      const visiblePrev = prev.filter(isOnRoster);
      const raw = typeof updatedStudents === 'function' ? updatedStudents(visiblePrev) : updatedStudents;
      const next = mergeRosterUpdate(prev, stampNewStudents(prev, raw));
      syncChangedStudents(prev, next);
      return next;
    });
  };

  /**
   * Starts a new academic year. Nothing is deleted: the finished year's students, marks and attendance stay
   * in the database tagged with their year; the app simply starts working with the new year.
   */
  const handleStartNewAcademicYear = async (nextYear: string): Promise<boolean> => {
    const year = yearDigits(nextYear);
    if (!year) return false;
    if (isSupabaseConfigured()) {
      const ok = await setCurrentAcademicYearInCloud(year);
      if (!ok) return false;
    }
    // The finished year's students are the "previous year" for recognising returning students.
    setPastStudents(allStudentsRef.current);
    setAllStudents([]);
    setSections([]);
    try {
      localStorage.removeItem('hmm_persisted_registered_students');
      localStorage.removeItem('hmm_persisted_timetable_slots');
    } catch {
      // ignore
    }
    setAcademicYear(year);
    return true;
  };

  const handleNavigateToTeacherPortal = (sectionCode?: string, subjectId?: string) => {
    if (sectionCode) setActiveTeacherSection(sectionCode);
    if (subjectId) setActiveTeacherSubject(subjectId);
    setCurrentTab('teacher');
  };

  const isDedicatedWorkspace =
    (Boolean(teacherUser) && currentTab === 'teacher') ||
    (Boolean(adminUser) && ['admin', 'registrar', 'grades'].includes(currentTab));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Navigation Bar with Ethiopian MoE Brand, Language Switcher, Admin & Teacher Status (hidden inside dedicated authenticated workspaces) */}
      {!isDedicatedWorkspace && (
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          lang={lang}
          setLang={setLang}
          adminUser={adminUser}
          onSignOut={handleSignOutAdmin}
          onOpenAdminSignup={() => {
            setCurrentTab('admin');
          }}
          teacherUser={teacherUser}
          onSignOutTeacher={handleSignOutTeacher}
          onOpenTeacherLogin={() => setIsTeacherModalOpen(true)}
          portalMode={portalMode}
          onTogglePortalMode={handleTogglePortalMode}
        />
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 ${isDedicatedWorkspace ? 'py-3 sm:py-4' : 'py-6 sm:py-8'} min-w-0`}>
        {currentTab === 'admin' && (
          adminUser ? (
            <AdminPortal
              teachers={teachers}
              onAddTeacher={handleAddTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              students={students}
              onUpdateStudents={handleUpdateStudents}
              sections={sections}
              events={events}
              onAddEvent={handleAddEvent}
              announcements={announcements}
              onAddAnnouncement={handleAddAnnouncement}
              lang={lang}
              adminUser={adminUser}
              onNavigateToGrades={() => setCurrentTab('grades')}
              onNavigateToRegistrar={() => setCurrentTab('registrar')}
              onNavigateHome={() => {
                setPortalMode('public');
                setCurrentTab('home');
              }}
              onSignOut={handleSignOutAdmin}
            />
          ) : (
            <AdminSignupPage
              onAdminAuthenticated={handleAdminAuthenticated}
              onPreviewPublicSite={() => {
                setPortalMode('public');
                setCurrentTab('home');
              }}
              lang={lang}
              setLang={setLang}
            />
          )
        )}

        {currentTab === 'registrar' && (
          adminUser ? (
            <RegistrarAdminPage
              teachers={teachers}
              sections={sections}
              onAddSections={handleAddSections}
              onUpdateSection={handleUpdateSection}
              students={allStudents}
              onUpdateStudents={handleUpdateAllStudents}
              previousYearStudents={pastStudents}
              onStartNewAcademicYear={handleStartNewAcademicYear}
              lang={lang}
              onNavigateToGrades={() => setCurrentTab('grades')}
              onNavigateToTeacher={handleNavigateToTeacherPortal}
              onNavigateToAdmin={() => setCurrentTab('admin')}
              onNavigateHome={() => {
                setPortalMode('public');
                setCurrentTab('home');
              }}
              onSignOutAdmin={handleSignOutAdmin}
            />
          ) : (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs text-amber-900 flex items-center justify-between gap-3">
                <span className="font-bold">
                  {lang === 'am'
                    ? '🔒 የሬጅስትራር ክፍል ደህንነት፡ የተማሪዎች ምዝገባ እና ክፍል ድልድልን ለመጠቀም የአስተዳዳሪ መለያ ያስፈልጋል።'
                    : '🔒 Administrative Security: Official School Director or Registrar Officer credentials required to access student intake & section allocation.'}
                </span>
              </div>
              <AdminSignupPage
                onAdminAuthenticated={handleAdminAuthenticated}
                onPreviewPublicSite={() => {
                  setPortalMode('public');
                  setCurrentTab('home');
                }}
                lang={lang}
                setLang={setLang}
              />
            </div>
          )
        )}

        {currentTab === 'grades' && (
          <GradesOfYearPage
            sections={sections}
            onUpdateSection={handleUpdateSection}
            teachers={teachers}
            students={students}
            onUpdateStudents={handleUpdateStudents}
            lang={lang}
            onNavigateToTeacherPortal={handleNavigateToTeacherPortal}
            onNavigateToGradePortal={() => setCurrentTab('portal')}
            onNavigateToAdmin={() => setCurrentTab('admin')}
            onNavigateToRegistrar={() => setCurrentTab('registrar')}
            onNavigateHome={() => {
              setPortalMode('public');
              setCurrentTab('home');
            }}
            onSignOutAdmin={handleSignOutAdmin}
          />
        )}

        {currentTab === 'teacher' && (
          <TeacherPortal
            students={students}
            onUpdateStudents={handleUpdateStudents}
            teachers={teachers}
            sections={sections}
            lang={lang}
            initialSection={activeTeacherSection}
            initialSubjectId={activeTeacherSubject}
            activeTeacherUser={teacherUser}
            onSignOutTeacher={handleSignOutTeacher}
            onSignInTeacher={handleSelectTeacher}
            onNavigateHome={() => {
              setPortalMode('public');
              setCurrentTab('home');
            }}
          />
        )}

        {currentTab === 'home' && (
          <HeroBanner
            onNavigate={setCurrentTab}
            lang={lang}
            announcements={announcements}
            events={events}
            studentCount={students.length}
            teacherCount={teachers.length}
            onQuickStudentLookup={(query) => {
              setPortalSearchQuery(query);
              setCurrentTab('portal');
            }}
          />
        )}

        {currentTab === 'portal' && (
          <StudentGradePortal
            students={students}
            lang={lang}
            initialSearchQuery={portalSearchQuery}
          />
        )}

        {currentTab === 'calendar' && (
          <AcademicCalendar events={events} lang={lang} />
        )}

        {currentTab === 'messaging' && (
          <MessagingBoard
            initialThreads={threads}
            teachers={teachers}
            userRole={teacherUser ? 'Teacher' : 'Admin'}
            lang={lang}
          />
        )}

        {currentTab === 'about' && (
          <AboutAndCampus lang={lang} />
        )}
      </main>

      {/* Teacher 1-Click Login / Role Switch Modal */}
      <TeacherLoginModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        teachers={teachers}
        sections={sections}
        onSelectTeacher={handleSelectTeacher}
        lang={lang}
      />

      {/* Footer (hidden inside dedicated workspaces for full focused screen space) */}
      {!isDedicatedWorkspace && <Footer onNavigate={setCurrentTab} lang={lang} />}
    </div>
  );
}
