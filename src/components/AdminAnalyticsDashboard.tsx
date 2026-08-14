import React, { useState, useMemo } from 'react';
import { Attempt, Student, Test } from '../types';
import { calculateStudentAnalytics, extractTopicFromTitle } from '../utils/analytics';
import { ParentProgressCardModal } from './ParentProgressCardModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  School,
  Users,
  FileCheck,
  Award,
  AlertTriangle,
  Search,
  FileText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface AdminAnalyticsDashboardProps {
  students: Student[];
  allAttempts: Attempt[];
  allTests: Test[];
}

export const AdminAnalyticsDashboard: React.FC<AdminAnalyticsDashboardProps> = ({
  students,
  allAttempts,
  allTests,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');

  // Compute School Overview Metrics
  const schoolMetrics = useMemo(() => {
    const totalStudents = students.length;
    const totalTestsConducted = allAttempts.length;

    if (totalTestsConducted === 0) {
      return {
        totalStudents,
        totalTestsConducted: 0,
        avgSchoolScore: 0,
        topTopic: 'N/A',
        lowestTopic: 'N/A',
        lowestTopicAvg: 0,
        topStudentsData: [],
        topicDifficultyData: [],
      };
    }

    let sumPct = 0;
    const topicMap: Record<string, { totalScore: number; totalQ: number; count: number }> = {};
    const studentAttemptsMap: Record<string, Attempt[]> = {};

    allAttempts.forEach((att) => {
      const q = att.totalQuestions || 1;
      const pct = Math.round((att.score / q) * 100);
      sumPct += pct;

      // Map topic
      const topic = extractTopicFromTitle(att.testTitle || 'CBSE Test');
      if (!topicMap[topic]) {
        topicMap[topic] = { totalScore: 0, totalQ: 0, count: 0 };
      }
      topicMap[topic].totalScore += att.score;
      topicMap[topic].totalQ += q;
      topicMap[topic].count += 1;

      // Group attempts by studentId
      const sId = att.studentId;
      if (!studentAttemptsMap[sId]) {
        studentAttemptsMap[sId] = [];
      }
      studentAttemptsMap[sId].push(att);
    });

    const avgSchoolScore = Math.round(sumPct / totalTestsConducted);

    // Topic difficulty calculations
    const topicList = Object.entries(topicMap).map(([topic, data]) => {
      const avgPct = Math.round((data.totalScore / (data.totalQ || 1)) * 100);
      return {
        topic,
        count: data.count,
        avgScore: avgPct,
      };
    });

    // Sort topics by avgScore descending
    topicList.sort((a, b) => b.avgScore - a.avgScore);

    const topTopic = topicList[0]?.topic || 'N/A';
    const lowestTopicObj = topicList[topicList.length - 1];
    const lowestTopic = lowestTopicObj?.topic || 'N/A';
    const lowestTopicAvg = lowestTopicObj?.avgScore || 0;

    // Student Averages for Top 5 Students
    const studentPerformanceList = students.map((s) => {
      const sAttempts = studentAttemptsMap[s.id] || [];
      const analytics = calculateStudentAnalytics(s.name, s.class, sAttempts);
      return {
        student: s,
        analytics,
        avgPct: analytics.avgPercentage,
        attemptsCount: analytics.totalTestsAttempted,
      };
    });

    studentPerformanceList.sort((a, b) => b.avgPct - a.avgPct);

    const topStudentsData = studentPerformanceList
      .filter((s) => s.attemptsCount > 0)
      .slice(0, 5)
      .map((s) => ({
        name: s.student.name.length > 15 ? s.student.name.substring(0, 12) + '...' : s.student.name,
        fullName: s.student.name,
        Average: s.avgPct,
      }));

    return {
      totalStudents,
      totalTestsConducted,
      avgSchoolScore,
      topTopic,
      lowestTopic,
      lowestTopicAvg,
      topStudentsData,
      topicDifficultyData: topicList,
    };
  }, [students, allAttempts]);

  // Filter student records table
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.class.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = classFilter === 'All' || s.class === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, classFilter]);

  // If inspecting a student's full analytics
  const selectedStudentAnalytics = useMemo(() => {
    if (!selectedStudent) return null;
    const sAttempts = allAttempts.filter((a) => a.studentId === selectedStudent.id);
    return calculateStudentAnalytics(selectedStudent.name, selectedStudent.class, sAttempts);
  }, [selectedStudent, allAttempts]);

  return (
    <div className="space-y-6">
      {/* School Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#2563EB] p-5 rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-[10px] bg-[#2563EB] flex items-center justify-center text-white shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B3D91] block">
              Total Students
            </span>
            <h3 className="text-2xl font-black text-[#0B3D91] mt-0.5">{schoolMetrics.totalStudents}</h3>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#2563EB] p-5 rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-[10px] bg-[#2563EB] flex items-center justify-center text-white shrink-0">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B3D91] block">
              Tests Conducted
            </span>
            <h3 className="text-2xl font-black text-[#0B3D91] mt-0.5">
              {schoolMetrics.totalTestsConducted}
            </h3>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#2563EB] p-5 rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-[10px] bg-[#2563EB] flex items-center justify-center text-white shrink-0">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B3D91] block">
              School Avg Score
            </span>
            <h3 className="text-2xl font-black text-[#0B3D91] mt-0.5">
              {schoolMetrics.avgSchoolScore}%
            </h3>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#2563EB] p-5 rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-[10px] bg-[#2563EB] flex items-center justify-center text-white shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B3D91] block">
              Top Topic
            </span>
            <h3 className="text-sm font-bold text-[#0B3D91] mt-0.5 truncate max-w-[120px]">
              {schoolMetrics.topTopic}
            </h3>
          </div>
        </div>

        {/* Lowest Scoring Topic Highlighted in Red */}
        <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#DC2626] p-5 rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-[10px] bg-[#DC2626] flex items-center justify-center text-white shrink-0">
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#DC2626] block">
              Most Difficult Topic
            </span>
            <h3 className="text-sm font-bold text-[#DC2626] mt-0.5 truncate max-w-[120px]">
              {schoolMetrics.lowestTopic}
            </h3>
            <span className="text-[11px] font-bold text-[#DC2626]">
              Avg: {schoolMetrics.lowestTopicAvg}%
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 5 Students Chart */}
        <div className="cbse-card p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#0B3D91] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#2563EB]" />
              <span>Top 5 Performing Students</span>
            </h3>
            <p className="text-xs font-semibold text-[#0B3D91]/80 mt-1">
              Bar chart highlighting highest average percentages across all test submissions.
            </p>
          </div>

          {schoolMetrics.topStudentsData.length === 0 ? (
            <p className="text-center text-xs font-semibold text-[#0B3D91]/70 py-12">No student scores recorded.</p>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={schoolMetrics.topStudentsData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6E4FF" strokeOpacity={0.6} />
                  <XAxis dataKey="name" stroke="#0B3D91" tick={{ fontSize: 11, fill: '#0B3D91' }} />
                  <YAxis domain={[0, 100]} stroke="#0B3D91" tick={{ fontSize: 11, fill: '#0B3D91' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#2563EB', borderRadius: '8px', color: '#0B3D91' }}
                    formatter={(val: any) => [`${val}%`, 'Average Score']}
                  />
                  <Bar dataKey="Average" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Topic Difficulty Analysis Table & Highlight */}
        <div className="cbse-card p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#0B3D91] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
              <span>Topic Difficulty Analysis</span>
            </h3>
            <p className="text-xs font-semibold text-[#0B3D91]/80 mt-1">
              Chapter difficulty ranking based on overall student accuracy. Lowest scoring topic is highlighted in red.
            </p>
          </div>

          <div className="overflow-y-auto max-h-60 rounded-[10px] border border-[#D6E4FF]">
            <table className="w-full text-left text-xs text-[#0B3D91]">
              <thead className="bg-[#0B3D91] text-white uppercase font-bold sticky top-0 border-b border-[#D6E4FF]">
                <tr>
                  <th className="px-4 py-3">Topic Chapter</th>
                  <th className="px-4 py-3 text-center">Attempts</th>
                  <th className="px-4 py-3 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6E4FF]">
                {schoolMetrics.topicDifficultyData.map((t, idx) => {
                  const isLowest = idx === schoolMetrics.topicDifficultyData.length - 1 && schoolMetrics.topicDifficultyData.length > 1;

                  return (
                    <tr
                      key={t.topic}
                      className={isLowest ? 'bg-[#DC2626]/10 text-[#DC2626] font-bold' : 'hover:bg-[#F8FBFF]'}
                    >
                      <td className="px-4 py-3 flex items-center gap-2">
                        {isLowest && (
                          <span className="bg-[#DC2626] text-white text-[9px] px-2 py-0.5 rounded uppercase font-extrabold">
                            Needs Focus
                          </span>
                        )}
                        <span>{t.topic}</span>
                      </td>
                      <td className="px-4 py-3 text-center">{t.count}</td>
                      <td className="px-4 py-3 text-right font-bold">
                        <span className={isLowest ? 'text-[#DC2626] font-black' : 'text-[#0B3D91]'}>
                          {t.avgScore}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Student Progress Card Inspection Directory */}
      <div className="cbse-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D6E4FF] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#0B3D91] flex items-center gap-2">
              <School className="w-5 h-5 text-[#2563EB]" />
              <span>Student Performance Directory & Progress Cards</span>
            </h3>
            <p className="text-xs font-semibold text-[#0B3D91]/80 mt-0.5">
              Select any student to generate and inspect their official Parent Progress Card.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#0B3D91] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-[#D6E4FF] rounded-[8px] pl-9 pr-4 py-2 text-xs text-[#0B3D91] font-bold placeholder-[#0B3D91]/50 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-white border border-[#D6E4FF] rounded-[8px] px-3 py-2 text-xs text-[#0B3D91] font-bold focus:outline-none focus:border-[#2563EB] cursor-pointer"
            >
              <option value="All">All Classes</option>
              <option value="Class 6">Class 6</option>
              <option value="Class 7">Class 7</option>
              <option value="Class 8">Class 8</option>
              <option value="Class 9">Class 9</option>
              <option value="Class 10">Class 10</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0B3D91]">
            <thead className="bg-[#0B3D91] text-white uppercase font-bold border-b border-[#D6E4FF]">
              <tr>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-6 py-3.5">Class</th>
                <th className="px-6 py-3.5">Tests Attempted</th>
                <th className="px-6 py-3.5">Average Score</th>
                <th className="px-6 py-3.5">Grade</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6E4FF]">
              {filteredStudents.map((s) => {
                const sAttempts = allAttempts.filter((a) => a.studentId === s.id);
                const sAnalytics = calculateStudentAnalytics(s.name, s.class, sAttempts);

                return (
                  <tr key={s.id} className="hover:bg-[#F8FBFF] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#0B3D91]">{s.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-white border border-[#D6E4FF] text-[#0B3D91] px-2.5 py-1 rounded-[6px] font-semibold">
                        {s.class}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#0B3D91]">{sAnalytics.totalTestsAttempted} test(s)</td>
                    <td className="px-6 py-4 font-bold text-[#0B3D91]">
                      {sAnalytics.totalTestsAttempted > 0 ? `${sAnalytics.avgPercentage}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {sAnalytics.totalTestsAttempted > 0 ? (
                        <span className="bg-[#2563EB] text-white px-2.5 py-0.5 rounded-full font-bold">
                          Grade {sAnalytics.grade}
                        </span>
                      ) : (
                        <span className="text-[#0B3D91]/60 italic font-medium">No Tests</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="btn-primary text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Inspect Progress Card</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Student Progress Card Modal */}
      {selectedStudent && selectedStudentAnalytics && (
        <ParentProgressCardModal
          analytics={selectedStudentAnalytics}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
};
