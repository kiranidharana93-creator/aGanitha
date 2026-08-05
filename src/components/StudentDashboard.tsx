import React, { useState, useEffect } from 'react';
import { Student, Test, Attempt, DraftAttempt } from '../types';
import {
  getPublishedTestsForClass,
  getAttemptsForStudent,
  getAttemptsForStudentAndTest,
  getDraftAttempt,
  clearDraftAttempt,
} from '../services/db';
import { calculateStudentAnalytics } from '../utils/analytics';
import {
  Clock,
  HelpCircle,
  CheckCircle,
  FileText,
  Play,
  History,
  RefreshCw,
  Award,
  BarChart2,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Download,
  Share2,
} from 'lucide-react';
import { ProgressAnalytics } from './ProgressAnalytics';
import { ParentProgressCardModal } from './ParentProgressCardModal';

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
  // Class selection state (defaults to student's registered class)
  const [selectedClass, setSelectedClass] = useState<string>(student.class || 'Class 6');

  // Active section view / scroll tabs
  const [activeTab, setActiveTab] = useState<'all' | 'tests' | 'results' | 'progress'>('all');

  // Data state
  const [tests, setTests] = useState<Test[]>([]);
  const [studentAttemptsMap, setStudentAttemptsMap] = useState<Record<string, Attempt[]>>({});
  const [allStudentAttempts, setAllStudentAttempts] = useState<Attempt[]>([]);
  const [draftExam, setDraftExam] = useState<DraftAttempt | null>(null);
  const [draftTestObject, setDraftTestObject] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Parent Progress Card Modal State
  const [showParentModal, setShowParentModal] = useState(false);

  const classOptions = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Check for unfinished/draft exam for this student
      const activeDraft = getDraftAttempt(student.id);
      setDraftExam(activeDraft);

      // 2. Fetch published tests for the selected class
      const availableTests = await getPublishedTestsForClass(selectedClass);
      setTests(availableTests);

      if (activeDraft) {
        const foundTest = availableTests.find((t) => t.id === activeDraft.testId);
        if (foundTest) {
          setDraftTestObject(foundTest);
        }
      }

      // 3. Fetch all attempts for this student
      const userAttempts = await getAttemptsForStudent(student.id);
      setAllStudentAttempts(userAttempts);

      // 4. Map attempts by testId
      const map: Record<string, Attempt[]> = {};
      for (const t of availableTests) {
        const testAttempts = await getAttemptsForStudentAndTest(student.id, t.id);
        map[t.id] = testAttempts;
      }
      setStudentAttemptsMap(map);
    } catch (err) {
      console.error('Error loading student dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [student.id, selectedClass]);

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

  const analytics = calculateStudentAnalytics(student, allStudentAttempts);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full font-semibold mb-2">
            <span>Official Student Examination Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome, <span className="text-blue-400">{student.name}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Student ID: <strong className="text-blue-300 font-mono">{student.studentId || student.id}</strong> • Class:{' '}
            <strong className="text-slate-200">{student.class}</strong> ({student.section || 'A'})
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
            <span>Refresh Portal</span>
          </button>
        </div>
      </div>

      {/* Navigation Quick Jump Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'all'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Full Dashboard View</span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tests'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Available Tests ({tests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'results'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>My Results ({allStudentAttempts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'progress'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>My Progress Analytics</span>
        </button>
      </div>

      {/* SECTION 1: CONTINUE EXAM */}
      {(activeTab === 'all' || activeTab === 'tests') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>1. Active / Unfinished Exam Status</span>
            </h2>
          </div>

          {draftExam ? (
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Unfinished Exam Found
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {draftExam.testTitle || 'CBSE Mathematics Test'}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span>Class: <strong className="text-white">{draftExam.testClass}</strong></span>
                  <span>Progress: <strong className="text-amber-400">Question {draftExam.currentIndex + 1}</strong></span>
                  <span>Time Left: <strong className="text-amber-400">{Math.ceil(draftExam.timeLeft / 60)} Minutes</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
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
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">No active exam found.</p>
                  <p className="text-xs text-slate-400">All previous exam attempts have been submitted cleanly.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: CHOOSE CLASS */}
      {(activeTab === 'all' || activeTab === 'tests') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>2. Choose Class for Examination Papers</span>
            </h2>
            <span className="text-xs text-slate-400">Pre-selected: <strong className="text-blue-400">{student.class}</strong></span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {classOptions.map((cls) => {
              const isSelected = selectedClass === cls;
              const isRegisteredClass = student.class === cls;

              return (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`p-4 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400 text-white shadow-lg ring-2 ring-blue-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  {isRegisteredClass && (
                    <span className="absolute -top-2 right-2 bg-emerald-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                      Enrolled
                    </span>
                  )}
                  <span className="text-sm font-black">{cls}</span>
                  <span className="text-[10px] opacity-80 font-normal">CBSE Maths</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: AVAILABLE TESTS */}
      {(activeTab === 'all' || activeTab === 'tests') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>3. Available Tests ({selectedClass})</span>
            </h2>
            <span className="text-xs text-slate-400">Showing published test papers for {selectedClass}</span>
          </div>

          {isLoading ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading test papers...</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">No Tests Available for {selectedClass}</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No active published tests available for <strong>{selectedClass}</strong> right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((test) => {
                const attempts = studentAttemptsMap[test.id] || [];
                const attemptsCount = attempts.length;
                const nextAttemptNumber = attemptsCount + 1;
                const isDraftForThis = draftExam && draftExam.testId === test.id;

                return (
                  <div
                    key={test.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-lg flex flex-col justify-between transition-all space-y-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="bg-slate-800 text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700">
                          {test.class}
                        </span>

                        {isDraftForThis ? (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] px-2.5 py-1 rounded-full font-bold">
                            In Progress
                          </span>
                        ) : attemptsCount > 0 ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Attempted {attemptsCount} {attemptsCount === 1 ? 'Time' : 'Times'}
                          </span>
                        ) : (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] px-2.5 py-1 rounded-full font-bold">
                            New Test
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white leading-snug">{test.title}</h3>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <div>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase">Per Qn Time</p>
                            <p className="font-bold text-slate-200">60 Seconds</p>
                          </div>
                        </div>

                        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-indigo-400" />
                          <div>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase">Questions</p>
                            <p className="font-bold text-slate-200">{test.questionCount || 0} Questions</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {isDraftForThis ? (
                        <button
                          onClick={handleContinueDraft}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-slate-950" />
                          <span>Resume Exam Progress</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartTest(test, nextAttemptNumber)}
                          disabled={(test.questionCount || 0) === 0}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>{attemptsCount > 0 ? `Retake Test (Attempt ${nextAttemptNumber})` : 'Start Test'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: MY RESULTS */}
      {(activeTab === 'all' || activeTab === 'results') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <span>4. My Results ({allStudentAttempts.length})</span>
            </h2>
            <span className="text-xs text-slate-400">History of submitted test attempts</span>
          </div>

          {allStudentAttempts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <Award className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-200">No Test Results Recorded Yet</h3>
              <p className="text-xs text-slate-400">Complete an available test paper above to record test results.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">Test Title</th>
                      <th className="px-6 py-3.5">Attempt #</th>
                      <th className="px-6 py-3.5">Score</th>
                      <th className="px-6 py-3.5">Percentage</th>
                      <th className="px-6 py-3.5">Submitted Date</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allStudentAttempts.map((att) => {
                      const percentage = Math.round((att.score / (att.totalQuestions || 1)) * 100);
                      const isPassed = percentage >= 40;

                      return (
                        <tr key={att.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{att.testTitle || 'CBSE Maths Test'}</td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-full font-semibold">
                              Attempt {att.attemptNumber}
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

      {/* SECTION 5: MY PROGRESS & BAR CHARTS */}
      {(activeTab === 'all' || activeTab === 'progress') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <span>5. My Progress Analytics & Lesson Bar Chart</span>
            </h2>

            <button
              onClick={() => setShowParentModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Parent Card Modal</span>
            </button>
          </div>

          <ProgressAnalytics
            student={student}
            attempts={allStudentAttempts}
            onViewAttemptReview={onViewAttemptReview}
          />
        </div>
      )}

      {/* Parent Progress Card Modal */}
      {showParentModal && (
        <ParentProgressCardModal
          analytics={analytics}
          onClose={() => setShowParentModal(false)}
        />
      )}
    </div>
  );
};
