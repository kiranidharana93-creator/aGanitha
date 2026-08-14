import React, { useState, useEffect } from 'react';
import { Test, Question, Attempt } from '../types';
import {
  getAllTests,
  createTest,
  updateTest,
  deleteTest,
  getQuestionsByTestId,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getAllAttempts,
  deleteAttempt,
  deleteMultipleAttempts,
  deleteAllAttempts,
  publishClass6To10DefaultTests,
  cleanupAndDeduplicateTests,
} from '../services/db';

const TestModal = React.lazy(() => import('./TestModal').then(m => ({ default: m.TestModal })));
const QuestionModal = React.lazy(() => import('./QuestionModal').then(m => ({ default: m.QuestionModal })));
const ResultDetailsModal = React.lazy(() => import('./ResultDetailsModal').then(m => ({ default: m.ResultDetailsModal })));
const AdminAnalyticsDashboard = React.lazy(() => import('./AdminAnalyticsDashboard').then(m => ({ default: m.AdminAnalyticsDashboard })));
const StudentManagement = React.lazy(() => import('./StudentManagement').then(m => ({ default: m.StudentManagement })));
import { printCBSEQuestionPaper, downloadAdminAnswerKeyPDF, downloadAdminAnswerKeyDOCX } from '../utils/paperPrinter';
import {
  FileText,
  Plus,
  HelpCircle,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Edit,
  Globe,
  Lock,
  RefreshCw,
  Award,
  Layers,
  Sparkles,
  BarChart2,
  Users,
  MessageSquare,
  Send,
} from 'lucide-react';
import { Student } from '../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tests' | 'questions' | 'students' | 'results' | 'analytics'>('tests');

  // Data states
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for results
  const [classFilter, setClassFilter] = useState('All');
  const [nameSearch, setNameSearch] = useState('');

  // Modals
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [viewingAttempt, setViewingAttempt] = useState<Attempt | null>(null);
  const [selectedAttemptIds, setSelectedAttemptIds] = useState<string[]>([]);

  const [deletingItem, setDeletingItem] = useState<{
    type: 'test' | 'question' | 'reset' | 'attempt' | 'multiple_attempts' | 'all_attempts';
    id?: string;
    title?: string;
    count?: number;
  } | null>(null);



  const loadData = async () => {
    setIsLoading(true);
    try {
      await cleanupAndDeduplicateTests();
      const tList = await getAllTests();
      setTests(tList);

      if (tList.length > 0 && !selectedTestId) {
        setSelectedTestId(tList[0].id);
      }

      const attemptsList = await getAllAttempts();
      setAllAttempts(attemptsList);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanDuplicates = async () => {
    setIsLoading(true);
    try {
      const removed = await cleanupAndDeduplicateTests();
      await loadData();
      if (removed > 0) {
        alert(`Successfully removed ${removed} duplicate test paper(s).`);
      } else {
        alert('No duplicate test papers found. All test topics are clean with Test 1 & Test 2!');
      }
    } catch (err) {
      console.error('Error cleaning duplicates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Fetch questions whenever selected test changes
  useEffect(() => {
    if (selectedTestId) {
      getQuestionsByTestId(selectedTestId).then((qList) => setQuestions(qList));
    } else {
      setQuestions([]);
    }
  }, [selectedTestId]);

  // Test Handlers
  const handleSaveTest = async (testData: { title: string; class: string; duration: number; published: boolean }) => {
    let createdTestId = '';
    if (editingTest) {
      await updateTest(editingTest.id, testData);
    } else {
      const newTest = await createTest(testData);
      createdTestId = newTest.id;
    }
    await loadData();
    if (createdTestId) {
      setSelectedTestId(createdTestId);
    }
    setEditingTest(null);
  };

  const handleTogglePublish = async (test: Test) => {
    await updateTest(test.id, { published: !test.published });
    await loadData();
  };

  const handleDeleteTest = (testId: string) => {
    const targetTest = tests.find((t) => t.id === testId);
    setDeletingItem({
      type: 'test',
      id: testId,
      title: targetTest?.title || 'Selected Test',
    });
  };

  const handlePublishClass6To10 = () => {
    setDeletingItem({
      type: 'reset',
      title: 'CBSE Standard Test Papers (Class 6-10)',
    });
  };

  // Question Handlers
  const handleSaveQuestion = async (qData: Omit<Question, 'id'>) => {
    try {
      const targetTestId = qData.testId;
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, qData);
      } else {
        await createQuestion(qData);
      }
      setSelectedTestId(targetTestId);

      const qList = await getQuestionsByTestId(targetTestId);
      setQuestions(qList);

      await loadData();
      setEditingQuestion(null);
    } catch (err) {
      console.error('Error saving question:', err);
      alert('Failed to save question. Please try again.');
    }
  };

  const handleDeleteQuestion = (qId: string) => {
    const targetQ = questions.find((q) => q.id === qId);
    setDeletingItem({
      type: 'question',
      id: qId,
      title: targetQ?.question || 'Selected Question',
    });
  };

  // Attempt Deletion Handlers
  const handleDeleteAttempt = (attempt: Attempt) => {
    setDeletingItem({
      type: 'attempt',
      id: attempt.id,
      title: `${attempt.studentName || 'Student'} - ${attempt.testTitle || 'Test'}`,
    });
  };

  const handleDeleteSelectedAttempts = () => {
    if (selectedAttemptIds.length === 0) return;
    setDeletingItem({
      type: 'multiple_attempts',
      count: selectedAttemptIds.length,
      title: `${selectedAttemptIds.length} selected student result(s)`,
    });
  };

  const handleDeleteAllAttempts = () => {
    if (allAttempts.length === 0) return;
    setDeletingItem({
      type: 'all_attempts',
      count: allAttempts.length,
      title: `All ${allAttempts.length} student result(s)`,
    });
  };

  const confirmDeleteAction = async () => {
    if (!deletingItem) return;
    const { type, id } = deletingItem;
    setDeletingItem(null);

    if (type === 'test' && id) {
      try {
        setTests((prev) => prev.filter((t) => t.id !== id));
        if (selectedTestId === id) {
          setSelectedTestId('');
        }
        await deleteTest(id);
        await loadData();
      } catch (err) {
        console.error('Error deleting test:', err);
        await loadData();
      }
    } else if (type === 'question' && id) {
      try {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        await deleteQuestion(id);
        if (selectedTestId) {
          const qList = await getQuestionsByTestId(selectedTestId);
          setQuestions(qList);
        }
        await loadData();
      } catch (err) {
        console.error('Error deleting question:', err);
        if (selectedTestId) {
          const qList = await getQuestionsByTestId(selectedTestId);
          setQuestions(qList);
        }
      }
    } else if (type === 'reset') {
      setIsLoading(true);
      await publishClass6To10DefaultTests(true);
      await loadData();
      setIsLoading(false);
    } else if (type === 'attempt' && id) {
      try {
        setAllAttempts((prev) => prev.filter((a) => a.id !== id));
        setSelectedAttemptIds((prev) => prev.filter((item) => item !== id));
        await deleteAttempt(id);
        await loadData();
      } catch (err) {
        console.error('Error deleting student result:', err);
        await loadData();
      }
    } else if (type === 'multiple_attempts') {
      try {
        const idsToDelete = [...selectedAttemptIds];
        setAllAttempts((prev) => prev.filter((a) => !idsToDelete.includes(a.id)));
        setSelectedAttemptIds([]);
        await deleteMultipleAttempts(idsToDelete);
        await loadData();
      } catch (err) {
        console.error('Error deleting selected student results:', err);
        await loadData();
      }
    } else if (type === 'all_attempts') {
      try {
        setAllAttempts([]);
        setSelectedAttemptIds([]);
        await deleteAllAttempts();
        await loadData();
      } catch (err) {
        console.error('Error deleting all student results:', err);
        await loadData();
      }
    }
  };

  // PDF Question Paper Download / Print Logic
  const downloadQuestionPaper = async (test: Test) => {
    try {
      if ((test as any).pdfUrl) {
        const response = await fetch((test as any).pdfUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${test.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        await printCBSEQuestionPaper(test);
      }
    } catch (error) {
      console.error('PDF download failed', error);
      await printCBSEQuestionPaper(test);
    }
  };

  const handleDownloadAnswerKeyPDF = async (test: Test) => {
    try {
      let qList = questions;
      if (selectedTestId !== test.id) {
        qList = await getQuestionsByTestId(test.id);
      }
      await downloadAdminAnswerKeyPDF(test, qList);
    } catch (err) {
      console.error('Error downloading Answer Key PDF:', err);
      alert('Failed to generate Answer Key PDF.');
    }
  };

  const handleDownloadAnswerKeyDOCX = async (test: Test) => {
    try {
      let qList = questions;
      if (selectedTestId !== test.id) {
        qList = await getQuestionsByTestId(test.id);
      }
      await downloadAdminAnswerKeyDOCX(test, qList);
    } catch (err) {
      console.error('Error downloading Answer Key DOCX:', err);
      alert('Failed to generate Answer Key DOCX.');
    }
  };

  // PDF Export Logic for a Result Record
  const handleDownloadPDF = (att: Attempt) => {
    const percentage = Math.round((att.score / (att.totalQuestions || 1)) * 100);
    const isPassed = percentage >= 40;
    const dateStr = att.submittedAt ? new Date(att.submittedAt).toLocaleString('en-IN') : 'N/A';

    let answersHtml = '';
    if (att.answers && Object.keys(att.answers).length > 0) {
      answersHtml = Object.entries(att.answers)
        .map(
          ([_, ans], idx) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #334155;">Q${idx + 1}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-weight: 600; color: #16449B;">${String(ans).replace('option', 'Option ')}</td>
            </tr>
          `
        )
        .join('');
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download or print the PDF report.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Test Result - ${att.studentName || 'Student'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
            .header { border-bottom: 3px solid #16449B; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 24px; font-weight: 800; color: #0f172a; }
            .badge { background-color: ${isPassed ? '#dcfce7' : '#fee2e2'}; color: ${isPassed ? '#166534' : '#991b1b'}; padding: 6px 16px; border-radius: 9999px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center; margin-top: 16px; }
            .stat { background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
            .stat-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .stat-value { font-size: 18px; font-weight: 800; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
            th { text-align: left; background: #f1f5f9; padding: 10px; border-bottom: 2px solid #cbd5e1; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 11px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Maths Test Result</div>
              <div style="font-size: 13px; color: #64748b; font-weight: 600;">Official Student Performance Report</div>
            </div>
            <span class="badge">${isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}</span>
          </div>

          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h2 style="margin: 0; font-size: 20px; color: #0f172a;">${att.studentName || 'Student'}</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 600;">Class: ${att.studentClass || 'N/A'}</p>
              </div>
              <div style="text-align: right; font-size: 12px; color: #64748b; font-weight: 600;">
                <div>Attempt #${att.attemptNumber}</div>
                <div>Submitted: ${dateStr}</div>
              </div>
            </div>

            <div class="grid">
              <div class="stat">
                <div class="stat-label">Test Topic</div>
                <div class="stat-value" style="font-size: 14px; color: #1e293b;">${att.testTitle || 'Test'}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Score</div>
                <div class="stat-value" style="color: #0f172a;">${att.score} / ${att.totalQuestions}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Percentage</div>
                <div class="stat-value" style="color: ${isPassed ? '#16a34a' : '#d97706'};">${percentage}%</div>
              </div>
            </div>
          </div>

          ${
            answersHtml
              ? `
              <h3 style="font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; color: #1e293b; font-weight: 700;">Recorded Answers Log</h3>
              <table>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Selected Answer</th>
                  </tr>
                </thead>
                <tbody>
                  ${answersHtml}
                </tbody>
              </table>
            `
              : ''
          }

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

  // CSV Export Logic
  const handleExportCSV = () => {
    if (filteredAttempts.length === 0) {
      alert('No results available to export based on current filters.');
      return;
    }

    const headers = ['Student Name', 'Class', 'Test Title', 'Attempt Number', 'Score', 'Total Questions', 'Percentage', 'Submitted At'];
    const rows = filteredAttempts.map((att) => {
      const percentage = Math.round((att.score / (att.totalQuestions || 1)) * 100);
      const dateStr = att.submittedAt ? new Date(att.submittedAt).toLocaleString('en-IN') : 'N/A';
      return [
        `"${(att.studentName || 'Unknown').replace(/"/g, '""')}"`,
        `"${(att.studentClass || '').replace(/"/g, '""')}"`,
        `"${(att.testTitle || '').replace(/"/g, '""')}"`,
        att.attemptNumber,
        att.score,
        att.totalQuestions || 0,
        `"${percentage}%"`,
        `"${dateStr}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cbse_maths_student_results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Attempts Logic
  const filteredAttempts = allAttempts.filter((att) => {
    const matchesClass =
      classFilter === 'All' ||
      (att.studentClass && att.studentClass.toLowerCase() === classFilter.toLowerCase());

    const matchesName =
      !nameSearch.trim() ||
      (att.studentName && att.studentName.toLowerCase().includes(nameSearch.toLowerCase())) ||
      (att.testTitle && att.testTitle.toLowerCase().includes(nameSearch.toLowerCase()));

    return matchesClass && matchesName;
  });

  const totalQuestionsCount = tests.reduce((sum, t) => sum + (t.questionCount || 0), 0);
  const publishedCount = tests.filter((t) => t.published).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-[#FFFFFF] text-[#16449B]">
      {/* Top Admin Header */}
      <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#16449B] rounded-[14px] p-6 shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-4 text-[#16449B]">
        <div>
          <span className="bg-[#16449B] text-white text-xs px-3.5 py-1 rounded-full font-extrabold shadow-sm">
            Admin Management Console
          </span>
          <h1 className="text-2xl font-extrabold text-[#16449B] mt-2">CBSE Maths Examination Control Center</h1>
          <p className="text-xs text-[#16449B]/80 mt-1 font-semibold">
            Manage upcoming tests, add/edit MCQ questions, publish exams, and export student performance reports.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start md:self-auto flex items-center gap-2 btn-primary text-xs shadow-md cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-white ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Two Column Layout: Sidebar (240px) + Main Content Area */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Admin Sidebar */}
        <aside className="w-full md:w-[240px] shrink-0 bg-[#16449B] text-white rounded-[14px] p-4 shadow-[0_2px_8px_rgba(11,61,145,0.08)] space-y-2">
          <div className="px-3 py-2 border-b border-white/20 mb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-blue-200">Admin Menu</h2>
          </div>

          <button
            onClick={() => setActiveTab('tests')}
            className={`w-full text-left px-4 py-3 rounded-[8px] text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'tests'
                ? 'bg-[#16449B] text-white border-l-4 border-l-[#DC2626] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Dashboard & Tests</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`w-full text-left px-4 py-3 rounded-[8px] text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'questions'
                ? 'bg-[#16449B] text-white border-l-4 border-l-[#DC2626] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-white" />
            <span>Questions & Keys</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`w-full text-left px-4 py-3 rounded-[8px] text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-[#16449B] text-white border-l-4 border-l-[#DC2626] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-white" />
            <span>Students & Logins</span>
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`w-full text-left px-4 py-3 rounded-[8px] text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'results'
                ? 'bg-[#16449B] text-white border-l-4 border-l-[#DC2626] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4 text-white" />
            <span>Results & Downloads</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full text-left px-4 py-3 rounded-[8px] text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#16449B] text-white border-l-4 border-l-[#DC2626] shadow-sm'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-white" />
            <span>School Analytics</span>
          </button>
        </aside>

        {/* Main Content View */}
        <div className="flex-1 space-y-6">
          {/* Metrics Overview Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#16449B] p-4 rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)] text-[#16449B]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#16449B] uppercase tracking-wider">Total Tests</span>
                <FileText className="w-5 h-5 text-[#16449B]" />
              </div>
              <p className="text-2xl font-extrabold text-[#16449B] mt-2">{tests.length}</p>
              <p className="text-[11px] text-[#16449B]/80 font-bold mt-0.5">{publishedCount} Published Live</p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#16449B] p-4 rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)] text-[#16449B]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#16449B] uppercase tracking-wider">Total Questions</span>
                <HelpCircle className="w-5 h-5 text-[#16449B]" />
              </div>
              <p className="text-2xl font-extrabold text-[#16449B] mt-2">{totalQuestionsCount}</p>
              <p className="text-[11px] text-[#16449B]/80 font-bold mt-0.5">MCQs in database</p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#16449B] p-4 rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)] text-[#16449B]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#16449B] uppercase tracking-wider">Student Submissions</span>
                <Award className="w-5 h-5 text-[#16449B]" />
              </div>
              <p className="text-2xl font-extrabold text-[#16449B] mt-2">{allAttempts.length}</p>
              <p className="text-[11px] text-[#16449B]/80 font-bold mt-0.5">Completed attempts</p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#16449B] p-4 rounded-[14px] shadow-[0_2px_8px_rgba(11,61,145,0.08)] text-[#16449B]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#16449B] uppercase tracking-wider">Classes Covered</span>
                <Layers className="w-5 h-5 text-[#16449B]" />
              </div>
              <p className="text-2xl font-extrabold text-[#16449B] mt-2">Class 6 - 10</p>
              <p className="text-[11px] text-[#16449B]/80 font-bold mt-0.5">Mathematics</p>
            </div>
          </div>

      {/* TAB: STUDENT MANAGEMENT */}
      {activeTab === 'students' && (
        <React.Suspense fallback={<div className="p-8 text-center text-[#16449B] font-bold animate-pulse">Loading Student Management...</div>}>
          <StudentManagement />
        </React.Suspense>
      )}

      {/* TAB 4: SCHOOL ANALYTICS */}
      {activeTab === 'analytics' && (() => {
        // Build list of unique students from attempts + default student roster
        const studentMap: Record<string, Student> = {
          'std_kiran_6': { id: 'std_kiran_6', studentId: 'c6-2026-0012', name: 'kiran', class: 'Class 6' },
        };

        allAttempts.forEach((att) => {
          if (att.studentId && !studentMap[att.studentId]) {
            studentMap[att.studentId] = {
              id: att.studentId,
              name: att.studentName || 'Student',
              class: att.studentClass || 'Class 6',
            };
          }
        });

        const studentList = Object.values(studentMap);

        return (
          <React.Suspense fallback={<div className="p-8 text-center text-[#16449B] font-bold animate-pulse">Loading Analytics Dashboard...</div>}>
            <AdminAnalyticsDashboard
              students={studentList}
              allAttempts={allAttempts}
              allTests={tests}
            />
          </React.Suspense>
        );
      })()}

      {/* TAB 1: MANAGE TESTS */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-[#16449B]">CBSE Maths Tests</h3>
              <p className="text-xs text-[#16449B]/80 font-medium">Publish or unpublish upcoming tests for students.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCleanDuplicates}
                className="bg-white text-[#D32F2F] hover:bg-[#D32F2F]/10 border-2 border-[#D32F2F] font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                title="Remove duplicate test papers and keep only Test 1 & 2 per topic"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#D32F2F]" />
                <span>Clean Duplicates</span>
              </button>

              <button
                onClick={handlePublishClass6To10}
                className="bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                title="Replace with Class 6, 7, 8, 9 & 10 CBSE Math Test Papers"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Publish Class 6–10 Papers</span>
              </button>

              <button
                onClick={() => {
                  setEditingTest(null);
                  setShowTestModal(true);
                }}
                className="bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Create Custom Test</span>
              </button>
            </div>
          </div>

          <div className="bg-white border-2 border-[#16449B] rounded-2xl overflow-hidden shadow-md text-[#16449B]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#16449B]">
                <thead className="bg-[#16449B] text-white uppercase font-extrabold border-b-2 border-[#16449B]">
                  <tr>
                    <th className="px-6 py-3.5">Test Title</th>
                    <th className="px-6 py-3.5">Class</th>
                    <th className="px-6 py-3.5">Duration</th>
                    <th className="px-6 py-3.5">Questions</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#16449B]/10">
                  {tests.map((t) => (
                    <tr key={t.id} className="hover:bg-[#16449B]/5 transition-colors">
                      <td className="px-6 py-4 font-extrabold text-[#16449B]">{t.title}</td>
                      <td className="px-6 py-4">
                        <span className="bg-white border border-[#16449B] text-[#16449B] px-2.5 py-1 rounded-lg font-bold">
                          {t.class}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#16449B]">{t.duration} Mins</td>
                      <td className="px-6 py-4 font-extrabold text-[#16449B]">{t.questionCount || 0} MCQs</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleTogglePublish(t)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border-2 transition-colors cursor-pointer ${
                            t.published
                              ? 'bg-white text-[#16449B] border-[#16449B] hover:bg-[#16449B]/10'
                              : 'bg-white text-[#D32F2F] border-[#D32F2F] hover:bg-[#D32F2F]/10'
                          }`}
                          title="Click to Publish / Unpublish"
                        >
                          {t.published ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          <span>{t.published ? 'Published' : 'Unpublished (Draft)'}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => downloadQuestionPaper(t)}
                            className="px-2.5 py-1.5 bg-white text-[#16449B] hover:bg-[#16449B]/10 border-2 border-[#16449B] rounded-lg text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Print / Download CBSE Question Paper PDF"
                          >
                            <Printer className="w-3 h-3 text-[#16449B]" />
                            <span>Paper PDF</span>
                          </button>

                          <button
                            onClick={() => handleDownloadAnswerKeyPDF(t)}
                            className="px-2.5 py-1.5 bg-[#16449B] text-white hover:bg-[#16449B]/90 border border-[#16449B] rounded-lg text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                            title="Download Admin Answer Key PDF with Explanations"
                          >
                            <Download className="w-3 h-3 text-white" />
                            <span>Key PDF</span>
                          </button>

                          <button
                            onClick={() => handleDownloadAnswerKeyDOCX(t)}
                            className="px-2.5 py-1.5 bg-white text-[#16449B] hover:bg-[#16449B]/10 border-2 border-[#16449B] rounded-lg text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Download Admin Answer Key DOCX Word Document"
                          >
                            <FileText className="w-3 h-3 text-[#16449B]" />
                            <span>DOCX Key</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedTestId(t.id);
                              setActiveTab('questions');
                            }}
                            className="px-2.5 py-1.5 text-[#16449B] hover:underline font-extrabold cursor-pointer"
                            title="Manage Questions"
                          >
                            Questions
                          </button>
                          <button
                            onClick={() => {
                              setEditingTest(t);
                              setShowTestModal(true);
                            }}
                            className="p-1.5 text-[#16449B] hover:bg-[#16449B]/10 rounded-lg cursor-pointer"
                            title="Edit Test"
                          >
                            <Edit className="w-4 h-4 text-[#16449B]" />
                          </button>
                          <button
                            onClick={() => handleDeleteTest(t.id)}
                            className="p-1.5 text-[#D32F2F] hover:bg-[#D32F2F]/10 rounded-lg cursor-pointer"
                            title="Delete Test"
                          >
                            <Trash2 className="w-4 h-4 text-[#D32F2F]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE QUESTIONS */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border-2 border-[#16449B] rounded-2xl text-[#16449B]">
            <div className="space-y-1 flex-1">
              <label className="text-xs font-extrabold text-[#16449B] uppercase tracking-wider">Select Test to Manage Questions</label>
              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="w-full sm:max-w-md bg-white border-2 border-[#16449B] rounded-xl px-4 py-2.5 text-sm text-[#16449B] font-bold focus:outline-none focus:ring-2 focus:ring-[#16449B] cursor-pointer"
              >
                {tests.map((t) => {
                  const displayTitle = t.title.replace(/\s*\(\s*Class\s*\d+\s*\)/gi, '').trim();
                  const hasClassInTitle = /class\s*\d+/i.test(displayTitle);
                  const showClassSuffix = !hasClassInTitle && t.class && t.class !== 'All';
                  return (
                    <option key={t.id} value={t.id}>
                      {displayTitle}{showClassSuffix ? ` (${t.class})` : ''} — {t.questionCount || 0} Questions
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowQuestionModal(true);
              }}
              disabled={!selectedTestId}
              className="bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Question</span>
            </button>
          </div>

          {/* Questions List */}
          {questions.length === 0 ? (
            <div className="bg-white border-2 border-[#16449B] rounded-2xl p-12 text-center space-y-3 text-[#16449B]">
              <HelpCircle className="w-12 h-12 text-[#16449B] mx-auto" />
              <h3 className="text-lg font-extrabold text-[#16449B]">No Questions Added to This Test</h3>
              <p className="text-xs text-[#16449B]/80 font-semibold max-w-md mx-auto">
                Click <strong>"Add Question"</strong> above to enter multiple-choice math questions for students.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white border-2 border-[#16449B] rounded-2xl p-5 shadow-md space-y-3 text-[#16449B]">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-extrabold text-[#16449B]">
                      <span className="text-[#16449B] mr-2">Q{idx + 1}.</span>
                      {q.question}
                    </p>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setShowQuestionModal(true);
                        }}
                        className="p-1.5 text-[#16449B] hover:bg-[#16449B]/10 rounded-lg cursor-pointer"
                        title="Edit Question"
                      >
                        <Edit className="w-4 h-4 text-[#16449B]" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-[#D32F2F] hover:bg-[#D32F2F]/10 rounded-lg cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4 text-[#D32F2F]" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {[
                      { key: 'optionA', label: 'A', val: q.optionA },
                      { key: 'optionB', label: 'B', val: q.optionB },
                      { key: 'optionC', label: 'C', val: q.optionC },
                      { key: 'optionD', label: 'D', val: q.optionD },
                    ].map((opt) => {
                      const isCorrect = q.correctAnswer === opt.key;
                      return (
                        <div
                          key={opt.key}
                          className={`p-2.5 rounded-xl border-2 flex items-center justify-between ${
                            isCorrect
                              ? 'bg-[#16449B]/10 border-[#16449B] text-[#16449B] font-extrabold'
                              : 'bg-white border-[#16449B]/30 text-[#16449B] font-semibold'
                          }`}
                        >
                          <span>
                            <strong className="mr-1">{opt.label}:</strong> {opt.val}
                          </span>
                          {isCorrect && <span className="text-[10px] text-[#16449B] font-extrabold">✔ Correct</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STUDENT RESULTS & REPORTS */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border-2 border-[#16449B] rounded-2xl text-[#16449B]">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#16449B] absolute left-3 top-3" />
                <input
                  type="text"
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  placeholder="Filter by Student Name or Test..."
                  className="w-full bg-white border-2 border-[#16449B] rounded-xl pl-9 pr-4 py-2 text-xs text-[#16449B] font-bold placeholder-[#16449B]/50 focus:outline-none focus:ring-2 focus:ring-[#16449B]"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-[#16449B]" />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-white border-2 border-[#16449B] rounded-xl px-3 py-2 text-xs text-[#16449B] font-bold focus:outline-none focus:ring-2 focus:ring-[#16449B] cursor-pointer"
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

            {/* Action Buttons: Delete Selected, Delete All, Export CSV */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {selectedAttemptIds.length > 0 && (
                <button
                  onClick={handleDeleteSelectedAttempts}
                  className="bg-[#D32F2F] hover:bg-[#D32F2F]/90 text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  title="Delete selected student results"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>Delete Selected ({selectedAttemptIds.length})</span>
                </button>
              )}

              {allAttempts.length > 0 && (
                <button
                  onClick={handleDeleteAllAttempts}
                  className="bg-white border-2 border-[#D32F2F] text-[#D32F2F] hover:bg-[#D32F2F]/10 font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Delete ALL student results permanently"
                >
                  <Trash2 className="w-4 h-4 text-[#D32F2F]" />
                  <span>Delete All Results</span>
                </button>
              )}

              <button
                onClick={handleExportCSV}
                className="bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Results Table */}
          {filteredAttempts.length === 0 ? (
            <div className="bg-white border-2 border-[#16449B] rounded-2xl p-12 text-center space-y-2 text-[#16449B]">
              <Award className="w-12 h-12 text-[#16449B] mx-auto" />
              <h3 className="text-lg font-extrabold text-[#16449B]">No Student Results Found</h3>
              <p className="text-xs text-[#16449B]/80 font-semibold">Try clearing search filters or wait for students to complete tests.</p>
            </div>
          ) : (
            <div className="bg-white border-2 border-[#16449B] rounded-2xl overflow-hidden shadow-md text-[#16449B]">
              <div className="p-4 bg-white border-b-2 border-[#16449B] flex items-center justify-between text-xs text-[#16449B] font-bold">
                <span>Showing {filteredAttempts.length} Student Test Submissions</span>
                {selectedAttemptIds.length > 0 && (
                  <span className="text-[#16449B] font-extrabold">{selectedAttemptIds.length} row(s) selected</span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#16449B]">
                  <thead className="bg-[#16449B] text-white uppercase font-extrabold border-b-2 border-[#16449B]">
                    <tr>
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredAttempts.length > 0 &&
                            filteredAttempts.every((a) => selectedAttemptIds.includes(a.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAttemptIds(filteredAttempts.map((a) => a.id));
                            } else {
                              setSelectedAttemptIds([]);
                            }
                          }}
                          className="w-4 h-4 accent-white rounded cursor-pointer"
                          title="Select All Results"
                        />
                      </th>
                      <th className="px-6 py-3.5">Student Name</th>
                      <th className="px-6 py-3.5">Class</th>
                      <th className="px-6 py-3.5">Test Title</th>
                      <th className="px-6 py-3.5">Attempt #</th>
                      <th className="px-6 py-3.5">Score</th>
                      <th className="px-6 py-3.5">Percentage</th>
                      <th className="px-6 py-3.5">Submitted At</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-[#16449B]/10">
                    {filteredAttempts.map((att) => {
                      const percentage = Math.round((att.score / (att.totalQuestions || 1)) * 100);
                      const isPassed = percentage >= 40;
                      const isSelected = selectedAttemptIds.includes(att.id);

                      return (
                        <tr
                          key={att.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-[#16449B]/15 font-bold' : 'hover:bg-[#16449B]/5'
                          }`}
                        >
                          <td className="px-4 py-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAttemptIds((prev) => [...prev, att.id]);
                                } else {
                                  setSelectedAttemptIds((prev) => prev.filter((id) => id !== att.id));
                                }
                              }}
                              className="w-4 h-4 accent-[#16449B] rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 font-extrabold text-[#16449B]">{att.studentName || 'Student'}</td>
                          <td className="px-6 py-4">
                            <span className="bg-white border border-[#16449B] text-[#16449B] px-2 py-0.5 rounded font-extrabold">
                              {att.studentClass || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-[#16449B]">{att.testTitle || 'Test'}</td>
                          <td className="px-6 py-4">
                            <span className="bg-white border border-[#16449B] text-[#16449B] px-2 py-0.5 rounded-full font-extrabold">
                              Attempt {att.attemptNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-extrabold text-[#16449B]">
                            {att.score} / {att.totalQuestions}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`font-extrabold px-2 py-0.5 rounded-full border ${
                                isPassed ? 'bg-white border-[#16449B] text-[#16449B]' : 'bg-white border-[#D32F2F] text-[#D32F2F]'
                              }`}
                            >
                              {percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[#16449B] font-medium">
                            {att.submittedAt ? new Date(att.submittedAt).toLocaleString('en-IN') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewingAttempt(att)}
                                className="px-2.5 py-1.5 bg-[#16449B] text-white hover:bg-[#16449B]/90 border border-[#16449B] rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                                title="View Submission Details"
                              >
                                <Eye className="w-3.5 h-3.5 text-white" />
                                <span>View</span>
                              </button>

                              <button
                                onClick={() => handleDownloadPDF(att)}
                                className="px-2.5 py-1.5 bg-white text-[#16449B] hover:bg-[#16449B]/10 border-2 border-[#16449B] rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Download PDF Report"
                              >
                                <Download className="w-3.5 h-3.5 text-[#16449B]" />
                                <span>PDF</span>
                              </button>

                              <button
                                onClick={() => handleDeleteAttempt(att)}
                                className="p-1.5 text-[#D32F2F] hover:bg-[#D32F2F]/10 rounded-lg cursor-pointer transition-colors"
                                title="Delete Result Record"
                              >
                                <Trash2 className="w-4 h-4 text-[#D32F2F]" />
                              </button>
                            </div>
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

      {/* Test Modal */}
      {showTestModal && (
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-[#16449B]">Loading...</div>}>
          <TestModal
            testToEdit={editingTest}
            onClose={() => setShowTestModal(false)}
            onSave={handleSaveTest}
          />
        </React.Suspense>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-[#16449B]">Loading...</div>}>
          <QuestionModal
            testList={tests}
            selectedTestId={selectedTestId}
            questionToEdit={editingQuestion}
            onClose={() => setShowQuestionModal(false)}
            onSave={handleSaveQuestion}
          />
        </React.Suspense>
      )}

      {/* Result Details Modal */}
      {viewingAttempt && (
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-[#16449B]">Loading...</div>}>
          <ResultDetailsModal attempt={viewingAttempt} onClose={() => setViewingAttempt(null)} />
        </React.Suspense>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#16449B] rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 text-[#16449B] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-[#D32F2F]">
              <div className="p-3 bg-white border-2 border-[#D32F2F] rounded-xl">
                <Trash2 className="w-6 h-6 text-[#D32F2F]" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#D32F2F]">
                  {deletingItem.type === 'reset' ? 'Confirm Reset' : 'Confirm Deletion'}
                </h3>
                <p className="text-xs text-[#16449B] font-bold">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-[#16449B] leading-relaxed font-bold">
              {deletingItem.type === 'reset'
                ? 'Are you sure you want to reset all test papers to standard CBSE Class 6-10 questions?'
                : deletingItem.type === 'attempt'
                ? 'Are you sure you want to delete this student result?'
                : deletingItem.type === 'multiple_attempts'
                ? `Are you sure you want to delete ${deletingItem.count} selected student result(s)?`
                : deletingItem.type === 'all_attempts'
                ? 'Are you sure you want to delete ALL student results permanently?'
                : `Are you sure you want to delete "${deletingItem.title || 'this item'}"?`}
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[#16449B]/20">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2.5 rounded-xl border-2 border-[#16449B] text-[#16449B] text-xs font-extrabold hover:bg-[#16449B]/10 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAction}
                className="px-4 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-[#D32F2F]/90 text-white text-xs font-extrabold shadow-md flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>{deletingItem.type === 'reset' ? 'Yes, Reset' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
