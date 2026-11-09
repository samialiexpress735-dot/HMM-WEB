/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  subscribeToAllSchoolDataRealtime,
  isSupabaseConfigured
} from './lib/supabase';
import { getSectionsAssignedToTeacher } from './utils/sectionUtils';

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

  // When each student was last edited on THIS device (protects fresh typing from a stale cloud refresh)
  const localEditAt = useRef<Map<string, number>>(new Map());

  // Application Data States (initialized empty or from localStorage for user additions)
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('hmm_persisted_students');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return SEED_STUDENTS;
  });

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
      localStorage.setItem('hmm_persisted_students', JSON.stringify(students));
    } catch {
      // ignore
    }
  }, [students]);

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
    // disappear here too. Two safeguards keep local work safe:
    //  - if the database cannot be reached (null), the local copy is left alone;
    //  - an EMPTY list only clears the local copy if the database has held rows before (i.e. they were
    //    deleted), never when nothing has been saved to it yet.
    const applyCloudList = <T,>(name: string, list: T[] | null, apply: (rows: T[]) => void) => {
      if (list === null) return;
      const seenKey = `hmm_cloud_has_held_${name}`;
      try {
        if (list.length > 0) {
          localStorage.setItem(seenKey, '1');
        } else if (localStorage.getItem(seenKey) !== '1') {
          return;
        }
      } catch {
        if (list.length === 0) return;
      }
      apply(list);
    };

    async function loadCloudData() {
      if (isSupabaseConfigured()) {
        try {
          applyCloudList('teachers', await fetchTeachersFromCloud(), setTeachers);
          applyCloudList('sections', await fetchSectionsFromCloud(), setSections);
          applyCloudList('students', await fetchStudentsFromCloud(), (rows) =>
            setStudents((prev) => mergeCloudStudents(prev, rows, localEditAt.current))
          );
        } catch (e) {
          console.warn('Background cloud sync error:', e);
        }
      }
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
    if (s.includes('math')) setActiveTeacherSubject('math');
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

  const handleUpdateStudents = (updatedStudents: Student[] | ((prev: Student[]) => Student[])) => {
    setStudents((prev) => {
      const next = typeof updatedStudents === 'function' ? updatedStudents(prev) : updatedStudents;
      if (isSupabaseConfigured()) {
        // Sync only students whose record actually changed (unchanged ones keep the same object reference)
        const prevById = new Map(prev.map((st) => [st.id, st]));
        next.forEach((st) => {
          if (prevById.get(st.id) !== st) {
            localEditAt.current.set(st.id, Date.now());
            syncActiveStudentToCloud(st).catch(() => {});
          }
        });
      }
      return next;
    });
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
              onUpdateStudents={handleUpdateStudents}
              previousYearStudents={students}
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
