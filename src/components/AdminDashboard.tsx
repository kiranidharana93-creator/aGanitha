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
  publishClass6To10DefaultTests,
} from '../services/db';
import { TestModal } from './TestModal';
import { QuestionModal } from './QuestionModal';
import { ResultDetailsModal } from './ResultDetailsModal';
import {
  FileText,
  Plus,
  HelpCircle,
  Download,
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
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tests' | 'questions' | 'results'>('tests');

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

  const loadData = async () => {
    setIsLoading(true);
    try {
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

  useEffect(() => {
    loadData();
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
    if (editingTest) {
      await updateTest(editingTest.id, testData);
    } else {
      await createTest(testData);
    }
    await loadData();
    setEditingTest(null);
  };

  const handleTogglePublish = async (test: Test) => {
    await updateTest(test.id, { published: !test.published });
    await loadData();
  };

  const handleDeleteTest = async (testId: string) => {
    if (confirm('Are you sure you want to delete this test and all its questions?')) {
      await deleteTest(testId);
      if (selectedTestId === testId) {
        setSelectedTestId('');
      }
      await loadData();
    }
  };

  const handlePublishClass6To10 = async () => {
    if (confirm('This will replace current test papers with standard CBSE Class 6, 7, 8, 9, and 10 test papers. Do you want to proceed?')) {
      setIsLoading(true);
      await publishClass6To10DefaultTests(true);
      await loadData();
      setIsLoading(false);
    }
  };

  // Question Handlers
  const handleSaveQuestion = async (qData: Omit<Question, 'id'>) => {
    if (editingQuestion) {
      await updateQuestion(editingQuestion.id, qData);
    } else {
      await createQuestion(qData);
    }
    if (selectedTestId) {
      const qList = await getQuestionsByTestId(selectedTestId);
      setQuestions(qList);
    }
    await loadData();
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      await deleteQuestion(qId);
      if (selectedTestId) {
        const qList = await getQuestionsByTestId(selectedTestId);
        setQuestions(qList);
      }
      await loadData();
    }
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
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'results'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Student Results & Reports ({allAttempts.length})</span>
        </button>
      </div>

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

      {/* TAB 3: STUDENT RESULTS & EXPORT TO CSV */}
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

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export Results to CSV</span>
            </button>
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
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">Student Name</th>
                      <th className="px-6 py-3.5">Class</th>
                      <th className="px-6 py-3.5">Test Title</th>
                      <th className="px-6 py-3.5">Attempt #</th>
                      <th className="px-6 py-3.5">Score</th>
                      <th className="px-6 py-3.5">Percentage</th>
                      <th className="px-6 py-3.5">Submitted At</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAttempts.map((att) => {
                      const percentage = Math.round((att.score / (att.totalQuestions || 1)) * 100);
                      const isPassed = percentage >= 40;

                      return (
                        <tr key={att.id} className="hover:bg-slate-800/40 transition-colors">
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
                            <button
                              onClick={() => setViewingAttempt(att)}
                              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg cursor-pointer"
                              title="View Submission Details"
                            >
                              <Eye className="w-4 h-4" />
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

      {/* Test Modal */}
      {showTestModal && (
        <TestModal
          testToEdit={editingTest}
          onClose={() => setShowTestModal(false)}
          onSave={handleSaveTest}
        />
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <QuestionModal
          testList={tests}
          selectedTestId={selectedTestId}
          questionToEdit={editingQuestion}
          onClose={() => setShowQuestionModal(false)}
          onSave={handleSaveQuestion}
        />
      )}

      {/* Result Details Modal */}
      {viewingAttempt && (
        <ResultDetailsModal attempt={viewingAttempt} onClose={() => setViewingAttempt(null)} />
      )}
    </div>
  );
};
