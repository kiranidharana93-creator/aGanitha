import React, { useState, useEffect, Suspense } from 'react';
import { CurrentUser, Student, Test, Attempt } from './types';
import { seedSampleDataIfEmpty } from './services/db';
import { Navbar } from './components/Navbar';
import LoadingScreen from './components/LoadingScreen';

const LoginModal = React.lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const StudentDashboard = React.lazy(() => import('./components/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const StudentTestPage = React.lazy(() => import('./components/StudentTestPage').then(m => ({ default: m.StudentTestPage })));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ResultDetailsModal = React.lazy(() => import('./components/ResultDetailsModal').then(m => ({ default: m.ResultDetailsModal })));

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ role: null });
  const [activeTest, setActiveTest] = useState<{ test: Test; attemptNumber: number } | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<Attempt | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Set initializing to false immediately for instantaneous render (< 1s FCP)
    setIsInitializing(false);

    // Run sample data seed in background asynchronously without blocking UI mount
    setTimeout(() => {
      seedSampleDataIfEmpty().catch(err => console.error('Background seed notice:', err));
    }, 100);

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-[#16449B]">
        <div className="w-10 h-10 border-4 border-[#16449B] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-[#16449B]">Loading CBSE Maths Test Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#16449B] flex flex-col font-sans selection:bg-[#16449B] selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeView={activeTest ? 'test' : currentUser.role === 'admin' ? 'admin' : 'dashboard'}
        setActiveView={() => {}}
      />

      {/* View Router */}
      <main className="flex-1 bg-white">
        <Suspense fallback={<LoadingScreen />}>
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

          {/* Review Modal for past attempts from Student Dashboard */}
          {reviewAttempt && (
            <ResultDetailsModal attempt={reviewAttempt} onClose={() => setReviewAttempt(null)} />
          )}
        </Suspense>
      </main>
    </div>
  );
}
