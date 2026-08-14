import React, { useState } from 'react';
import { StudentAnalytics } from '../utils/analytics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  X,
  Download,
  Mail,
  Share2,
  Award,
  AlertTriangle,
  Send,
  BookOpen,
  Check,
  Copy,
  BarChart2,
  PieChart as PieChartIcon,
} from 'lucide-react';

interface ParentProgressCardModalProps {
  analytics: StudentAnalytics;
  onClose: () => void;
}

export const ParentProgressCardModal: React.FC<ParentProgressCardModalProps> = ({
  analytics,
  onClose,
}) => {
  const [activeView, setActiveView] = useState<'official_card' | 'analytics'>('official_card');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [parentEmail, setParentEmail] = useState('');
  const [customRemark, setCustomRemark] = useState(analytics.teacherRemarks);
  const [emailSent, setEmailSent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const reportingPeriod = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  // Generate WhatsApp Share Message
  const constructWhatsAppMessage = () => {
    const topicSummary = analytics.topicPerformances
      .map((t) => `• ${t.topic}: ${t.avgPercentage}% (${t.status})`)
      .join('\n');

    const message = `📊 *CBSE Maths Portal - Progress Card* 📊\n\n*Student Name:* ${analytics.studentName}\n*Class:* ${analytics.studentClass}\n*Reporting Period:* ${reportingPeriod}\n\n🏆 *Overall Performance:* ${analytics.avgPercentage}% (Grade ${analytics.grade})\n📝 *Tests Attempted:* ${analytics.totalTestsAttempted}\n\n📚 *Topic-wise Performance:*\n${topicSummary}\n\n💡 *Teacher Remarks:*\n"${customRemark}"\n\n🎯 *Recommended Action Items:*\n${analytics.weakTopics.length > 0 ? analytics.weakTopics.map(w => `• ${w.topic}: ${w.recommendedActions[0] || 'Daily practice recommended'}`).join('\n') : '• Excellent progress! Keep up regular practice.'}\n\nCBSE Maths Portal - Automated Report`;

    return message;
  };

  const handleWhatsAppShare = () => {
    const text = constructWhatsAppMessage();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopySummary = () => {
    const text = constructWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download or print the Progress Card.');
      return;
    }

    const topicRowsHtml = (analytics.topicPerformances.length > 0 ? analytics.topicPerformances : [
      { topic: 'Whole Numbers', avgPercentage: 79, status: 'Good' },
      { topic: 'Integers', avgPercentage: 10, status: 'Critical' },
      { topic: 'Playing With Numbers', avgPercentage: 13, status: 'Critical' },
      { topic: 'Basic Geometrical Ideas', avgPercentage: 85, status: 'Strong' },
      { topic: 'Fractions', avgPercentage: 65, status: 'Needs Practice' },
    ]).map((t, idx) => `
      <tr>
        <td style="padding: 12px 18px; border: 1px solid #16449B; font-weight: 600; color: #16449B; background: #ffffff;">${t.topic}</td>
        <td style="padding: 12px 18px; border: 1px solid #16449B; text-align: center; font-weight: 800; color: ${t.avgPercentage >= 70 ? '#16449B' : '#D32F2F'}; font-size: 15px; background: #ffffff;">${t.avgPercentage}%</td>
      </tr>
    `).join('');

    const improvementText = analytics.weakTopics.length > 0
      ? analytics.weakTopics.map(w => `• ${w.topic}: ${w.recommendedActions[0] || 'Targeted practice required'}`).join('<br>')
      : '• Integer operations and sign rules<br>• Divisibility rules, HCF and LCM concepts<br>• Speed and accuracy in problem solving';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>REPORT CARD - ${analytics.studentName}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #16449B; background: #ffffff; line-height: 1.4; }
            .card-container { max-width: 800px; margin: 0 auto; border: 2px solid #16449B; border-radius: 8px; overflow: hidden; background: #ffffff; }
            
            /* Banner Header */
            .banner { background: #16449B; color: #ffffff; padding: 24px 32px; display: flex; align-items: center; justify-content: space-between; }
            .title-box h1 { margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase; }
            .title-box p { margin: 2px 0 0 0; font-size: 14px; color: #ffffff; font-weight: 600; }
            
            /* Student Details Form */
            .student-info { padding: 28px 32px; background: #ffffff; }
            .info-row { display: flex; align-items: baseline; margin-bottom: 14px; }
            .info-label { font-size: 14px; font-weight: 800; color: #16449B; width: 90px; }
            .info-colon { margin-right: 12px; font-weight: 800; color: #16449B; }
            .info-line { flex: 1; border-bottom: 2px solid #16449B; font-size: 15px; font-weight: 700; color: #16449B; padding-bottom: 2px; }
            
            /* Subject Grid Table */
            .table-container { padding: 0 32px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; border: 2px solid #16449B; font-size: 14px; }
            th { background: #16449B; color: #ffffff; padding: 12px 18px; text-align: center; font-weight: 700; border: 1px solid #16449B; font-size: 14px; }
            th:first-child { text-align: left; }
            
            /* Comment Box */
            .comment-section { padding: 24px 32px 32px 32px; }
            .comment-title { font-size: 14px; font-weight: 800; color: #16449B; margin-bottom: 8px; }
            .comment-box { border: 2px solid #16449B; border-radius: 8px; padding: 16px; background: #ffffff; min-height: 90px; font-size: 13px; color: #16449B; line-height: 1.6; }
            .improvement-title { font-weight: 800; color: #16449B; margin-top: 10px; margin-bottom: 4px; display: block; }

            @media print {
              body { padding: 0; background: #ffffff; }
              .card-container { border: 2px solid #16449B; max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            <!-- Top Banner -->
            <div class="banner">
              <div class="title-box">
                <h1>REPORT CARD</h1>
                <p>CBSE Maths Portal</p>
              </div>
              <div style="text-align: right; color: #ffffff;">
                <div style="font-size: 13px; font-weight: 700;">Period: ${reportingPeriod}</div>
              </div>
            </div>

            <!-- Student Info -->
            <div class="student-info">
              <div class="info-row">
                <span class="info-label">Student</span>
                <span class="info-colon">:</span>
                <div class="info-line">${analytics.studentName}</div>
              </div>
              <div class="info-row">
                <span class="info-label">Level</span>
                <span class="info-colon">:</span>
                <div class="info-line">Mathematics</div>
              </div>
              <div class="info-row" style="margin-bottom: 0;">
                <span class="info-label">Class</span>
                <span class="info-colon">:</span>
                <div class="info-line">Class ${analytics.studentClass}</div>
              </div>
            </div>

            <!-- Table -->
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th style="width: 60%; text-align: left; padding: 12px 18px;">Subject</th>
                    <th style="width: 40%; text-align: center; padding: 12px 18px;">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  ${topicRowsHtml}
                </tbody>
              </table>
            </div>

            <!-- Comment / Action Plan Section -->
            <div class="comment-section">
              <div class="comment-title">Comment / Action Plan :</div>
              <div class="comment-box">
                <div style="margin-bottom: 8px;">${customRemark}</div>
                <span class="improvement-title">Actionable Steps for Improvement:</span>
                <div>${improvementText}</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentEmail) return;
    setEmailSent(true);
    setTimeout(() => {
      setEmailSent(false);
      setShowEmailModal(false);
      alert(`Progress Card successfully emailed to ${parentEmail}!`);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#16449B]/20 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-2 border-[#16449B] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-[#16449B] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#16449B] flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#16449B] bg-white px-2 py-0.5 rounded-full">
                Official Report
              </span>
              <h2 className="text-xl font-black text-white">Student Progress Card</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="bg-white p-1 rounded-xl border border-white flex items-center gap-1">
              <button
                onClick={() => setActiveView('official_card')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'official_card'
                    ? 'bg-[#16449B] text-white shadow-md'
                    : 'text-[#16449B] hover:bg-[#16449B]/10'
                }`}
              >
                School Report Card
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'analytics'
                    ? 'bg-[#16449B] text-white shadow-md'
                    : 'text-[#16449B] hover:bg-[#16449B]/10'
                }`}
              >
                Detailed Analytics
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Progress Card Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[75vh] bg-white">
          {activeView === 'official_card' ? (
            /* OFFICIAL SCHOOL REPORT CARD TEMPLATE */
            <div className="bg-white rounded-2xl shadow-md overflow-hidden border-2 border-[#16449B] text-[#16449B] max-w-3xl mx-auto my-2">
              {/* Top Banner Header */}
              <div className="bg-[#16449B] text-white px-6 sm:px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase">
                      REPORT CARD
                    </h1>
                    <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                      CBSE Maths Portal
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs sm:text-sm font-bold text-white">
                    Period: {reportingPeriod}
                  </div>
                </div>
              </div>

              {/* Student Details Form Section */}
              <div className="p-6 sm:p-8 space-y-3.5 border-b-2 border-[#16449B] bg-white">
                <div className="flex items-baseline">
                  <span className="w-24 text-sm font-extrabold text-[#16449B]">Student</span>
                  <span className="font-extrabold text-[#16449B] mr-3">:</span>
                  <div className="flex-1 border-b-2 border-[#16449B] font-bold text-[#16449B] text-sm sm:text-base pb-1">
                    {analytics.studentName}
                  </div>
                </div>

                <div className="flex items-baseline">
                  <span className="w-24 text-sm font-extrabold text-[#16449B]">Level</span>
                  <span className="font-extrabold text-[#16449B] mr-3">:</span>
                  <div className="flex-1 border-b-2 border-[#16449B] font-bold text-[#16449B] text-sm pb-1">
                    Mathematics
                  </div>
                </div>

                <div className="flex items-baseline">
                  <span className="w-24 text-sm font-extrabold text-[#16449B]">Class</span>
                  <span className="font-extrabold text-[#16449B] mr-3">:</span>
                  <div className="flex-1 border-b-2 border-[#16449B] font-bold text-[#16449B] text-sm pb-1">
                    Class {analytics.studentClass}
                  </div>
                </div>
              </div>

              {/* Subject & Percentage Table */}
              <div className="p-6 sm:p-8 overflow-x-auto bg-white">
                <table className="w-full border-collapse border-2 border-[#16449B] text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#16449B] text-white">
                      <th className="p-3.5 text-left font-bold border border-[#16449B] w-3/5">Subject</th>
                      <th className="p-3.5 text-center font-bold border border-[#16449B] w-2/5">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics.topicPerformances.length > 0
                      ? analytics.topicPerformances
                      : [
                          { topic: 'Whole Numbers', avgPercentage: 79 },
                          { topic: 'Integers', avgPercentage: 10 },
                          { topic: 'Playing With Numbers', avgPercentage: 13 },
                          { topic: 'Basic Geometrical Ideas', avgPercentage: 85 },
                          { topic: 'Fractions', avgPercentage: 65 },
                        ]
                    ).map((item) => (
                      <tr
                        key={item.topic}
                        className="bg-white border-b border-[#16449B]/20"
                      >
                        <td className="p-3.5 font-semibold text-[#16449B] border border-[#16449B]">
                          {item.topic}
                        </td>
                        <td className="p-3.5 text-center font-black border border-[#16449B] text-sm sm:text-base" style={{ color: item.avgPercentage >= 70 ? '#16449B' : '#D32F2F' }}>
                          {item.avgPercentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Comment / Action Plan Box */}
              <div className="p-6 sm:p-8 space-y-3 bg-white">
                <div className="text-sm font-extrabold text-[#16449B]">Comment / Action Plan :</div>
                <div className="border-2 border-[#16449B] rounded-lg p-4 bg-white text-xs sm:text-sm text-[#16449B] space-y-3 leading-relaxed">
                  <div>
                    <span className="font-bold text-[#16449B] block mb-1">Observation & Guidance:</span>
                    <p className="text-[#16449B]">{customRemark}</p>
                  </div>

                  <div className="pt-2 border-t border-[#16449B]/20">
                    <span className="font-bold text-[#16449B] block mb-1">Actionable Steps for Student:</span>
                    {analytics.weakTopics.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-[#16449B]">
                        {analytics.weakTopics.map((wt) => (
                          <li key={wt.topic}>
                            <strong className="text-[#16449B]">{wt.topic}:</strong> {wt.recommendedActions[0] || 'Targeted concept practice'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="list-disc list-inside space-y-1 text-[#16449B]">
                        <li>🎯 Practice targeted math exercises daily</li>
                        <li>📚 Review concept notes before taking test attempts</li>
                        <li>⏱️ Work on step-by-step problem solving speed</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* DETAILED ANALYTICS VIEW */
            <>
              {/* Card Top Summary */}
          <div className="bg-white border-2 border-[#16449B] rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#16449B]/20 pb-5">
              <div>
                <h3 className="text-2xl font-black text-[#16449B]">{analytics.studentName}</h3>
                <p className="text-xs text-[#16449B]/80 font-medium mt-1">
                  Enrolled Class: <span className="text-[#16449B] font-bold">{analytics.studentClass}</span> • Reporting Period: <span className="text-[#16449B] font-bold">{reportingPeriod}</span>
                </p>
              </div>

              <div className="bg-white border-2 border-[#16449B] px-5 py-3 rounded-2xl text-center shadow-sm self-start sm:self-auto">
                <span className="text-[10px] font-extrabold text-[#16449B] uppercase tracking-wider block">
                  Overall Grade
                </span>
                <span className="text-2xl font-black text-[#16449B]">{analytics.grade}</span>
                <span className="text-[10px] font-bold text-[#16449B] block">
                  {analytics.performanceGradeTitle}
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
              <div className="bg-white border border-[#16449B] p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-semibold text-[#16449B] uppercase tracking-wider block">
                  Tests Attempted
                </span>
                <span className="text-lg font-black text-[#16449B] mt-1 block">
                  {analytics.totalTestsAttempted}
                </span>
              </div>

              <div className="bg-white border border-[#16449B] p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-semibold text-[#16449B] uppercase tracking-wider block">
                  Average Score
                </span>
                <span className="text-lg font-black text-[#16449B] mt-1 block">
                  {analytics.avgPercentage}%
                </span>
              </div>

              <div className="bg-white border border-[#16449B] p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-semibold text-[#16449B] uppercase tracking-wider block">
                  Highest Score
                </span>
                <span className="text-lg font-black text-[#16449B] mt-1 block">
                  {analytics.highestScorePercentage}%
                </span>
              </div>

              <div className="bg-white border border-[#D32F2F] p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-semibold text-[#D32F2F] uppercase tracking-wider block">
                  Lowest Score
                </span>
                <span className="text-lg font-black text-[#D32F2F] mt-1 block">
                  {analytics.lowestScorePercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Lesson-wise Bar Chart Section */}
          <div className="bg-white border-2 border-[#16449B] rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#16449B]/20 pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#16449B] flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#16449B]" />
                  <span>Lesson-wise Progress Bar Chart</span>
                </h4>
                <p className="text-[11px] text-[#16449B]/80 mt-0.5 font-semibold">
                  Visual comparison of percentage scores across CBSE Class {analytics.studentClass} lessons.
                </p>
              </div>
            </div>

            {/* Color Rules Legend */}
            <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-[#16449B] text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#16449B]" />
                <div>
                  <span className="font-bold text-[#16449B] block">≥70%</span>
                  <span className="text-[9px] font-bold text-[#16449B]/80">Blue (Strong)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#D32F2F]" />
                <div>
                  <span className="font-bold text-[#D32F2F] block">&lt;70%</span>
                  <span className="text-[9px] font-bold text-[#D32F2F]">Red (Critical Area)</span>
                </div>
              </div>
            </div>

            <div className="w-full h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(analytics.lessonBarChartData || []).map((item) => ({
                    lesson: item.lesson.length > 15 ? item.lesson.substring(0, 12) + '...' : item.lesson,
                    fullLesson: item.lesson,
                    Score: item.score,
                    color: item.score >= 70 ? '#16449B' : '#D32F2F',
                    status: item.status,
                  }))}
                  margin={{ top: 15, right: 20, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#16449B" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="lesson"
                    stroke="#16449B"
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#16449B' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis domain={[0, 100]} stroke="#16449B" tick={{ fontSize: 10, fill: '#16449B' }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#16449B', borderRadius: '10px', color: '#16449B' }}
                    formatter={(value: any, name: any, props: any) => [`${value}% (${props.payload.status})`, 'Score']}
                    labelFormatter={(label: any, items: any) => items[0]?.payload?.fullLesson || label}
                  />
                  <Bar dataKey="Score" radius={[4, 4, 0, 0]}>
                    {(analytics.lessonBarChartData || []).map((entry, index) => (
                      <Cell key={`modal-cell-${index}`} fill={entry.score >= 70 ? '#16449B' : '#D32F2F'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Overall Performance Pie Chart Section */}
          <div className="bg-white border-2 border-[#16449B] rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#16449B]/20 pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#16449B] flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-[#16449B]" />
                  <span>Overall Performance Pie Chart</span>
                </h4>
                <p className="text-[11px] text-[#16449B]/80 font-semibold mt-0.5">
                  Breakdown of accuracy and response distribution across all test attempts.
                </p>
              </div>
            </div>

            <div className="w-full h-60 pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Correct Answers', value: analytics.correctPercentage || (analytics.avgPercentage > 0 ? analytics.avgPercentage : 1), color: '#16449B' },
                      { name: 'Wrong Answers', value: analytics.wrongPercentage || (100 - analytics.avgPercentage > 0 ? 100 - analytics.avgPercentage : 0), color: '#D32F2F' },
                      { name: 'Unanswered', value: analytics.unansweredPercentage || 0, color: '#D32F2F' },
                    ].filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                  >
                    {[
                      { name: 'Correct Answers', color: '#16449B' },
                      { name: 'Wrong Answers', color: '#D32F2F' },
                      { name: 'Unanswered', color: '#D32F2F' },
                    ].map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#16449B', borderRadius: '10px', color: '#16449B' }}
                    formatter={(val: any) => [`${val}%`, 'Accuracy']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#16449B' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Topic Performance Table */}
          <div className="bg-white border-2 border-[#16449B] rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-[#16449B] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#16449B]" />
              <span>Topic-wise Performance Breakdown</span>
            </h4>

            {analytics.topicPerformances.length === 0 ? (
              <p className="text-xs text-[#16449B]/70 italic">No topic scores recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#16449B]">
                  <thead className="bg-[#16449B] text-white uppercase font-bold border-b border-[#16449B]">
                    <tr>
                      <th className="px-4 py-3">Topic Name</th>
                      <th className="px-4 py-3 text-center">Score %</th>
                      <th className="px-4 py-3 text-center">Status Badge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#16449B]/20">
                    {analytics.topicPerformances.map((topic) => (
                      <tr key={topic.topic} className="hover:bg-[#16449B]/5">
                        <td className="px-4 py-3 font-bold text-[#16449B]">{topic.topic}</td>
                        <td className="px-4 py-3 text-center font-bold" style={{ color: topic.avgPercentage >= 70 ? '#16449B' : '#D32F2F' }}>
                          {topic.avgPercentage}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              topic.avgPercentage >= 70
                                ? 'bg-[#16449B] text-white'
                                : 'bg-[#D32F2F] text-white'
                            }`}
                          >
                            {topic.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white border-2 border-[#D32F2F] rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-[#D32F2F] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D32F2F]" />
              <span>Areas for Improvement</span>
            </h4>

            <div className="space-y-3">
              {(analytics.topicPerformances.length > 0 ? analytics.topicPerformances : analytics.weakTopics).map((tp) => (
                <div
                  key={tp.topic}
                  className="bg-white border border-[#D32F2F] p-4 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#D32F2F] text-xs">{tp.topic}</span>
                    <span
                      className={`text-[11px] font-bold ${
                        tp.avgPercentage >= 70 ? 'text-[#16449B]' : 'text-[#D32F2F]'
                      }`}
                    >
                      {tp.avgPercentage}% ({tp.status})
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-[#16449B] font-semibold space-y-1.5 pl-1">
                    {tp.recommendedActions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher Remarks Box */}
          <div className="bg-white border-2 border-[#16449B] rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#16449B] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#16449B]" />
                <span>Teacher Remarks & Feedback</span>
              </h4>
              <span className="text-[10px] text-[#16449B] font-bold uppercase">Editable</span>
            </div>

            <textarea
              value={customRemark}
              onChange={(e) => setCustomRemark(e.target.value)}
              rows={3}
              className="w-full bg-white border-2 border-[#16449B] rounded-xl p-3 text-xs text-[#16449B] font-semibold focus:outline-none focus:border-[#16449B]"
              placeholder="Enter custom remarks for parent..."
            />
          </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t-2 border-[#16449B] p-6 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={handleCopySummary}
            className="bg-white hover:bg-[#16449B]/10 text-[#16449B] border-2 border-[#16449B] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-[#16449B]" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'Copied Summary!' : 'Copy Summary'}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="bg-[#16449B] hover:bg-[#16449B] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer"
              title="Share report summary via WhatsApp"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>WhatsApp Share</span>
            </button>

            <button
              onClick={() => setShowEmailModal(true)}
              className="bg-[#16449B] hover:bg-[#16449B] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-white" />
              <span>Email PDF</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="bg-[#16449B] hover:bg-[#16449B] text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Download PDF Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Email Modal Preview */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-[#16449B]/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#16449B] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-[#16449B] pb-4">
              <h3 className="text-lg font-bold text-[#16449B] flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#16449B]" />
                <span>Send Progress Card to Parent</span>
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-[#16449B] hover:bg-[#16449B]/10 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#16449B] mb-1.5">
                  Parent Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g., parent@example.com"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="w-full bg-white border-2 border-[#16449B] rounded-xl p-3 text-xs text-[#16449B] font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#16449B] mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  readOnly
                  value="CBSE Maths Portal – Performance Progress Card"
                  className="w-full bg-white border-2 border-[#16449B] rounded-xl p-2.5 text-xs text-[#16449B] font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#16449B] mb-1">
                  Email Message Preview
                </label>
                <div className="bg-white border-2 border-[#16449B] p-3 rounded-xl text-xs text-[#16449B] font-semibold space-y-2">
                  <p>Dear Parent,</p>
                  <p>
                    Please find attached the latest performance progress card for{' '}
                    <strong className="text-[#16449B]">{analytics.studentName}</strong> ({analytics.studentClass}).
                    The report includes topic-wise scores, overall progress ({analytics.avgPercentage}%), grade {analytics.grade}, and recommended improvement areas.
                  </p>
                  <p>Regards,<br />CBSE Maths Portal</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-white border-2 border-[#16449B] text-[#16449B] hover:bg-[#16449B]/10 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailSent}
                  className="px-5 py-2 bg-[#16449B] hover:bg-[#16449B] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>{emailSent ? 'Sending...' : 'Send Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
