import React, { useState, useEffect } from 'react';
import { Student, Test, Attempt } from '../types';
import { getPublishedTestsForClass, getAttemptsForStudent, getAttemptsForStudentAndTest } from '../services/db';
import { Clock, HelpCircle, CheckCircle, FileText, Play, History, RefreshCw, Award, BarChart2 } from 'lucide-react';
import { ProgressAnalytics } from './ProgressAnalytics';

interface StudentDashboardProps {
  student: Student;
  onStartTest: (test: Test, attemptNumber: number) => void;
  onViewAttemptReview: (attempt: Attempt) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  onStartTest,
  onViewAttemptReview,
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'analytics' | 'results'>('available');
  const [tests, setTests] = useState<Test[]>([]);
  const [studentAttemptsMap, setStudentAttemptsMap] = useState<Record<string, Attempt[]>>({});
  const [allStudentAttempts, setAllStudentAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch published tests matching student class
      const availableTests = await getPublishedTestsForClass(student.class);
      setTests(availableTests);

      // Fetch all attempts for this student
      const userAttempts = await getAttemptsForStudent(student.id);
      setAllStudentAttempts(userAttempts);

      // Map attempts by testId
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
  }, [student.id, student.class]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full font-semibold mb-2">
            <span>Student Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome, <span className="text-blue-400">{student.name}</span>!
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enrolled Class: <strong className="text-slate-200">{student.class}</strong> • Prepare for CBSE Board Maths Examinations
          </p>
        </div>

        <button
          onClick={loadDashboardData}
          className="self-start md:self-auto flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Tests</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'available'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Available Tests ({tests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Progress Analytics & Parent Card</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'results'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>My Test Results ({allStudentAttempts.length})</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Loading your test portal...</p>
        </div>
      ) : activeTab === 'analytics' ? (
        <ProgressAnalytics
          student={student}
          attempts={allStudentAttempts}
          onViewAttemptReview={onViewAttemptReview}
        />
      ) : activeTab === 'available' ? (
        tests.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-200">No Tests Available Currently</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              There are no published tests for <strong>{student.class}</strong> right now. Check back soon or consult your teacher.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => {
              const attempts = studentAttemptsMap[test.id] || [];
              const attemptsCount = attempts.length;
              const nextAttemptNumber = attemptsCount + 1;

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

                      {attemptsCount > 0 ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Taken {attemptsCount} {attemptsCount === 1 ? 'Time' : 'Times'}
                        </span>
                      ) : (
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-bold">
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
                    <button
                      onClick={() => onStartTest(test, nextAttemptNumber)}
                      disabled={(test.questionCount || 0) === 0}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{attemptsCount > 0 ? `Retake Test (Attempt ${nextAttemptNumber})` : 'Start Test'}</span>
                    </button>
                    {(test.questionCount || 0) === 0 && (
                      <p className="text-[11px] text-amber-400 text-center font-medium">
                        Teacher is adding questions to this test.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Results View */
        allStudentAttempts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Award className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-200">No Test Results Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You haven't submitted any test attempts yet. Complete a test from the Available Tests tab to view your score breakdown.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <span>Your Test History</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {allStudentAttempts.length} Total Submissions
              </span>
            </div>

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
                        <td className="px-6 py-4 font-bold text-white">
                          {att.testTitle || 'CBSE Mathematics Test'}
                        </td>
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
                            {isPassed ? <CheckCircle className="w-3 h-3" /> : null}
                            {percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {att.submittedAt
                            ? new Date(att.submittedAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onViewAttemptReview(att)}
                            className="text-blue-400 hover:text-blue-300 font-semibold hover:underline cursor-pointer"
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
        )
      )}
    </div>
  );
};
