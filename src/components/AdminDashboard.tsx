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
import { printCBSEQuestionPaper } from '../utils/paperPrinter';
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
        alert('No duplicate test papers found. All test topics are clean with Sample Test 1 & Sample Test 2!');
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
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-weight: 600; color: #2563eb;">${String(ans).replace('option', 'Option ')}</td>
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
            .header { border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
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
              <div class="title">CBSE Mathematics Test Result</div>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Admin Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-3 py-1 rounded-full font-semibold">
            Admin Management Console
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">CBSE Maths Examination Control Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage upcoming tests, add/edit MCQ questions, publish exams, and export student performance reports.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start md:self-auto flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metrics Overview Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Tests</span>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{tests.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{publishedCount} Published Live</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Questions</span>
            <HelpCircle className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{totalQuestionsCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">MCQs in database</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Student Submissions</span>
            <Award className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{allAttempts.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Completed attempts</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Classes Covered</span>
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">Class 6 - 10</p>
          <p className="text-[11px] text-slate-500 mt-0.5">CBSE Mathematics</p>
        </div>
      </div>



      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1">
        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'tests'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Create & Manage Tests ({tests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'questions'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Manage MCQ Questions</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'students'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Management & Credentials</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'results'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Student Results & Reports ({allAttempts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>School Analytics & Progress Cards</span>
        </button>
      </div>

      {/* TAB: STUDENT MANAGEMENT */}
      {activeTab === 'students' && (
        <React.Suspense fallback={<div className="p-8 text-center text-slate-400 font-medium animate-pulse">Loading Student Management...</div>}>
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
          <React.Suspense fallback={<div className="p-8 text-center text-slate-400 font-medium animate-pulse">Loading Analytics Dashboard...</div>}>
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">CBSE Maths Tests</h3>
              <p className="text-xs text-slate-400">Publish or unpublish upcoming tests for students.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCleanDuplicates}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-all"
                title="Remove duplicate sample test papers and keep only Sample Test 1 & 2 per topic"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clean Duplicates</span>
              </button>

              <button
                onClick={handlePublishClass6To10}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all"
                title="Replace with Class 6, 7, 8, 9 & 10 CBSE Math Test Papers"
              >
                <Sparkles className="w-4 h-4" />
                <span>Publish Class 6–10 Papers</span>
              </button>

              <button
                onClick={() => {
                  setEditingTest(null);
                  setShowTestModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Test</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Test Title</th>
                    <th className="px-6 py-3.5">Class</th>
                    <th className="px-6 py-3.5">Duration</th>
                    <th className="px-6 py-3.5">Questions</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tests.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{t.title}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-800 border border-slate-700 text-blue-300 px-2.5 py-1 rounded-lg font-semibold">
                          {t.class}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">{t.duration} Mins</td>
                      <td className="px-6 py-4 font-bold text-slate-200">{t.questionCount || 0} MCQs</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleTogglePublish(t)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                            t.published
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                          title="Click to Publish / Unpublish"
                        >
                          {t.published ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          <span>{t.published ? 'Published' : 'Unpublished (Draft)'}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => downloadQuestionPaper(t)}
                          className="px-2.5 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Print / Download CBSE Question Paper PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>📄 Download PDF</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTestId(t.id);
                            setActiveTab('questions');
                          }}
                          className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                          title="Manage Questions"
                        >
                          Questions
                        </button>
                        <button
                          onClick={() => {
                            setEditingTest(t);
                            setShowTestModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                          title="Edit Test"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTest(t.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg cursor-pointer"
                          title="Delete Test"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 border border-slate-800 rounded-2xl">
            <div className="space-y-1 flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Select Test to Manage Questions</label>
              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="w-full sm:max-w-md bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.class}) — {t.questionCount || 0} Questions
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowQuestionModal(true);
              }}
              disabled={!selectedTestId}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>

          {/* Questions List */}
          {questions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-slate-200">No Questions Added to This Test</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click <strong>"Add Question"</strong> above to enter multiple-choice math questions for students.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-bold text-white">
                      <span className="text-indigo-400 mr-2">Q{idx + 1}.</span>
                      {q.question}
                    </p>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setShowQuestionModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                        title="Edit Question"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
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
                          className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span>
                            <strong className="mr-1">{opt.label}:</strong> {opt.val}
                          </span>
                          {isCorrect && <span className="text-[10px] text-emerald-400 font-extrabold">✔ Correct</span>}
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 border border-slate-800 rounded-2xl">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  placeholder="Filter by Student Name or Test..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                  title="Delete selected student results"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Selected ({selectedAttemptIds.length})</span>
                </button>
              )}

              {allAttempts.length > 0 && (
                <button
                  onClick={handleDeleteAllAttempts}
                  className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                  title="Delete ALL student results permanently"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete All Results</span>
                </button>
              )}

              <button
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Results Table */}
          {filteredAttempts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-2">
              <Award className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-slate-200">No Student Results Found</h3>
              <p className="text-xs text-slate-400">Try clearing search filters or wait for students to complete tests.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Showing {filteredAttempts.length} Student Test Submissions</span>
                {selectedAttemptIds.length > 0 && (
                  <span className="text-indigo-400 font-semibold">{selectedAttemptIds.length} row(s) selected</span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
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
                          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
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
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAttempts.map((att) => {
                      const percentage = Math.round((att.score / (att.totalQuestions || 1)) * 100);
                      const isPassed = percentage >= 40;
                      const isSelected = selectedAttemptIds.includes(att.id);

                      return (
                        <tr
                          key={att.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-indigo-950/30' : 'hover:bg-slate-800/40'
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
                              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 font-bold text-white">{att.studentName || 'Student'}</td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-800 border border-slate-700 text-blue-300 px-2 py-0.5 rounded font-semibold">
                              {att.studentClass || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-200">{att.testTitle || 'Test'}</td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                              Attempt {att.attemptNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-100">
                            {att.score} / {att.totalQuestions}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`font-extrabold px-2 py-0.5 rounded-full ${
                                isPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {att.submittedAt ? new Date(att.submittedAt).toLocaleString('en-IN') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewingAttempt(att)}
                                className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                title="View Submission Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>

                              <button
                                onClick={() => handleDownloadPDF(att)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Download PDF Report"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>

                              <button
                                onClick={() => handleDeleteAttempt(att)}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                                title="Delete Result Record"
                              >
                                <Trash2 className="w-4 h-4" />
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
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center text-white">Loading...</div>}>
          <TestModal
            testToEdit={editingTest}
            onClose={() => setShowTestModal(false)}
            onSave={handleSaveTest}
          />
        </React.Suspense>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center text-white">Loading...</div>}>
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
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center text-white">Loading...</div>}>
          <ResultDetailsModal attempt={viewingAttempt} onClose={() => setViewingAttempt(null)} />
        </React.Suspense>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {deletingItem.type === 'reset' ? 'Confirm Reset' : 'Confirm Deletion'}
                </h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-medium">
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

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAction}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deletingItem.type === 'reset' ? 'Yes, Reset' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
