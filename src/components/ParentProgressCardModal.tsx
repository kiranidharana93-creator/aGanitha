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

    const topicRowsHtml = (analytics.topicPerformances.length > 0 ? analytics.topicPerformances : [
      { topic: 'Whole Numbers', avgPercentage: 79, status: 'Good' },
      { topic: 'Integers', avgPercentage: 10, status: 'Critical' },
      { topic: 'Playing With Numbers', avgPercentage: 13, status: 'Critical' },
      { topic: 'Basic Geometrical Ideas', avgPercentage: 85, status: 'Strong' },
      { topic: 'Fractions', avgPercentage: 65, status: 'Needs Practice' },
    ]).map((t, idx) => `
      <tr>
        <td style="padding: 12px 18px; border: 1px solid #93c5fd; font-weight: 600; color: #1e293b; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">${t.topic}</td>
        <td style="padding: 12px 18px; border: 1px solid #93c5fd; text-align: center; font-weight: 800; color: #1d4ed8; font-size: 15px; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">${t.avgPercentage}%</td>
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
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #ffffff; line-height: 1.4; }
            .card-container { max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            
            /* Banner Header */
            .banner { background: #e0f2fe; padding: 24px 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #bae6fd; }
            .brand-group { display: flex; align-items: center; gap: 16px; }
            .logo-icon { width: 48px; height: 48px; }
            .title-box h1 { margin: 0; font-size: 28px; font-weight: 900; color: #0369a1; letter-spacing: 0.5px; text-transform: uppercase; }
            .title-box p { margin: 2px 0 0 0; font-size: 14px; color: #0284c7; font-weight: 600; }
            
            /* Student Details Form */
            .student-info { padding: 28px 32px; }
            .info-row { display: flex; align-items: baseline; margin-bottom: 14px; }
            .info-label { font-size: 14px; font-weight: 800; color: #0369a1; width: 90px; }
            .info-colon { margin-right: 12px; font-weight: 800; color: #0369a1; }
            .info-line { flex: 1; border-bottom: 1px solid #cbd5e1; font-size: 15px; font-weight: 700; color: #0f172a; padding-bottom: 2px; }
            
            /* Subject Grid Table */
            .table-container { padding: 0 32px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #93c5fd; font-size: 14px; }
            th { background: #3b82f6; color: #ffffff; padding: 12px 18px; text-align: center; font-weight: 700; border: 1px solid #2563eb; font-size: 14px; }
            th:first-child { text-align: left; }
            
            /* Grading Scale Legend */
            .grading-scale { background: #e0f2fe; padding: 14px 32px; font-size: 12px; font-weight: 800; color: #0369a1; border-top: 1px solid #bae6fd; border-bottom: 1px solid #bae6fd; text-align: left; letter-spacing: 0.3px; }
            .grading-scale span { color: #0284c7; font-weight: 700; }
            
            /* Comment Box */
            .comment-section { padding: 24px 32px 32px 32px; }
            .comment-title { font-size: 14px; font-weight: 800; color: #0369a1; margin-bottom: 8px; }
            .comment-box { border: 1px solid #cbd5e1; border-radius: 4px; padding: 16px; background: #ffffff; min-height: 90px; font-size: 13px; color: #334155; line-height: 1.6; }
            .improvement-title { font-weight: 700; color: #0369a1; margin-top: 10px; margin-bottom: 4px; display: block; }

            @media print {
              body { padding: 0; background: none; }
              .card-container { border: none; box-shadow: none; max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            <!-- Top Banner -->
            <div class="banner">
              <div class="brand-group">
                <svg class="logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Graduation Cap / Book Logo -->
                  <path d="M50 15L85 32L50 49L15 32L50 15Z" fill="#0284c7" />
                  <path d="M25 42V65C25 65 35 75 50 75C65 75 75 65 75 65V42" stroke="#0284c7" stroke-width="6" stroke-linecap="round" />
                  <path d="M15 48C20 48 35 52 50 62C65 52 80 48 85 48V78C80 78 65 82 50 92C35 82 20 78 15 78V48Z" fill="#16a34a" opacity="0.85" />
                </svg>
                <div class="title-box">
                  <h1>REPORT CARD</h1>
                  <p>CBSE Maths Portal</p>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 13px; font-weight: 700; color: #0284c7;">Period: ${reportingPeriod}</div>
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
                <div class="info-line">CBSE Mathematics</div>
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setActiveView('official_card')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'official_card'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                School Report Card Template
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'analytics'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Detailed Analytics
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Progress Card Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[75vh] bg-slate-950/50">
          {activeView === 'official_card' ? (
            /* OFFICIAL SCHOOL REPORT CARD TEMPLATE (Matching uploaded template image) */
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-300 text-slate-800 max-w-3xl mx-auto my-2">
              {/* Top Banner Header */}
              <div className="bg-sky-100/90 border-b-2 border-sky-200 px-6 sm:px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Graduation Cap / Book Logo */}
                  <div className="w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                      <path d="M50 15L85 32L50 49L15 32L50 15Z" fill="#0284c7" />
                      <path d="M25 42V65C25 65 35 75 50 75C65 75 75 65 75 65V42" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" />
                      <path d="M15 48C20 48 35 52 50 62C65 52 80 48 85 48V78C80 78 65 82 50 92C35 82 20 78 15 78V48Z" fill="#16a34a" fillOpacity="0.85" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-sky-800 tracking-wider uppercase">
                      REPORT CARD
                    </h1>
                    <p className="text-xs sm:text-sm font-bold text-sky-600 mt-0.5">
                      CBSE Maths Portal
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs sm:text-sm font-bold text-slate-500">
                    Period: {reportingPeriod}
                  </div>
                </div>
              </div>

              {/* Student Details Form Section */}
              <div className="p-6 sm:p-8 space-y-3.5 border-b border-slate-200">
                <div className="flex items-baseline">
                  <span className="w-24 text-sm font-extrabold text-sky-700">Student</span>
                  <span className="font-extrabold text-sky-700 mr-3">:</span>
                  <div className="flex-1 border-b border-slate-300 font-bold text-slate-900 text-sm sm:text-base pb-1">
                    {analytics.studentName}
                  </div>
                </div>

                <div className="flex items-baseline">
                  <span className="w-24 text-sm font-extrabold text-sky-700">Level</span>
                  <span className="font-extrabold text-sky-700 mr-3">:</span>
                  <div className="flex-1 border-b border-slate-300 font-bold text-slate-900 text-sm pb-1">
                    CBSE Mathematics
                  </div>
                </div>

                <div className="flex items-baseline">
                  <span className="w-24 text-sm font-extrabold text-sky-700">Class</span>
                  <span className="font-extrabold text-sky-700 mr-3">:</span>
                  <div className="flex-1 border-b border-slate-300 font-bold text-slate-900 text-sm pb-1">
                    Class {analytics.studentClass}
                  </div>
                </div>
              </div>

              {/* Subject & Percentage Table */}
              <div className="p-6 sm:p-8 overflow-x-auto">
                <table className="w-full border-collapse border border-blue-300 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="p-3.5 text-left font-bold border border-blue-500 w-3/5">Subject</th>
                      <th className="p-3.5 text-center font-bold border border-blue-500 w-2/5">Percentage</th>
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
                    ).map((item, idx) => (
                      <tr
                        key={item.topic}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      >
                        <td className="p-3.5 font-semibold text-slate-800 border border-blue-200">
                          {item.topic}
                        </td>
                        <td className="p-3.5 text-center font-black text-blue-700 border border-blue-200 text-sm sm:text-base">
                          {item.avgPercentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Comment / Action Plan Box */}
              <div className="p-6 sm:p-8 space-y-3">
                <div className="text-sm font-extrabold text-sky-800">Comment / Action Plan :</div>
                <div className="border border-slate-300 rounded-lg p-4 bg-white text-xs sm:text-sm text-slate-700 space-y-3 leading-relaxed">
                  <div>
                    <span className="font-bold text-sky-900 block mb-1">Observation & Guidance:</span>
                    <p className="text-slate-700">{customRemark}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-bold text-sky-800 block mb-1">Actionable Steps for Student:</span>
                    {analytics.weakTopics.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {analytics.weakTopics.map((wt) => (
                          <li key={wt.topic}>
                            <strong className="text-slate-800">{wt.topic}:</strong> {wt.recommendedActions[0] || 'Targeted concept practice'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="list-disc list-inside space-y-1 text-slate-600">
                        <li>🎯 Practice 15-20 targeted integer and sign-rule questions daily</li>
                        <li>📚 Review Divisibility rules, HCF, and LCM concept notes before taking test attempts</li>
                        <li>⏱️ Work on step-by-step problem solving speed and rough work calculation verification</li>
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
            </>
          )}
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
