import React, { useState } from 'react';
import { Attempt, Student } from '../types';
import { calculateStudentAnalytics } from '../utils/analytics';
const ParentProgressCardModal = React.lazy(() => import('./ParentProgressCardModal').then(m => ({ default: m.ParentProgressCardModal })));
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart2,
  PieChart as PieIcon,
  TrendingUp,
  AlertTriangle,
  Award,
  Share2,
  Mail,
  Download,
  BookOpen,
  CheckCircle,
  FileText,
} from 'lucide-react';

interface ProgressAnalyticsProps {
  student: Student;
  attempts: Attempt[];
  onViewAttemptReview?: (attempt: Attempt) => void;
}

export const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({
  student,
  attempts,
  onViewAttemptReview,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'topic' | 'charts' | 'improvement' | 'card' | 'parent'
  >('overview');

  const [showProgressCardModal, setShowProgressCardModal] = useState(false);

  const analytics = calculateStudentAnalytics(student.name, student.class, attempts);

  // Recharts Data Sets
  const pieData = [
    { name: 'Correct Answers', value: analytics.totalCorrect, color: '#10b981' },
    { name: 'Wrong Answers', value: analytics.totalWrong, color: '#ef4444' },
    { name: 'Unanswered', value: analytics.totalUnanswered, color: '#f59e0b' },
  ];

  const lessonBarData = analytics.lessonBarChartData.map((item) => ({
    lesson: item.lesson.length > 18 ? item.lesson.substring(0, 15) + '...' : item.lesson,
    fullLesson: item.lesson,
    Score: item.score,
    color: item.color,
    status: item.status,
    attemptsCount: item.attemptsCount,
  }));

  const lineData = analytics.improvementTrend.map((t) => ({
    attempt: t.attemptLabel,
    Score: t.scorePercentage,
    topic: t.topic,
    date: t.dateStr,
  }));

  return (
    <div className="space-y-6">
      {/* Analytics Tabs Bar */}
      <div className="flex overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl p-1.5 gap-1 shadow-md no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>My Progress</span>
        </button>

        <button
          onClick={() => setActiveTab('topic')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'topic'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Lesson-wise Bar Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'charts'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <PieIcon className="w-4 h-4" />
          <span>Progress Charts</span>
        </button>

        <button
          onClick={() => setActiveTab('improvement')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'improvement'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Improvement Areas ({analytics.weakTopics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('card')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'card'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Progress Card</span>
        </button>

        <button
          onClick={() => setActiveTab('parent')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'parent'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Parent Communication</span>
        </button>
      </div>

      {/* TAB 1: MY PROGRESS OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* My Progress Header Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>Student Progress Dashboard</span>
                </div>
                <h2 className="text-2xl font-black text-white">{analytics.studentName}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Class: <strong className="text-slate-200">{analytics.studentClass}</strong> • CBSE Mathematics Learning Tracker
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl text-center shadow-md">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Last Test Score</p>
                  <p className="text-xl font-black text-blue-400">{analytics.lastTestScorePercentage}%</p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl text-center shadow-md">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Grade</p>
                  <p className="text-xl font-black text-emerald-400">{analytics.grade}</p>
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Overall Learning Progress
                </span>
                <span className="font-extrabold text-blue-400 text-sm">{analytics.avgPercentage}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden p-0.5 border border-slate-800 shadow-inner">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400"
                  style={{ width: `${Math.max(3, Math.min(100, analytics.avgPercentage))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span>Total Tests Attempted: <strong className="text-white">{analytics.totalTestsAttempted}</strong></span>
                <span>Last Test: <strong className="text-slate-200">{analytics.lastTestTitle}</strong></span>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Tests Attempted
              </p>
              <h3 className="text-2xl font-black text-white mt-1">{analytics.totalTestsAttempted}</h3>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Average Percentage
              </p>
              <h3 className="text-2xl font-black text-blue-400 mt-1">{analytics.avgPercentage}%</h3>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Performance Grade
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-emerald-400">{analytics.grade}</h3>
                <span className="text-[10px] font-bold text-slate-400">{analytics.performanceGradeTitle}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Last Test Score
              </p>
              <h3 className="text-2xl font-black text-blue-400 mt-1">
                {analytics.lastTestScorePercentage}%
              </h3>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Highest Score
              </p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">
                {analytics.highestScorePercentage}%
              </h3>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Weak Lessons
              </p>
              <h3 className="text-2xl font-black text-red-400 mt-1">{analytics.weakTopics.length}</h3>
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teacher Remarks Box */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Award className="w-5 h-5" />
                <span>Teacher Evaluation & Remarks</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                "{analytics.teacherRemarks}"
              </p>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-2">
                  <FileText className="w-5 h-5" />
                  <span>Parent Progress Card</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate an official performance report card for parents containing lesson breakdown, average score, grade, and weak topic action plans.
                </p>
              </div>

              <button
                onClick={() => setShowProgressCardModal(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Award className="w-4 h-4" />
                <span>Generate Parent Progress Card</span>
              </button>
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-800/80 border-b border-slate-800 font-bold text-sm text-white">
              Recent Test Attempts Log
            </div>
            {attempts.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No attempts recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3">Test Title</th>
                      <th className="px-6 py-3">Attempt #</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Percentage</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {attempts.slice(0, 5).map((att) => {
                      const pct = Math.round((att.score / (att.totalQuestions || 1)) * 100);
                      return (
                        <tr key={att.id} className="hover:bg-slate-800/40">
                          <td className="px-6 py-3.5 font-bold text-white">{att.testTitle}</td>
                          <td className="px-6 py-3.5">Attempt {att.attemptNumber}</td>
                          <td className="px-6 py-3.5 font-bold text-slate-200">
                            {att.score} / {att.totalQuestions}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                pct >= 85
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : pct >= 70
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : pct >= 50
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-red-500/10 text-red-400'
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {onViewAttemptReview && (
                              <button
                                onClick={() => onViewAttemptReview(att)}
                                className="text-blue-400 hover:underline font-semibold cursor-pointer"
                              >
                                Review →
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LESSON-WISE BAR CHART */}
      {activeTab === 'topic' && (
        <div className="space-y-6">
          {/* Bar Chart Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-blue-400" />
                  <span>Lesson-wise Progress Bar Chart</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Percentage score for each mathematics lesson (0–100%). Easily identify strong vs weak lessons.
                </p>
              </div>
            </div>

            {/* Color Legend Rule Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="w-3.5 h-3.5 rounded-sm bg-[#10b981]" />
                <div>
                  <span className="font-extrabold text-emerald-400 block">85% and above</span>
                  <span className="text-[10px] text-slate-400">Green → Strong / Excellent</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="w-3.5 h-3.5 rounded-sm bg-[#3b82f6]" />
                <div>
                  <span className="font-extrabold text-blue-400 block">70% to 84%</span>
                  <span className="text-[10px] text-slate-400">Blue → Good Mastery</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="w-3.5 h-3.5 rounded-sm bg-[#f59e0b]" />
                <div>
                  <span className="font-extrabold text-amber-400 block">50% to 69%</span>
                  <span className="text-[10px] text-slate-400">Orange → Needs Practice</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="w-3.5 h-3.5 rounded-sm bg-[#ef4444]" />
                <div>
                  <span className="font-extrabold text-red-400 block">Below 50%</span>
                  <span className="text-[10px] text-slate-400">Red → Critical Area</span>
                </div>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lessonBarData} margin={{ top: 25, right: 30, left: 0, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="lesson"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fontWeight: 600 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any, name: any, props: any) => [
                      `${value}% (${props.payload.status})`,
                      'Lesson Score',
                    ]}
                    labelFormatter={(label: any, items: any) => items[0]?.payload?.fullLesson || label}
                  />
                  <Bar dataKey="Score" radius={[6, 6, 0, 0]}>
                    {lessonBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Lesson Breakdown Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-800/80 border-b border-slate-800 font-bold text-sm text-white">
              CBSE Lesson Wise Performance Summary
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Lesson Name</th>
                    <th className="px-6 py-3.5">Tests Attempted</th>
                    <th className="px-6 py-3.5">Percentage Score</th>
                    <th className="px-6 py-3.5">Performance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {analytics.lessonBarChartData.map((lb) => (
                    <tr key={lb.lesson} className="hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-bold text-white">{lb.lesson}</td>
                      <td className="px-6 py-4">{lb.attemptsCount} test(s)</td>
                      <td className="px-6 py-4 font-bold" style={{ color: lb.color }}>
                        {lb.score}%
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold border"
                          style={{
                            backgroundColor: `${lb.color}15`,
                            color: lb.color,
                            borderColor: `${lb.color}40`,
                          }}
                        >
                          {lb.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROGRESS CHARTS */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-emerald-400" />
                <span>Overall Test Performance</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Distribution of correct, wrong, and unanswered questions.
              </p>
            </div>

            <div className="w-full h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <span>Performance Improvement Trend</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Progress line showing score growth across consecutive test attempts.
              </p>
            </div>

            {lineData.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-12">No test history recorded.</p>
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="attempt" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="Score" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: IMPROVEMENT AREAS */}
      {activeTab === 'improvement' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Improvement Area Detection</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Automated rule-based detection identifying weak CBSE chapters and recommended actions.
                </p>
              </div>

              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold">
                {analytics.weakTopics.length} Focus Area(s)
              </span>
            </div>

            {/* Rule Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-center">
                <span className="text-[10px] font-bold text-red-400 block uppercase">&lt; 50%</span>
                <span className="text-xs font-bold text-white">Critical Improvement Required</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-center">
                <span className="text-[10px] font-bold text-amber-400 block uppercase">50 – 69%</span>
                <span className="text-xs font-bold text-white">Needs Practice</span>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl text-center">
                <span className="text-[10px] font-bold text-blue-400 block uppercase">70 – 84%</span>
                <span className="text-xs font-bold text-white">Good</span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-center">
                <span className="text-[10px] font-bold text-emerald-400 block uppercase">85%+</span>
                <span className="text-xs font-bold text-white">Excellent</span>
              </div>
            </div>
          </div>

          {/* Weak Topics Cards */}
          {analytics.weakTopics.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-base font-bold text-white">No Critical Weak Areas Found!</h4>
              <p className="text-xs text-slate-400">
                You are scoring above 70% in all attempted topics. Maintain your revision momentum!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analytics.weakTopics.map((wt) => (
                <div
                  key={wt.topic}
                  className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        Weak CBSE Topic
                      </span>
                      <h4 className="text-lg font-bold text-white mt-0.5">{wt.topic}</h4>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        wt.avgPercentage < 50
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {wt.status} ({wt.avgPercentage}%)
                    </span>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span>Recommended Action Plan:</span>
                    </h5>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {wt.recommendedActions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                          <span className="text-blue-400 font-bold">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PROGRESS CARD */}
      {activeTab === 'card' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-400" />
                <span>Parent Progress Card Preview</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Full progress report formatted for parent submission and printable export.
              </p>
            </div>

            <button
              onClick={() => setShowProgressCardModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-colors cursor-pointer self-start md:self-auto"
            >
              <FileText className="w-4 h-4" />
              <span>Launch Full Modal View</span>
            </button>
          </div>

          {/* Embedded Progress Card Summary */}
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{analytics.studentName}</h2>
                <p className="text-xs text-slate-400 mt-1">Class: {analytics.studentClass}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-blue-400">Grade {analytics.grade}</span>
                <p className="text-[10px] text-slate-500 uppercase font-bold">{analytics.performanceGradeTitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Overall Average</span>
                <span className="text-base font-bold text-white">{analytics.avgPercentage}%</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Tests Attempted</span>
                <span className="text-base font-bold text-white">{analytics.totalTestsAttempted}</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Highest Score</span>
                <span className="text-base font-bold text-emerald-400">{analytics.highestScorePercentage}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300">Teacher Remarks:</h4>
              <p className="text-xs text-slate-400 italic bg-slate-900 p-3 rounded-xl border border-slate-800">
                "{analytics.teacherRemarks}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PARENT COMMUNICATION */}
      {activeTab === 'parent' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-400" />
              <span>Send Progress Card to Parent</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select your preferred communication channel to send the student progress report directly to parents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* WhatsApp */}
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <Share2 className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">WhatsApp Share Link</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Generates an instant WhatsApp message pre-filled with student scores, grade, and weak topic actions.
                </p>
              </div>

              <button
                onClick={() => setShowProgressCardModal(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Open WhatsApp Share</span>
              </button>
            </div>

            {/* Email PDF */}
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                  <Mail className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Email Progress Card</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Email an official performance progress card with pre-formatted subject line and attached PDF report.
                </p>
              </div>

              <button
                onClick={() => setShowProgressCardModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>Email PDF Report</span>
              </button>
            </div>

            {/* Download PDF */}
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Download PDF Card</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Download or print a clean, high-resolution Progress Report Card for school records and offline distribution.
                </p>
              </div>

              <button
                onClick={() => setShowProgressCardModal(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Card Modal */}
      {showProgressCardModal && (
        <React.Suspense fallback={<div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center text-white">Loading...</div>}>
          <ParentProgressCardModal
            analytics={analytics}
            onClose={() => setShowProgressCardModal(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
};
