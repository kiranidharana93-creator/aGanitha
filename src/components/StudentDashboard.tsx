import React, { useState, useEffect } from 'react';
import { Student, Test, Attempt, DraftAttempt } from '../types';
import {
  getPublishedTestsForClass,
  getAttemptsForStudent,
  getAttemptsForStudentAndTest,
  getDraftAttempt,
  clearDraftAttempt,
} from '../services/db';
import { calculateStudentAnalytics, cleanStudentTestTitle } from '../utils/analytics';
import { SelectClassPage } from './SelectClassPage';
import { ClassTestsPage } from './ClassTestsPage';
import {
  Clock,
  CheckCircle,
  FileText,
  Play,
  History,
  RefreshCw,
  Award,
  BarChart2,
  BookOpen,
  ArrowRight,
  Download,
  GraduationCap,
} from 'lucide-react';

const ProgressAnalytics = React.lazy(() => import('./ProgressAnalytics').then(m => ({ default: m.ProgressAnalytics })));
const ParentProgressCardModal = React.lazy(() => import('./ParentProgressCardModal').then(m => ({ default: m.ParentProgressCardModal })));

interface StudentDashboardProps {
  student: Student;
  onStartTest: (test: Test, attemptNumber: number) => void;
  onViewAttemptReview: (attempt: Attempt) => void;
  onContinueDraftTest?: (test: Test, draft: DraftAttempt) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  onStartTest,
  onViewAttemptReview,
  onContinueDraftTest,
}) => {
  // Read saved class from localStorage or default to Class 6
  const savedClassRaw = localStorage.getItem('selectedClass');
  const initialClassNum = savedClassRaw ? savedClassRaw.replace(/\D/g, '') || '6' : '6';
  const initialClassStr = `Class ${initialClassNum}`;

  // Class selection state
  const [selectedClass, setSelectedClass] = useState<string>(initialClassStr);

  // Active section view mode
  // Required flow: show 'select-class' first after login unless already selected
  const [activeTab, setActiveTab] = useState<'select-class' | 'tests' | 'results' | 'progress'>('select-class');

  // Data state
  const [tests, setTests] = useState<Test[]>([]);
  const [studentAttemptsMap, setStudentAttemptsMap] = useState<Record<string, Attempt[]>>({});
  const [allStudentAttempts, setAllStudentAttempts] = useState<Attempt[]>([]);
  const [draftExam, setDraftExam] = useState<DraftAttempt | null>(null);
  const [draftTestObject, setDraftTestObject] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Parent Progress Card Modal State
  const [showParentModal, setShowParentModal] = useState(false);

  // Set document.title
  useEffect(() => {
    document.title = `CBSE Maths Portal - Student ${student.name}`;
  }, [student.name]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch published tests for the selected class
      const availableTests = await getPublishedTestsForClass(selectedClass);
      setTests(availableTests);

      // 2. Fetch all attempts for this student
      const userAttempts = await getAttemptsForStudent(student.id);
      setAllStudentAttempts(userAttempts);

      // 3. Map attempts by testId
      const map: Record<string, Attempt[]> = {};
      for (const t of availableTests) {
        const testAttempts = await getAttemptsForStudentAndTest(student.id, t.id);
        map[t.id] = testAttempts;
      }
      setStudentAttemptsMap(map);

      // 4. Check for unfinished/draft exam for this student
      let activeDraft = getDraftAttempt(student.id);

      if (activeDraft) {
        if (activeDraft.submitted === true || activeDraft.status === 'completed') {
          clearDraftAttempt(student.id);
          activeDraft = null;
        } else {
          const testAttempts = userAttempts.filter((a) => a.testId === activeDraft?.testId);
          if (testAttempts.length > 0) {
            const draftTime = activeDraft.updatedAt ? new Date(activeDraft.updatedAt).getTime() : 0;
            const hasRecentAttempt = testAttempts.some((a) => {
              const subTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
              return subTime >= draftTime - 120000;
            });

            if (hasRecentAttempt) {
              clearDraftAttempt(student.id);
              activeDraft = null;
            }
          }
        }
      }

      setDraftExam(activeDraft);

      if (activeDraft) {
        const foundTest = availableTests.find((t) => t.id === activeDraft.testId);
        if (foundTest) {
          setDraftTestObject(foundTest);
        } else {
          setDraftTestObject(null);
        }
      } else {
        setDraftTestObject(null);
      }
    } catch (err) {
      console.error('Error loading student dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [student.id, selectedClass]);

  const handleClassSelection = (clsVal: number | string) => {
    const numStr = String(clsVal).replace(/\D/g, '') || '6';
    const formattedClass = `Class ${numStr}`;
    localStorage.setItem('selectedClass', numStr);
    setSelectedClass(formattedClass);
    setActiveTab('tests');
  };

  const handleContinueDraft = () => {
    if (draftExam && draftTestObject && onContinueDraftTest) {
      onContinueDraftTest(draftTestObject, draftExam);
    } else if (draftExam && tests.length > 0) {
      const found = tests.find((t) => t.id === draftExam.testId) || tests[0];
      if (onContinueDraftTest) {
        onContinueDraftTest(found, draftExam);
      }
    }
  };

  const handleDiscardDraft = () => {
    if (confirm('Are you sure you want to discard your unfinished exam progress?')) {
      clearDraftAttempt(student.id);
      setDraftExam(null);
      setDraftTestObject(null);
    }
  };

  const analytics = calculateStudentAnalytics(student.name, student.class, allStudentAttempts);
  const currentClassNum = selectedClass.replace(/\D/g, '') || '6';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full font-semibold mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Official Student Examination Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome, <span className="text-blue-400">{student.name}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Student ID: <strong className="text-blue-300 font-mono">{student.studentId || student.id}</strong> • Enrolled Class:{' '}
            <strong className="text-slate-200">{student.class}</strong> ({student.section || 'A'}) • Active View Class:{' '}
            <strong className="text-emerald-400">{selectedClass}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowParentModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Progress Card</span>
          </button>

          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Navigation Bar / Quick Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 no-scrollbar">
        <button
          onClick={() => setActiveTab('select-class')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'select-class'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Select Class</span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tests'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Available Tests ({selectedClass})</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'results'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>My Results ({allStudentAttempts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'progress'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>My Progress Analytics</span>
        </button>
      </div>

      {/* VIEW 1: SELECT CLASS PAGE */}
      {activeTab === 'select-class' && (
        <SelectClassPage
          student={student}
          onClassSelect={handleClassSelection}
        />
      )}

      {/* VIEW 2: AVAILABLE TESTS PAGE */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          {/* Active / Unfinished Exam Draft Banner */}
          {draftExam && (
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Unfinished Exam Found
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {cleanStudentTestTitle(draftExam.testTitle || 'Mathematics Test')}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span>Class: <strong className="text-white">{draftExam.testClass}</strong></span>
                  <span>Progress: <strong className="text-amber-400">Question {draftExam.currentIndex + 1}</strong></span>
                  <span>Time Left: <strong className="text-amber-400">{Math.ceil(draftExam.timeLeft / 60)} Minutes</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDiscardDraft}
                  className="px-4 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 text-xs font-semibold transition-all cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={handleContinueDraft}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-6 py-3 rounded-xl shadow-lg transition-all text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Continue Exam</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Available Tests List Component */}
          <ClassTestsPage
            classId={currentClassNum}
            tests={tests}
            studentAttemptsMap={studentAttemptsMap}
            draftExam={draftExam}
            isLoading={isLoading}
            onChangeClass={() => setActiveTab('select-class')}
            onStartTest={onStartTest}
            onContinueDraft={handleContinueDraft}
          />
        </div>
      )}

      {/* VIEW 3: MY RESULTS */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <span>My Results ({allStudentAttempts.length})</span>
            </h2>
            <span className="text-xs text-slate-400">History of submitted test attempts</span>
          </div>

          {allStudentAttempts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-2">
              <Award className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">No Test Results Recorded Yet</h3>
              <p className="text-xs text-slate-400">Complete an available test paper to record test results.</p>
              <button
                onClick={() => setActiveTab('select-class')}
                className="mt-3 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md cursor-pointer"
              >
                Start a Test Now
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Lesson Test Name</th>
                      <th className="px-6 py-4">Attempt #</th>
                      <th className="px-6 py-4">Score</th>
                      <th className="px-6 py-4">Percentage</th>
                      <th className="px-6 py-4">Submitted Date</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allStudentAttempts.map((att) => {
                      const percentage = Math.round((att.score / (att.totalQuestions || 1)) * 100);
                      const isPassed = percentage >= 40;
                      const cleanTitle = cleanStudentTestTitle(att.testTitle || 'Mathematics Test');

                      return (
                        <tr key={att.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{cleanTitle}</td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-full font-semibold">
                              Attempt #{att.attemptNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-200">
                            {att.score} / {att.totalQuestions}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full ${
                                isPassed
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
                              }`}
                            >
                              {percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {att.submittedAt ? new Date(att.submittedAt).toLocaleString('en-IN') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => onViewAttemptReview(att)}
                              className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                            >
                              Review Answers →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: MY PROGRESS ANALYTICS */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <span>My Progress Analytics & Lesson Bar Chart</span>
            </h2>

            <button
              onClick={() => setShowParentModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Parent Card Modal</span>
            </button>
          </div>

          <React.Suspense fallback={<div className="p-6 text-center text-slate-400 font-medium animate-pulse">Loading analytics...</div>}>
            <ProgressAnalytics
              student={student}
              attempts={allStudentAttempts}
              onViewAttemptReview={onViewAttemptReview}
            />
          </React.Suspense>
        </div>
      )}

      {/* Parent Progress Card Modal */}
      {showParentModal && (
        <React.Suspense fallback={<div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center text-white">Loading report card...</div>}>
          <ParentProgressCardModal
            analytics={analytics}
            onClose={() => setShowParentModal(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
};
