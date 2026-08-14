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

      // 4. Clean up any leftover drafts for this student
      clearDraftAttempt(student.id);
      setDraftExam(null);
      setDraftTestObject(null);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#FFFFFF] text-[#0B3D91]">
      {/* Hero Section */}
      <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-top-4 border-t-[#2563EB] rounded-[14px] p-6 sm:p-8 shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#0B3D91] text-[#FFFFFF] text-xs px-3 py-1 rounded-full font-bold">
            <GraduationCap className="w-3.5 h-3.5 text-[#FFFFFF]" />
            <span>CBSE Mathematics Assessment Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3D91] tracking-tight">
            Master CBSE Mathematics
          </h1>
          <p className="text-sm font-semibold text-[#2563EB]">
            Practice • Grand Tests • Progress Tracking
          </p>
          <p className="text-xs text-[#0B3D91]/80 font-medium">
            Welcome, <strong className="text-[#0B3D91]">{student.name}</strong> • Student ID: <span className="font-mono">{student.studentId || student.id}</span> • Enrolled Class: <strong>{student.class}</strong> ({student.section || 'A'})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('select-class')}
            className="btn-primary flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-white" />
            <span>Start Test</span>
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className="btn-danger flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <BarChart2 className="w-4 h-4 text-white" />
            <span>View Progress</span>
          </button>

          <button
            onClick={() => setShowParentModal(true)}
            className="bg-[#FFFFFF] text-[#0B3D91] hover:bg-[#F8FBFF] border-2 border-[#0B3D91] font-bold px-4 py-2.5 rounded-[10px] text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#0B3D91]" />
            <span>Progress Card</span>
          </button>
        </div>
      </div>

      {/* Top Navigation Bar / Quick Tabs */}
      <div className="flex border-b border-[#D6E4FF] overflow-x-auto gap-2 no-scrollbar">
        <button
          onClick={() => setActiveTab('select-class')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap rounded-t-[10px] ${
            activeTab === 'select-class'
              ? 'bg-[#0B3D91] text-[#FFFFFF] border-b-2 border-b-[#DC2626]'
              : 'border border-[#D6E4FF] text-[#0B3D91] hover:bg-[#F8FBFF]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Select Class</span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap rounded-t-[10px] ${
            activeTab === 'tests'
              ? 'bg-[#0B3D91] text-[#FFFFFF] border-b-2 border-b-[#DC2626]'
              : 'border border-[#D6E4FF] text-[#0B3D91] hover:bg-[#F8FBFF]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Available Tests ({selectedClass})</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap rounded-t-[10px] ${
            activeTab === 'results'
              ? 'bg-[#0B3D91] text-[#FFFFFF] border-b-2 border-b-[#DC2626]'
              : 'border border-[#D6E4FF] text-[#0B3D91] hover:bg-[#F8FBFF]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>My Results ({allStudentAttempts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap rounded-t-[10px] ${
            activeTab === 'progress'
              ? 'bg-[#0B3D91] text-[#FFFFFF] border-b-2 border-b-[#DC2626]'
              : 'border border-[#D6E4FF] text-[#0B3D91] hover:bg-[#F8FBFF]'
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
          {/* Available Tests List Component */}
          <ClassTestsPage
            classId={currentClassNum}
            tests={tests}
            studentAttemptsMap={studentAttemptsMap}
            draftExam={null}
            isLoading={isLoading}
            onChangeClass={() => setActiveTab('select-class')}
            onStartTest={onStartTest}
          />
        </div>
      )}

      {/* VIEW 3: MY RESULTS */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#0052CC] flex items-center gap-2">
              <History className="w-4 h-4 text-[#0052CC]" />
              <span>My Results ({allStudentAttempts.length})</span>
            </h2>
            <span className="text-xs font-semibold text-[#0052CC]">History of submitted test attempts</span>
          </div>

          {allStudentAttempts.length === 0 ? (
            <div className="bg-white border-2 border-[#0052CC] rounded-3xl p-12 text-center space-y-2 text-[#0052CC]">
              <Award className="w-12 h-12 text-[#0052CC] mx-auto" />
              <h3 className="text-base font-extrabold text-[#0052CC]">No Test Results Recorded Yet</h3>
              <p className="text-xs font-medium text-[#0052CC]/80">Complete an available test paper to record test results.</p>
              <button
                onClick={() => setActiveTab('select-class')}
                className="mt-3 bg-[#0052CC] hover:bg-[#0052CC]/90 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md cursor-pointer"
              >
                Start a Test Now
              </button>
            </div>
          ) : (
            <div className="bg-white border-2 border-[#0052CC] rounded-3xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#0052CC]">
                  <thead className="bg-[#0052CC] text-white uppercase font-bold">
                    <tr>
                      <th className="px-6 py-4">Lesson Test Name</th>
                      <th className="px-6 py-4">Attempt #</th>
                      <th className="px-6 py-4">Score</th>
                      <th className="px-6 py-4">Percentage</th>
                      <th className="px-6 py-4">Submitted Date</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-[#0052CC]/20">
                    {allStudentAttempts.map((att) => {
                      const percentage = Math.round((att.score / (att.totalQuestions || 1)) * 100);
                      const isPassed = percentage >= 40;
                      const cleanTitle = cleanStudentTestTitle(att.testTitle || 'Mathematics Test');

                      return (
                        <tr key={att.id} className="hover:bg-[#0052CC]/5 transition-colors">
                          <td className="px-6 py-4 font-bold text-[#0052CC]">{cleanTitle}</td>
                          <td className="px-6 py-4">
                            <span className="bg-white border border-[#0052CC] text-[#0052CC] px-2.5 py-1 rounded-full font-extrabold">
                              Attempt #{att.attemptNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-extrabold text-[#0052CC]">
                            {att.score} / {att.totalQuestions}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 font-extrabold px-2.5 py-0.5 rounded-full ${
                                isPassed
                                  ? 'bg-white text-[#0052CC] border border-[#0052CC]'
                                  : 'bg-white text-[#D32F2F] border border-[#D32F2F]'
                              }`}
                            >
                              {percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-[#0052CC]">
                            {att.submittedAt ? new Date(att.submittedAt).toLocaleString('en-IN') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => onViewAttemptReview(att)}
                              className="text-[#0052CC] hover:underline font-extrabold cursor-pointer"
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
            <h2 className="text-base font-extrabold text-[#0052CC] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#0052CC]" />
              <span>My Progress Analytics & Lesson Bar Chart</span>
            </h2>

            <button
              onClick={() => setShowParentModal(true)}
              className="bg-[#0052CC] hover:bg-[#0052CC]/90 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Parent Card Modal</span>
            </button>
          </div>

          <React.Suspense fallback={<div className="p-6 text-center text-[#0052CC] font-bold animate-pulse">Loading analytics...</div>}>
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
        <React.Suspense fallback={<div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center text-[#0052CC] font-bold">Loading report card...</div>}>
          <ParentProgressCardModal
            analytics={analytics}
            onClose={() => setShowParentModal(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
};
