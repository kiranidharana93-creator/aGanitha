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
  CheckCircle,
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

    const message = `📊 *CBSE Maths Portal - Student Performance Progress Card* 📊\n\n*Student Name:* ${analytics.studentName}\n*Class:* ${analytics.studentClass}\n*Reporting Period:* ${reportingPeriod}\n\n🏆 *Overall Performance:* ${analytics.avgPercentage}% (Grade ${analytics.grade})\n📝 *Tests Attempted:* ${analytics.totalTestsAttempted}\n\n📚 *Topic-wise Performance:*\n${topicSummary}\n\n💡 *Teacher Remarks:*\n"${customRemark}"\n\n🎯 *Recommended Action Items:*\n${analytics.weakTopics.length > 0 ? analytics.weakTopics.map(w => `• ${w.topic}: ${w.recommendedActions[0] || 'Daily practice recommended'}`).join('\n') : '• Excellent progress! Keep up regular practice.'}\n\nCBSE Mathematics Portal - Automated Report`;

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

    const topicsRows = analytics.topicPerformances
      .map(
        (t) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${t.topic}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #2563eb;">${t.avgPercentage}%</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <span style="padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; background-color: ${
              t.avgPercentage >= 85
                ? '#dcfce7; color: #166534;'
                : t.avgPercentage >= 70
                ? '#dbeafe; color: #1e40af;'
                : t.avgPercentage >= 50
                ? '#fef3c7; color: #92400e;'
                : '#fee2e2; color: #991b1b;'
            }">${t.status}</span>
          </td>
        </tr>
      `
      )
      .join('');

    const improvementItems = (analytics.topicPerformances.length > 0 ? analytics.topicPerformances : analytics.weakTopics)
      .map(
        (w) => `
        <div style="margin-bottom: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
          <div style="font-weight: 700; color: #1e293b; font-size: 13px; display: flex; justify-content: space-between;">
            <span>${w.topic}</span>
            <span style="color: #2563eb;">${w.avgPercentage}% (${w.status})</span>
          </div>
          <ul style="padding-left: 18px; margin-top: 6px; margin-bottom: 0; font-size: 12px; color: #475569;">
            ${w.recommendedActions.map((act) => `<li style="margin-bottom: 4px;">${act}</li>`).join('')}
          </ul>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Parent Progress Card - ${analytics.studentName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 36px; color: #0f172a; background: #fff; line-height: 1.5; }
            .header { border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
            .school-title { font-size: 24px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px; }
            .subtitle { font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center; margin-top: 16px; }
            .stat { background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
            .stat-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .stat-val { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            th { text-align: left; background: #f1f5f9; padding: 10px; border-bottom: 2px solid #cbd5e1; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 11px; }
            .remarks-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 0 8px 8px 0; margin-top: 20px; font-size: 13px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="school-title">CBSE Mathematics Portal</div>
              <div class="subtitle">Official Student Performance Progress Card</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 28px; font-weight: 900; color: #2563eb;">Grade ${analytics.grade}</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 700;">${analytics.performanceGradeTitle}</div>
            </div>
          </div>

          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h2 style="margin: 0; font-size: 22px; color: #0f172a;">${analytics.studentName}</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 600;">Enrolled Class: ${analytics.studentClass}</p>
              </div>
              <div style="text-align: right; font-size: 12px; color: #64748b; font-weight: 600;">
                <div>Reporting Period: ${reportingPeriod}</div>
                <div>Tests Attempted: ${analytics.totalTestsAttempted}</div>
              </div>
            </div>

            <div class="grid">
              <div class="stat">
                <div class="stat-label">Overall Average</div>
                <div class="stat-val" style="color: #2563eb;">${analytics.avgPercentage}%</div>
              </div>
              <div class="stat">
                <div class="stat-label">Highest Score</div>
                <div class="stat-val" style="color: #16a34a;">${analytics.highestScorePercentage}%</div>
              </div>
              <div class="stat">
                <div class="stat-label">Lowest Score</div>
                <div class="stat-val" style="color: #dc2626;">${analytics.lowestScorePercentage}%</div>
              </div>
              <div class="stat">
                <div class="stat-label">Overall Grade</div>
                <div class="stat-val" style="color: #7c3aed;">${analytics.grade}</div>
              </div>
            </div>
          </div>

          <h3 style="font-size: 15px; margin-bottom: 8px; color: #0f172a;">Topic-wise Performance Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>CBSE Topic</th>
                <th style="text-align: center;">Average Score</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${topicsRows}
            </tbody>
          </table>

          <h3 style="font-size: 15px; margin-top: 24px; margin-bottom: 8px; color: #1e3a8a;">Areas for Improvement</h3>
          <div style="margin-top: 8px;">
            ${improvementItems}
          </div>

          <div class="remarks-box">
            <strong style="color: #1e3a8a; display: block; margin-bottom: 4px;">Teacher Remarks & Feedback:</strong>
            "${customRemark}"
          </div>

          <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
            <div>Generated by CBSE Maths Learning Portal</div>
            <div>Authorized Parent Copy</div>
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                Official Report
              </span>
              <h2 className="text-xl font-black text-white">Student Progress Card</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Progress Card Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Card Top Summary */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h3 className="text-2xl font-black text-white">{analytics.studentName}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Enrolled Class: <span className="text-blue-300 font-bold">{analytics.studentClass}</span> • Reporting Period: <span className="text-slate-200 font-bold">{reportingPeriod}</span>
                </p>
              </div>

              <div className="bg-slate-900 border border-blue-500/30 px-5 py-3 rounded-2xl text-center shadow-inner self-start sm:self-auto">
                <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider block">
                  Overall Grade
                </span>
                <span className="text-2xl font-black text-white">{analytics.grade}</span>
                <span className="text-[10px] font-bold text-slate-400 block">
                  {analytics.performanceGradeTitle}
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Tests Attempted
                </span>
                <span className="text-lg font-black text-white mt-1 block">
                  {analytics.totalTestsAttempted}
                </span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Average Score
                </span>
                <span className="text-lg font-black text-blue-400 mt-1 block">
                  {analytics.avgPercentage}%
                </span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Highest Score
                </span>
                <span className="text-lg font-black text-emerald-400 mt-1 block">
                  {analytics.highestScorePercentage}%
                </span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Lowest Score
                </span>
                <span className="text-lg font-black text-amber-400 mt-1 block">
                  {analytics.lowestScorePercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Lesson-wise Bar Chart Section */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-400" />
                  <span>Lesson-wise Progress Bar Chart</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Visual comparison of percentage scores across CBSE Class {analytics.studentClass} lessons.
                </p>
              </div>
            </div>

            {/* Color Rules Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#10b981]" />
                <div>
                  <span className="font-bold text-emerald-400 block">≥85%</span>
                  <span className="text-[9px] text-slate-400">Green (Strong)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#3b82f6]" />
                <div>
                  <span className="font-bold text-blue-400 block">70–84%</span>
                  <span className="text-[9px] text-slate-400">Blue (Good)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#f59e0b]" />
                <div>
                  <span className="font-bold text-amber-400 block">50–69%</span>
                  <span className="text-[9px] text-slate-400">Orange (Needs Practice)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
                <div>
                  <span className="font-bold text-red-400 block">&lt;50%</span>
                  <span className="text-[9px] text-slate-400">Red (Critical)</span>
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
                    color: item.color,
                    status: item.status,
                  }))}
                  margin={{ top: 15, right: 20, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="lesson"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff' }}
                    formatter={(value: any, name: any, props: any) => [`${value}% (${props.payload.status})`, 'Score']}
                    labelFormatter={(label: any, items: any) => items[0]?.payload?.fullLesson || label}
                  />
                  <Bar dataKey="Score" radius={[4, 4, 0, 0]}>
                    {(analytics.lessonBarChartData || []).map((entry, index) => (
                      <Cell key={`modal-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Overall Performance Pie Chart Section */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-purple-400" />
                  <span>Overall Performance Pie Chart</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Breakdown of accuracy and response distribution across all test attempts.
                </p>
              </div>
            </div>

            <div className="w-full h-60 pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Correct Answers', value: analytics.correctPercentage || (analytics.avgPercentage > 0 ? analytics.avgPercentage : 1), color: '#10b981' },
                      { name: 'Wrong Answers', value: analytics.wrongPercentage || (100 - analytics.avgPercentage > 0 ? 100 - analytics.avgPercentage : 0), color: '#ef4444' },
                      { name: 'Unanswered', value: analytics.unansweredPercentage || 0, color: '#f59e0b' },
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
                      { name: 'Correct Answers', color: '#10b981' },
                      { name: 'Wrong Answers', color: '#ef4444' },
                      { name: 'Unanswered', color: '#f59e0b' },
                    ].map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff' }}
                    formatter={(val: any) => [`${val}%`, 'Accuracy']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Topic Performance Table */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Topic-wise Performance Breakdown</span>
            </h4>

            {analytics.topicPerformances.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No topic scores recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Topic Name</th>
                      <th className="px-4 py-3 text-center">Score %</th>
                      <th className="px-4 py-3 text-center">Status Badge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {analytics.topicPerformances.map((topic) => (
                      <tr key={topic.topic} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-bold text-white">{topic.topic}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-400">
                          {topic.avgPercentage}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              topic.avgPercentage >= 85
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : topic.avgPercentage >= 70
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                : topic.avgPercentage >= 50
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
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
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Areas for Improvement</span>
            </h4>

            <div className="space-y-3">
              {(analytics.topicPerformances.length > 0 ? analytics.topicPerformances : analytics.weakTopics).map((tp) => (
                <div
                  key={tp.topic}
                  className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{tp.topic}</span>
                    <span
                      className={`text-[11px] font-bold ${
                        tp.avgPercentage >= 85
                          ? 'text-emerald-400'
                          : tp.avgPercentage >= 70
                          ? 'text-blue-400'
                          : tp.avgPercentage >= 50
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {tp.avgPercentage}% ({tp.status})
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 pl-1">
                    {tp.recommendedActions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher Remarks Box */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                <span>Teacher Remarks & Feedback</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Editable</span>
            </div>

            <textarea
              value={customRemark}
              onChange={(e) => setCustomRemark(e.target.value)}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter custom remarks for parent..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 border-t border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={handleCopySummary}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'Copied Summary!' : 'Copy Summary'}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
              title="Share report summary via WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp Share</span>
            </button>

            <button
              onClick={() => setShowEmailModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Email PDF</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Email Modal Preview */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <span>Send Progress Card to Parent</span>
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Parent Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g., parent@example.com"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  readOnly
                  value="CBSE Maths Portal – Performance Progress Card"
                  className="w-full bg-slate-800/60 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Message Preview
                </label>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-slate-400 space-y-2">
                  <p>Dear Parent,</p>
                  <p>
                    Please find attached the latest performance progress card for{' '}
                    <strong className="text-slate-200">{analytics.studentName}</strong> ({analytics.studentClass}).
                    The report includes topic-wise scores, overall progress ({analytics.avgPercentage}%), grade {analytics.grade}, and recommended improvement areas.
                  </p>
                  <p>Regards,<br />CBSE Maths Portal</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailSent}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
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
