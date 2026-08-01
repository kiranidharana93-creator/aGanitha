import React, { useState, useEffect } from 'react';
import { CurrentUser, Student, Test, Attempt } from './types';
import { seedSampleDataIfEmpty } from './services/db';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentTestPage } from './components/StudentTestPage';
import { AdminDashboard } from './components/AdminDashboard';
import { ResultDetailsModal } from './components/ResultDetailsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ role: null });
  const [activeTest, setActiveTest] = useState<{ test: Test; attemptNumber: number } | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<Attempt | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Seed initial CBSE sample tests if database is empty
    seedSampleDataIfEmpty().finally(() => {
      setIsInitializing(false);
    });

    // Check localStorage for persisted session
    const savedStudent = localStorage.getItem('cbse_student_session');
    if (savedStudent) {
      try {
        const studentObj = JSON.parse(savedStudent);
        setCurrentUser({ role: 'student', student: studentObj });
      } catch (e) {
        console.error('Failed to parse saved session', e);
      }
    }

    const savedAdmin = localStorage.getItem('cbse_admin_session');
    if (savedAdmin === 'true') {
      const savedEmail = localStorage.getItem('cbse_admin_email') || 'Administrator';
      setCurrentUser({ role: 'admin', adminEmail: savedEmail });
    }
  }, []);

  const handleStudentLogin = (student: Student) => {
    localStorage.setItem('cbse_student_session', JSON.stringify(student));
    localStorage.removeItem('cbse_admin_session');
    setCurrentUser({ role: 'student', student });
    setActiveTest(null);
  };

  const handleAdminLogin = (email?: string) => {
    localStorage.setItem('cbse_admin_session', 'true');
    if (email) {
      localStorage.setItem('cbse_admin_email', email);
    }
    localStorage.removeItem('cbse_student_session');
    setCurrentUser({ role: 'admin', adminEmail: email || localStorage.getItem('cbse_admin_email') || 'Administrator' });
    setActiveTest(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('cbse_student_session');
    localStorage.removeItem('cbse_admin_session');
    setCurrentUser({ role: null });
    setActiveTest(null);
    setReviewAttempt(null);
  };

  const handleStartTest = (test: Test, attemptNumber: number) => {
    setActiveTest({ test, attemptNumber });
  };

  const handleFinishTest = () => {
    setActiveTest(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-400">Loading CBSE Maths Test Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeView={activeTest ? 'test' : currentUser.role === 'admin' ? 'admin' : 'dashboard'}
        setActiveView={() => {}}
      />

      {/* View Router */}
      <main className="flex-1">
        {!currentUser.role ? (
          <LoginModal onStudentLogin={handleStudentLogin} onAdminLogin={handleAdminLogin} />
        ) : currentUser.role === 'admin' ? (
          <AdminDashboard />
        ) : activeTest && currentUser.student ? (
          <StudentTestPage
            student={currentUser.student}
            test={activeTest.test}
            attemptNumber={activeTest.attemptNumber}
            onFinishTest={handleFinishTest}
          />
        ) : currentUser.student ? (
          <StudentDashboard
            student={currentUser.student}
            onStartTest={handleStartTest}
            onViewAttemptReview={(att) => setReviewAttempt(att)}
          />
        ) : null}
      </main>

      {/* Review Modal for past attempts from Student Dashboard */}
      {reviewAttempt && (
        <ResultDetailsModal attempt={reviewAttempt} onClose={() => setReviewAttempt(null)} />
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© CBSE Maths Online Assessment Portal • Unlimited Practice Attempts Enabled • Firebase Firestore Backend</p>
        </div>
      </footer>
    </div>
  );
}
