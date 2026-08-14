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

  // Recharts Data Sets (Strict 3-Color: Blue #0052CC, Red #D32F2F, White #FFFFFF)
  const pieData = [
    { name: 'Correct Answers', value: analytics.totalCorrect, color: '#0052CC' },
    { name: 'Wrong Answers', value: analytics.totalWrong, color: '#D32F2F' },
    { name: 'Unanswered', value: analytics.totalUnanswered, color: '#D32F2F' },
  ];

  const lessonBarData = analytics.lessonBarChartData.map((item) => ({
    lesson: item.lesson.length > 18 ? item.lesson.substring(0, 15) + '...' : item.lesson,
    fullLesson: item.lesson,
    Score: item.score,
    color: item.score >= 70 ? '#0052CC' : '#D32F2F',
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
      <div className="flex overflow-x-auto bg-white border-2 border-[#0052CC] rounded-2xl p-1.5 gap-1 shadow-md no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[#0052CC] text-white shadow-md'
              : 'text-[#0052CC] hover:bg-[#0052CC]/10'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>My Progress</span>
        </button>

        <button
          onClick={() => setActiveTab('topic')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'topic'
              ? 'bg-[#0052CC] text-white shadow-md'
              : 'text-[#0052CC] hover:bg-[#0052CC]/10'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Lesson-wise Bar Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'charts'
              ? 'bg-[#0052CC] text-white shadow-md'
              : 'text-[#0052CC] hover:bg-[#0052CC]/10'
          }`}
        >
          <PieIcon className="w-4 h-4" />
          <span>Progress Charts</span>
        </button>

        <button
          onClick={() => setActiveTab('improvement')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'improvement'
              ? 'bg-[#0052CC] text-white shadow-md'
              : 'text-[#0052CC] hover:bg-[#0052CC]/10'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Improvement Areas ({analytics.weakTopics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('card')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'card'
              ? 'bg-[#0052CC] text-white shadow-md'
              : 'text-[#0052CC] hover:bg-[#0052CC]/10'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Progress Card</span>
        </button>

        <button
          onClick={() => setActiveTab('parent')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'parent'
              ? 'bg-[#0052CC] text-white shadow-md'
              : 'text-[#0052CC] hover:bg-[#0052CC]/10'
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
          <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0052CC]/20 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#0052CC] text-white mb-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>Student Progress Dashboard</span>
                </div>
                <h2 className="text-2xl font-black text-[#0052CC]">{analytics.studentName}</h2>
                <p className="text-xs text-[#0052CC]/80 mt-1 font-semibold">
                  Class: <strong className="text-[#0052CC]">{analytics.studentClass}</strong> • CBSE Mathematics Learning Tracker
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white border-2 border-[#0052CC] px-4 py-2.5 rounded-xl text-center shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-[#0052CC]">Last Test Score</p>
                  <p className="text-xl font-black text-[#0052CC]">{analytics.lastTestScorePercentage}%</p>
                </div>

                <div className="bg-white border-2 border-[#0052CC] px-4 py-2.5 rounded-xl text-center shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-[#0052CC]">Grade</p>
                  <p className="text-xl font-black text-[#0052CC]">{analytics.grade}</p>
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#0052CC] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#0052CC]" />
                  Overall Learning Progress
                </span>
                <span className="font-extrabold text-[#0052CC] text-sm">{analytics.avgPercentage}%</span>
              </div>
              <div className="w-full bg-white border-2 border-[#0052CC] rounded-full h-4 overflow-hidden p-0.5 shadow-inner">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-[#0052CC]"
                  style={{ width: `${Math.max(3, Math.min(100, analytics.avgPercentage))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#0052CC]/80 font-semibold pt-1">
                <span>Total Tests Attempted: <strong className="text-[#0052CC]">{analytics.totalTestsAttempted}</strong></span>
                <span>Last Test: <strong className="text-[#0052CC]">{analytics.lastTestTitle}</strong></span>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white border-2 border-[#0052CC] p-4 rounded-2xl shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0052CC]">
                Tests Attempted
              </p>
              <h3 className="text-2xl font-black text-[#0052CC] mt-1">{analytics.totalTestsAttempted}</h3>
            </div>

            <div className="bg-white border-2 border-[#0052CC] p-4 rounded-2xl shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0052CC]">
                Average Percentage
              </p>
              <h3 className="text-2xl font-black text-[#0052CC] mt-1">{analytics.avgPercentage}%</h3>
            </div>

            <div className="bg-white border-2 border-[#0052CC] p-4 rounded-2xl shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0052CC]">
                Performance Grade
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-[#0052CC]">{analytics.grade}</h3>
                <span className="text-[10px] font-bold text-[#0052CC]">{analytics.performanceGradeTitle}</span>
              </div>
            </div>

            <div className="bg-white border-2 border-[#0052CC] p-4 rounded-2xl shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0052CC]">
                Last Test Score
              </p>
              <h3 className="text-2xl font-black text-[#0052CC] mt-1">
                {analytics.lastTestScorePercentage}%
              </h3>
            </div>

            <div className="bg-white border-2 border-[#0052CC] p-4 rounded-2xl shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0052CC]">
                Highest Score
              </p>
              <h3 className="text-2xl font-black text-[#0052CC] mt-1">
                {analytics.highestScorePercentage}%
              </h3>
            </div>

            <div className="bg-white border-2 border-[#D32F2F] p-4 rounded-2xl shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D32F2F]">
                Weak Lessons
              </p>
              <h3 className="text-2xl font-black text-[#D32F2F] mt-1">{analytics.weakTopics.length}</h3>
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teacher Remarks Box */}
            <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl shadow-md space-y-3">
              <div className="flex items-center gap-2 text-[#0052CC] font-bold text-sm">
                <Award className="w-5 h-5 text-[#0052CC]" />
                <span>Teacher Evaluation & Remarks</span>
              </div>
              <p className="text-xs text-[#0052CC] leading-relaxed italic bg-white p-4 rounded-xl border border-[#0052CC] font-medium">
                "{analytics.teacherRemarks}"
              </p>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl shadow-md space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#0052CC] font-bold text-sm mb-2">
                  <FileText className="w-5 h-5 text-[#0052CC]" />
                  <span>Parent Progress Card</span>
                </div>
                <p className="text-xs text-[#0052CC]/80 font-semibold leading-relaxed">
                  Generate an official performance report card for parents containing lesson breakdown, average score, grade, and weak topic action plans.
                </p>
              </div>

              <button
                onClick={() => setShowProgressCardModal(true)}
                className="w-full bg-[#0052CC] hover:bg-[#003d99] text-white font-bold py-3 rounded-xl shadow-md text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Award className="w-4 h-4" />
                <span>Generate Parent Progress Card</span>
              </button>
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="bg-white border-2 border-[#0052CC] rounded-2xl overflow-hidden shadow-md">
            <div className="p-4 bg-[#0052CC] text-white font-bold text-sm">
              Recent Test Attempts Log
            </div>
            {attempts.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#0052CC]/70 font-semibold">No attempts recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#0052CC]">
                  <thead className="bg-[#0052CC] text-white uppercase font-bold border-b border-[#0052CC]">
                    <tr>
                      <th className="px-6 py-3">Test Title</th>
                      <th className="px-6 py-3">Attempt #</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Percentage</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0052CC]/20">
                    {attempts.slice(0, 5).map((att) => {
                      const pct = Math.round((att.score / (att.totalQuestions || 1)) * 100);
                      return (
                        <tr key={att.id} className="hover:bg-[#0052CC]/5 transition-colors">
                          <td className="px-6 py-3.5 font-bold text-[#0052CC]">{att.testTitle}</td>
                          <td className="px-6 py-3.5 font-semibold">Attempt {att.attemptNumber}</td>
                          <td className="px-6 py-3.5 font-bold text-[#0052CC]">
                            {att.score} / {att.totalQuestions}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                pct >= 70
                                  ? 'bg-[#0052CC] text-white'
                                  : 'bg-[#D32F2F] text-white'
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {onViewAttemptReview && (
                              <button
                                onClick={() => onViewAttemptReview(att)}
                                className="text-[#0052CC] hover:underline font-bold cursor-pointer"
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
          <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0052CC]/20 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#0052CC] flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-[#0052CC]" />
                  <span>Lesson-wise Progress Bar Chart</span>
                </h3>
                <p className="text-xs text-[#0052CC]/80 font-semibold mt-1">
                  Percentage score for each mathematics lesson (0–100%). Easily identify strong vs weak lessons.
                </p>
              </div>
            </div>

            {/* Color Legend Rule Box */}
            <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-[#0052CC] text-xs">
              <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-[#0052CC]">
                <div className="w-3.5 h-3.5 rounded-sm bg-[#0052CC]" />
                <div>
                  <span className="font-extrabold text-[#0052CC] block">70% and above</span>
                  <span className="text-[10px] font-bold text-[#0052CC]/80">Blue → Strong Mastery</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-[#D32F2F]">
                <div className="w-3.5 h-3.5 rounded-sm bg-[#D32F2F]" />
                <div>
                  <span className="font-extrabold text-[#D32F2F] block">Below 70%</span>
                  <span className="text-[10px] font-bold text-[#D32F2F]">Red → Focus Area</span>
                </div>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lessonBarData} margin={{ top: 25, right: 30, left: 0, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0052CC" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="lesson"
                    stroke="#0052CC"
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#0052CC' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis domain={[0, 100]} stroke="#0052CC" tick={{ fontSize: 11, fill: '#0052CC' }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#0052CC', borderRadius: '12px', color: '#0052CC' }}
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
          <div className="bg-white border-2 border-[#0052CC] rounded-2xl overflow-hidden shadow-md">
            <div className="p-4 bg-[#0052CC] font-bold text-sm text-white">
              CBSE Lesson Wise Performance Summary
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#0052CC]">
                <thead className="bg-[#0052CC] text-white uppercase font-bold border-b border-[#0052CC]">
                  <tr>
                    <th className="px-6 py-3.5">Lesson Name</th>
                    <th className="px-6 py-3.5">Tests Attempted</th>
                    <th className="px-6 py-3.5">Percentage Score</th>
                    <th className="px-6 py-3.5">Performance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0052CC]/20">
                  {analytics.lessonBarChartData.map((lb) => (
                    <tr key={lb.lesson} className="hover:bg-[#0052CC]/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#0052CC]">{lb.lesson}</td>
                      <td className="px-6 py-4 font-semibold">{lb.attemptsCount} test(s)</td>
                      <td className="px-6 py-4 font-bold" style={{ color: lb.score >= 70 ? '#0052CC' : '#D32F2F' }}>
                        {lb.score}%
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            lb.score >= 70 ? 'bg-[#0052CC] text-white' : 'bg-[#D32F2F] text-white'
                          }`}
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
          <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl shadow-md space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#0052CC] flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-[#0052CC]" />
                <span>Overall Test Performance</span>
              </h3>
              <p className="text-xs text-[#0052CC]/80 font-semibold mt-1">
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
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#0052CC', borderRadius: '12px', color: '#0052CC' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart */}
          <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl shadow-md space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#0052CC] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0052CC]" />
                <span>Performance Improvement Trend</span>
              </h3>
              <p className="text-xs text-[#0052CC]/80 font-semibold mt-1">
                Progress line showing score growth across consecutive test attempts.
              </p>
            </div>

            {lineData.length === 0 ? (
              <p className="text-center text-xs text-[#0052CC]/70 font-semibold py-12">No test history recorded.</p>
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0052CC" strokeOpacity={0.2} />
                    <XAxis dataKey="attempt" stroke="#0052CC" tick={{ fontSize: 11, fill: '#0052CC' }} />
                    <YAxis domain={[0, 100]} stroke="#0052CC" tick={{ fontSize: 11, fill: '#0052CC' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#0052CC', borderRadius: '12px', color: '#0052CC' }} />
                    <Line type="monotone" dataKey="Score" stroke="#0052CC" strokeWidth={3} dot={{ r: 5, fill: '#0052CC' }} />
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
          <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0052CC] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#D32F2F]" />
                  <span>Improvement Area Detection</span>
                </h3>
                <p className="text-xs text-[#0052CC]/80 font-semibold mt-1">
                  Automated rule-based detection identifying weak CBSE chapters and recommended actions.
                </p>
              </div>

              <span className="bg-[#D32F2F] text-white px-3 py-1 rounded-full text-xs font-bold">
                {analytics.weakTopics.length} Focus Area(s)
              </span>
            </div>

            {/* Rule Legend */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-[#D32F2F]/10 border border-[#D32F2F] p-2.5 rounded-xl text-center">
                <span className="text-[10px] font-bold text-[#D32F2F] block uppercase">&lt; 70%</span>
                <span className="text-xs font-bold text-[#D32F2F]">Improvement Required</span>
              </div>
              <div className="bg-[#0052CC]/10 border border-[#0052CC] p-2.5 rounded-xl text-center">
                <span className="text-[10px] font-bold text-[#0052CC] block uppercase">70%+</span>
                <span className="text-xs font-bold text-[#0052CC]">Good Mastery</span>
              </div>
            </div>
          </div>

          {/* Weak Topics Cards */}
          {analytics.weakTopics.length === 0 ? (
            <div className="bg-white border-2 border-[#0052CC] p-8 rounded-2xl text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-[#0052CC] mx-auto" />
              <h4 className="text-base font-bold text-[#0052CC]">No Critical Weak Areas Found!</h4>
              <p className="text-xs text-[#0052CC]/80 font-semibold">
                You are scoring above 70% in all attempted topics. Maintain your revision momentum!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analytics.weakTopics.map((wt) => (
                <div
                  key={wt.topic}
                  className="bg-white border-2 border-[#D32F2F] p-6 rounded-2xl shadow-md space-y-4"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-[#D32F2F]/20 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D32F2F] block">
                        Weak CBSE Topic
                      </span>
                      <h4 className="text-lg font-bold text-[#D32F2F] mt-0.5">{wt.topic}</h4>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D32F2F] text-white">
                      {wt.status} ({wt.avgPercentage}%)
                    </span>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-[#0052CC] mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#0052CC]" />
                      <span>Recommended Action Plan:</span>
                    </h5>
                    <ul className="space-y-2 text-xs text-[#0052CC] font-semibold">
                      {wt.recommendedActions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#0052CC]">
                          <span className="text-[#0052CC] font-bold">•</span>
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
        <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl shadow-md space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0052CC]/20 pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#0052CC] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#0052CC]" />
                <span>Parent Progress Card Preview</span>
              </h3>
              <p className="text-xs text-[#0052CC]/80 font-semibold mt-0.5">
                Full progress report formatted for parent submission and printable export.
              </p>
            </div>

            <button
              onClick={() => setShowProgressCardModal(true)}
              className="bg-[#0052CC] hover:bg-[#003d99] text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer self-start md:self-auto"
            >
              <FileText className="w-4 h-4" />
              <span>Launch Full Modal View</span>
            </button>
          </div>

          {/* Embedded Progress Card Summary */}
          <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-[#0052CC]/20 pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#0052CC]">{analytics.studentName}</h2>
                <p className="text-xs text-[#0052CC]/80 font-semibold mt-1">Class: {analytics.studentClass}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#0052CC]">Grade {analytics.grade}</span>
                <p className="text-[10px] text-[#0052CC] uppercase font-bold">{analytics.performanceGradeTitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-xl border border-[#0052CC]">
                <span className="text-[10px] text-[#0052CC] font-bold uppercase block">Overall Average</span>
                <span className="text-base font-bold text-[#0052CC]">{analytics.avgPercentage}%</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#0052CC]">
                <span className="text-[10px] text-[#0052CC] font-bold uppercase block">Tests Attempted</span>
                <span className="text-base font-bold text-[#0052CC]">{analytics.totalTestsAttempted}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#0052CC] col-span-2 sm:col-span-1">
                <span className="text-[10px] text-[#0052CC] font-bold uppercase block">Highest Score</span>
                <span className="text-base font-bold text-[#0052CC]">{analytics.highestScorePercentage}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#0052CC]">Teacher Remarks:</h4>
              <p className="text-xs text-[#0052CC] italic bg-white p-3 rounded-xl border border-[#0052CC] font-medium">
                "{analytics.teacherRemarks}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PARENT COMMUNICATION */}
      {activeTab === 'parent' && (
        <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl shadow-md space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#0052CC] flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#0052CC]" />
              <span>Send Progress Card to Parent</span>
            </h3>
            <p className="text-xs text-[#0052CC]/80 font-semibold mt-1">
              Select your preferred communication channel to send the student progress report directly to parents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* WhatsApp */}
            <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#0052CC] flex items-center justify-center text-white mb-3">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-base font-bold text-[#0052CC]">WhatsApp Share Link</h4>
                <p className="text-xs text-[#0052CC]/80 font-semibold mt-1">
                  Generates an instant WhatsApp message pre-filled with student scores, grade, and weak topic actions.
                </p>
              </div>

              <button
                onClick={() => setShowProgressCardModal(true)}
                className="w-full bg-[#0052CC] hover:bg-[#003d99] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span>Open WhatsApp Share</span>
              </button>
            </div>

            {/* Email PDF */}
            <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#0052CC] flex items-center justify-center text-white mb-3">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-base font-bold text-[#0052CC]">Email Progress Card</h4>
                <p className="text-xs text-[#0052CC]/80 font-semibold mt-1">
                  Email an official performance progress card with pre-formatted subject line and attached PDF report.
                </p>
              </div>

              <button
                onClick={() => setShowProgressCardModal(true)}
                className="w-full bg-[#0052CC] hover:bg-[#003d99] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Mail className="w-4 h-4 text-white" />
                <span>Email PDF Report</span>
              </button>
            </div>

            {/* Download PDF */}
            <div className="bg-white border-2 border-[#0052CC] p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#0052CC] flex items-center justify-center text-white mb-3">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-base font-bold text-[#0052CC]">Download PDF Card</h4>
                <p className="text-xs text-[#0052CC]/80 font-semibold mt-1">
                  Download or print a clean, high-resolution Progress Report Card for school records and offline distribution.
                </p>
              </div>

              <button
                onClick={() => setShowProgressCardModal(true)}
                className="w-full bg-[#0052CC] hover:bg-[#003d99] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Card Modal */}
      {showProgressCardModal && (
        <React.Suspense fallback={<div className="fixed inset-0 bg-[#0052CC]/20 backdrop-blur-sm flex items-center justify-center text-[#0052CC] font-bold">Loading...</div>}>
          <ParentProgressCardModal
            analytics={analytics}
            onClose={() => setShowProgressCardModal(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
};
