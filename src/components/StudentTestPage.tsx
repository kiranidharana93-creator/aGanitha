import React, { useState, useEffect, useRef } from 'react';
import { Student, Test, Question, Attempt } from '../types';
import { getQuestionsByTestId, saveAttempt, normalizeAnswerKey, saveDraftAttempt, clearDraftAttempt, getAttemptsForStudent } from '../services/db';
import { extractTopicFromTitle, getRecommendationsForTopic, calculateStudentAnalytics, cleanStudentTestTitle } from '../utils/analytics';
import { calculateTestResults, isQuestionCorrect, evaluateShortAnswer } from '../utils/evaluation';
import { Clock, CheckCircle, CheckCircle2, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Send, ArrowLeft, RefreshCw, Award, Lightbulb, Share2, Copy, Check, MessageSquare, Phone, FileText, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export { evaluateShortAnswer };

interface StudentTestPageProps {
  student: Student;
  test: Test;
  attemptNumber: number;
  onFinishTest: () => void;
}

export const StudentTestPage: React.FC<StudentTestPageProps> = ({
  student,
  test,
  attemptNumber,
  onFinishTest,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedAttempt, setCompletedAttempt] = useState<Attempt | null>(null);
  const [copiedAlert, setCopiedAlert] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Per-Question Timer state (60 seconds per question)
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save Draft Exam Progress whenever student selects answers or moves question
  useEffect(() => {
    if (!completedAttempt && !isSubmitting && questions.length > 0 && !isLoading) {
      saveDraftAttempt({
        studentId: student.id,
        testId: test.id,
        testTitle: test.title,
        testClass: test.class,
        currentIndex: currentIndex,
        selectedAnswers: selectedAnswers,
        timeLeft: questionTimeLeft,
        status: 'in-progress',
        submitted: false,
        updatedAt: new Date().toISOString(),
      });
    } else if (completedAttempt) {
      clearDraftAttempt(student.id);
    }
  }, [currentIndex, selectedAnswers, questionTimeLeft, completedAttempt, isSubmitting, questions.length, isLoading, student.id, test.id, test.title, test.class]);

  // Always ensure cleanup on result view mount
  useEffect(() => {
    if (completedAttempt) {
      clearDraftAttempt(student.id);
      localStorage.setItem(
        'lastCompletedExam',
        JSON.stringify({
          testId: test.id,
          studentId: student.id,
          completedAt: Date.now(),
        })
      );
    }
  }, [completedAttempt, student.id, test.id]);

  // Update document.title cleanly
  useEffect(() => {
    document.title = `${cleanStudentTestTitle(test.title)} - CBSE Maths`;
  }, [test.title]);

  // Load questions
  useEffect(() => {
    let isMounted = true;

    async function initTest() {
      setIsLoading(true);
      try {
        const qList = await getQuestionsByTestId(test.id);
        const sortedList = [...qList].sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));
        if (isMounted) {
          setQuestions(sortedList);
          const firstDuration = sortedList[0]?.timeLimitSeconds || 60;
          setQuestionTimeLeft(firstDuration);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing test page:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    initTest();

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [test.id]);

  // Reset Timer whenever question index changes
  useEffect(() => {
    if (questions.length > 0 && questions[currentIndex]) {
      const qDuration = questions[currentIndex]?.timeLimitSeconds || 60;
      setQuestionTimeLeft(qDuration);
    }
  }, [currentIndex, questions]);

  const formatQuestionTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${seconds}s`;
  };

  // Per-Question Timer Countdown Effect
  useEffect(() => {
    if (isLoading || completedAttempt || questions.length === 0) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleQuestionTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isLoading, completedAttempt, questions.length]);

  const handleQuestionTimeout = () => {
    // If timer reaches 0: lock question answer and advance or submit
    setCurrentIndex((prevIdx) => {
      if (prevIdx < questions.length - 1) {
        return prevIdx + 1;
      } else {
        // Last question timed out -> auto submit
        processSubmission();
        return prevIdx;
      }
    });
  };

  const handleOptionSelect = (questionId: string, optionKey: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  const calculateScore = () => {
    const summary = calculateTestResults(questions, selectedAnswers);
    return summary.score;
  };

  const processSubmission = async () => {
    if (isSubmitting || completedAttempt) return;
    setIsSubmitting(true);

    try {
      // Clear draft immediately before network request
      clearDraftAttempt(student.id);

      const summary = calculateTestResults(questions, selectedAnswers);
      const finalScore = summary.score;
      const attemptData: Omit<Attempt, 'id'> = {
        studentId: student.id,
        testId: test.id,
        attemptNumber: attemptNumber,
        score: finalScore,
        totalQuestions: questions.length,
        submittedAt: new Date().toISOString(),
        studentName: student.name,
        studentClass: student.class,
        testTitle: test.title,
        answers: selectedAnswers,
      };

      const saved = await saveAttempt(attemptData);
      
      // Clear draft again to prevent any timer race condition
      clearDraftAttempt(student.id);
      localStorage.setItem('lastCompletedExam', JSON.stringify({
        testId: test.id,
        studentId: student.id,
        completedAt: Date.now(),
      }));

      // Fetch student's attempts to calculate full performance analytics
      let studentAttempts: Attempt[] = [];
      try {
        studentAttempts = await getAttemptsForStudent(student.id);
      } catch (e) {
        studentAttempts = [];
      }
      if (!studentAttempts.some((a) => a.id === saved.id)) {
        studentAttempts = [saved, ...studentAttempts];
      }

      const analytics = calculateStudentAnalytics(student.name, student.class, studentAttempts);
      const percentage = summary.percentage;
      const statusText =
        percentage >= 85
          ? 'Excellent'
          : percentage >= 70
          ? 'Good'
          : percentage >= 50
          ? 'Needs Improvement'
          : 'Critical Improvement Required';

      const topicName = extractTopicFromTitle(test.title);
      const reportingPeriod = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Format Topic-wise performance with dots line up
      const topicSummary = analytics.topicPerformances.length > 0
        ? analytics.topicPerformances.map((t) => {
            const name = t.topic;
            const pctStr = `${t.avgPercentage}%`;
            const dotsCount = Math.max(2, 28 - name.length - pctStr.length);
            return `${name} ${'.'.repeat(dotsCount)} ${pctStr}`;
          }).join('\n')
        : `${topicName} ${'.'.repeat(Math.max(2, 28 - topicName.length - `${percentage}%`.length))} ${percentage}%`;

      // Generate 3 concise, single-line points for Areas Requiring Improvement
      const actionItemsList: string[] = [];
      if (analytics.weakTopics.length > 0) {
        analytics.weakTopics.slice(0, 3).forEach((wt) => {
          const tLower = wt.topic.toLowerCase();
          if (tLower.includes('integer')) {
            actionItemsList.push('• Integer operations and sign rules');
          } else if (tLower.includes('playing with numbers') || tLower.includes('divisibility')) {
            actionItemsList.push('• Divisibility rules, HCF and LCM concepts');
          } else if (tLower.includes('whole number')) {
            actionItemsList.push('• Commutative and distributive property patterns');
          } else if (tLower.includes('fraction')) {
            actionItemsList.push('• Equivalent fractions and LCM simplification');
          } else if (tLower.includes('decimal')) {
            actionItemsList.push('• Decimal alignment and place value conversions');
          } else if (tLower.includes('algebra')) {
            actionItemsList.push('• Forming and balancing linear equations');
          } else if (tLower.includes('geometry')) {
            actionItemsList.push('• Geometric definitions and angle measurements');
          } else {
            actionItemsList.push(`• Key concepts and formula practice in ${wt.topic}`);
          }
        });
      }

      const defaultPoints = [
        '• Speed and accuracy in problem solving',
        '• Fundamental definitions and rules review',
        '• Daily practice of NCERT textbook exercises',
      ];

      for (const pt of defaultPoints) {
        if (actionItemsList.length < 3 && !actionItemsList.includes(pt)) {
          actionItemsList.push(pt);
        }
      }

      const actionItems = actionItemsList.slice(0, 3).join('\n');

      const weakTopicNames = analytics.weakTopics.map((w) => w.topic).join(' and ');
      const teacherRemarks = analytics.weakTopics.length > 0
        ? `The student is showing regular participation in assessments. Additional practice is recommended in ${weakTopicNames} to improve conceptual understanding and calculation accuracy.`
        : `The student is showing regular participation in assessments with good overall mastery. Continued revision is recommended to maintain high speed and accuracy.`;

      // Trigger automatic Parent WhatsApp notification in the background via backend API
      try {
        console.log('Sending WhatsApp progress card to:', student.parentMobile || 'N/A');
        console.log('Student Name:', student.name);

        const response = await fetch('/api/send-parent-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student: {
              studentId: student.studentId || student.id,
              name: student.name,
              class: student.class,
              parentMobile: student.parentMobile || '',
            },
            reportingPeriod,
            overallPercentage: analytics.avgPercentage,
            grade: analytics.grade,
            testsAttempted: analytics.totalTestsAttempted,
            topicSummary,
            teacherRemarks,
            actionItems,
            // Direct fields as fallback
            parentPhone: student.parentMobile || '',
            parentMobile: student.parentMobile || '',
            studentName: student.name,
            studentClass: student.class,
            topic: topicName,
            score: finalScore,
            totalMarks: questions.length,
            percentage,
            status: statusText,
          }),
        });

        const data = await response.json();
        console.log('WhatsApp Backend Response:', data);
      } catch (e) {
        console.warn('Background WhatsApp notification dispatch notice:', e);
      }

      setCompletedAttempt(saved);
    } catch (err) {
      console.error('Failed to submit test:', err);
      alert('Failed to submit test. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-white text-[#16449B]">
        <RefreshCw className="w-10 h-10 text-[#16449B] animate-spin mb-4" />
        <h2 className="text-lg font-extrabold text-[#16449B]">Loading Test Questions...</h2>
        <p className="text-xs text-[#16449B]/80 mt-1 font-medium">Preparing examination environment for {test.title}</p>
      </div>
    );
  }

  // Completed Test Result View - Clean Student Confirmation
  if (completedAttempt) {
    const summary = calculateTestResults(questions, completedAttempt.answers || selectedAnswers);
    const percentage = summary.percentage;
    const isPassed = percentage >= 40;
    const topicName = extractTopicFromTitle(test.title);

    return (
      <div className="max-w-xl mx-auto px-4 py-12 bg-white">
        <div className="bg-white border-2 border-[#16449B] rounded-3xl p-8 shadow-md text-center space-y-6 text-[#16449B]">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#16449B] text-[#16449B] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="w-8 h-8 text-[#16449B]" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-[#16449B]">Exam Submitted Successfully</h2>
            <p className="text-xs text-[#16449B]/80 mt-1 font-semibold">CBSE Maths Portal</p>
          </div>

          <div className="bg-white border-2 border-[#16449B] rounded-2xl p-5 text-left space-y-3 font-semibold text-xs text-[#16449B]">
            <div className="flex justify-between items-center py-2 border-b border-[#16449B]/20">
              <span className="text-[#16449B]">Topic</span>
              <span className="text-[#16449B] font-bold">{topicName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#16449B]/20">
              <span className="text-[#16449B]">Total Questions</span>
              <span className="text-[#16449B] font-extrabold">{summary.totalQuestions}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#16449B]/20">
              <span className="text-[#16449B]">Correct Answers</span>
              <span className="text-[#16449B] font-extrabold">{summary.correctCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#16449B]/20">
              <span className="text-[#16449B]">Wrong Answers</span>
              <span className="text-[#D32F2F] font-extrabold">{summary.wrongCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#16449B]/20">
              <span className="text-[#16449B]">Unanswered</span>
              <span className="text-[#16449B] font-extrabold">{summary.unansweredCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#16449B]/20">
              <span className="text-[#16449B]">Marks Obtained</span>
              <span className="text-[#16449B] font-extrabold">{summary.score} / {summary.totalMarks}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#16449B]/20">
              <span className="text-[#16449B]">Percentage</span>
              <span className="text-[#16449B] font-extrabold">{percentage}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#16449B]">Status</span>
              <span className={`font-extrabold uppercase ${isPassed ? 'text-[#16449B]' : 'text-[#D32F2F]'}`}>
                {isPassed ? 'PASSED' : 'NEEDS PRACTICE'}
              </span>
            </div>
          </div>

          <div className="bg-white border-2 border-[#16449B] text-[#16449B] text-xs font-bold py-3.5 px-4 rounded-xl text-center space-y-1">
            <p className="font-extrabold text-sm text-[#16449B]">Result submitted successfully.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                clearDraftAttempt(student.id);
                onFinishTest();
              }}
              className="w-full bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all text-xs cursor-pointer"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => {
                clearDraftAttempt(student.id);
                onFinishTest();
              }}
              className="w-full bg-white text-[#16449B] hover:bg-[#16449B]/10 border-2 border-[#16449B] font-extrabold py-3.5 px-4 rounded-xl transition-all text-xs cursor-pointer"
            >
              View My Progress
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const selectedOpt = currentQ ? selectedAnswers[currentQ.id] : undefined;
  const isSelectedCorrect =
    selectedOpt && currentQ ? isQuestionCorrect(selectedOpt, currentQ) : false;

  // Visual styling for the per-question timer
  let timerStyle = 'bg-white border-2 border-[#16449B] text-[#16449B]';
  if (questionTimeLeft <= 10) {
    timerStyle = 'bg-white border-2 border-[#D32F2F] text-[#D32F2F] animate-pulse';
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 bg-white text-[#16449B]">
      {/* Test Sticky Header */}
      <div className="bg-white border-2 border-[#16449B] rounded-2xl p-4 shadow-md sticky top-20 z-30 flex flex-col sm:flex-row items-center justify-between gap-4 text-[#16449B]">
        <div>
          <span className="bg-[#16449B] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
            CBSE Examination Mode • Attempt #{attemptNumber}
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-[#16449B] mt-1">{cleanStudentTestTitle(test.title)}</h2>
        </div>

        {/* Global Action & Finish Button */}
        <div className="flex items-center space-x-4 shrink-0">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-white" />
            <span>Submit Test</span>
          </button>
        </div>
      </div>

      {/* Test Instructions Card */}
      <div className="bg-white border-2 border-[#16449B] rounded-2xl p-5 shadow-md space-y-3 text-[#16449B]">
        <div className="flex items-center justify-between border-b-2 border-[#16449B]/20 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#16449B] text-white flex items-center justify-center font-bold">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#16449B] tracking-wide uppercase">Test Instructions</h3>
              <p className="text-[11px] text-[#16449B]/80 font-bold">Please read carefully before entering answers in the blank</p>
            </div>
          </div>
          <button
            onClick={() => setShowInstructions((prev) => !prev)}
            className="text-xs font-bold text-[#16449B] hover:bg-[#16449B]/10 px-3 py-1.5 rounded-lg border border-[#16449B] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>{showInstructions ? 'Hide Instructions' : 'Show Instructions'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showInstructions && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs text-[#16449B]">
            <div className="bg-white border-2 border-[#16449B] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-[#16449B] font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#16449B] shrink-0" />
                <span>Writing Multiple Answers (Factors, Multiples & Lists)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#16449B] text-[11px] pl-1 leading-relaxed font-medium">
                <li>Separate numbers with commas or spaces (e.g. <strong className="text-[#16449B] font-bold">1, 2, 3, 4, 6, 8, 12, 24</strong> or <strong className="text-[#16449B] font-bold">5 10 15 20 25</strong>).</li>
                <li>Number order does not matter (e.g. <strong className="text-[#16449B] font-bold">24, 12, 8, 6, 4, 3, 2, 1</strong> is accepted).</li>
                <li>For prime number pairs or list answers, write clearly like <strong className="text-[#16449B] font-bold">(13, 31), (17, 71)</strong> or <strong className="text-[#16449B] font-bold">17, 19</strong>.</li>
              </ul>
            </div>

            <div className="bg-white border-2 border-[#16449B] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-[#16449B] font-bold text-xs">
                <Clock className="w-4 h-4 text-[#16449B] shrink-0" />
                <span>Timer & Test Navigation</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#16449B] text-[11px] pl-1 leading-relaxed font-medium">
                <li>For True / False questions, write <strong className="text-[#16449B] font-bold">True</strong> or <strong className="text-[#16449B] font-bold">False</strong>.</li>
                <li>You have <strong className="text-[#16449B] font-bold">60 seconds per question</strong>. The test auto-advances when time expires.</li>
                <li>Click any question number on the left <strong className="text-[#16449B] font-bold">Question Palette</strong> to review or update your answer anytime.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Main Examination Layout */}
      {questions.length === 0 ? (
        <div className="bg-white border-2 border-[#16449B] rounded-2xl p-12 text-center text-[#16449B]">
          <AlertTriangle className="w-12 h-12 text-[#D32F2F] mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-[#16449B]">No Questions Found</h3>
          <p className="text-xs text-[#16449B]/80 mt-1 font-medium">This test does not have any questions assigned yet.</p>
          <button
            onClick={onFinishTest}
            className="mt-4 bg-[#16449B] hover:bg-[#16449B]/90 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Palette Sidebar */}
          <div className="lg:col-span-1 bg-white border-2 border-[#16449B] rounded-2xl p-4 shadow-md space-y-4 text-[#16449B]">
            <div className="flex items-center justify-between border-b-2 border-[#16449B]/20 pb-2">
              <h3 className="text-xs font-extrabold text-[#16449B] uppercase tracking-wider">Question Palette</h3>
              <span className="text-xs font-extrabold text-[#16449B]">
                {answeredCount} / {questions.length} Answered
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-3 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(selectedAnswers[q.id]);
                const isCurrent = idx === currentIndex;

                let paletteStyle = 'bg-white text-[#16449B] border-2 border-[#16449B] hover:bg-[#16449B]/10';
                if (isCurrent) {
                  paletteStyle = 'bg-[#16449B] text-white border-2 border-[#16449B] font-extrabold shadow-md';
                } else if (isAnswered) {
                  paletteStyle = 'bg-[#16449B]/20 text-[#16449B] border-2 border-[#16449B] font-bold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl text-xs font-bold border-2 flex items-center justify-center transition-all cursor-pointer ${paletteStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t-2 border-[#16449B]/20 space-y-1.5 text-[11px] text-[#16449B] font-bold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#16449B]/20 border border-[#16449B] inline-block"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-white border border-[#16449B] inline-block"></span>
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#16449B] inline-block"></span>
                <span>Current Question</span>
              </div>
            </div>
          </div>

          {/* Active Question Display */}
          <div className="lg:col-span-3 space-y-6 text-[#16449B]">
            <div className="question-box shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                {/* Question Header with Per-Question Timer */}
                <div className="flex items-center justify-between border-b border-[#D6E4FF] pb-3 gap-2">
                  <span className="text-xs font-extrabold text-[#16449B] uppercase tracking-wider">
                    Question {currentIndex + 1} of {questions.length}
                  </span>

                  {/* Per-Question Timer countdown */}
                  <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] border-2 transition-colors ${timerStyle}`}>
                    <Clock className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-mono font-bold">
                      Time left: <strong className="text-sm">{formatQuestionTimer(questionTimeLeft)}</strong>
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="text-lg font-extrabold text-[#16449B] leading-relaxed">{currentQ.question}</h3>

                {/* Options or Short Answer Field */}
                {Boolean(currentQ.optionA && currentQ.optionA.trim() !== '') ? (
                  <div className="space-y-3">
                    {[
                      { key: 'optionA', label: 'Option A', text: currentQ.optionA },
                      { key: 'optionB', label: 'Option B', text: currentQ.optionB },
                      { key: 'optionC', label: 'Option C', text: currentQ.optionC },
                      { key: 'optionD', label: 'Option D', text: currentQ.optionD },
                    ].filter((opt) => Boolean(opt.text && opt.text.trim() !== '')).map((opt) => {
                      const isSelected = selectedAnswers[currentQ.id] === opt.key;

                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleOptionSelect(currentQ.id, opt.key)}
                          className={`w-full text-left p-4 rounded-[10px] border-2 transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#16449B] text-white border-[#16449B] shadow-md'
                              : 'bg-white border-[#16449B] text-[#16449B] hover:bg-[#F8FBFF]'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-6 h-6 rounded-full border-2 text-xs font-bold flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-white border-white text-[#16449B]'
                                  : 'border-[#16449B] text-[#16449B] bg-white'
                              }`}
                            >
                              {opt.label.replace('Option ', '')}
                            </div>
                            <span className="text-sm font-bold">{opt.text}</span>
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="block text-xs font-extrabold text-[#16449B] uppercase tracking-wider">
                        Write your answer in the space given:
                      </label>
                      <span className="text-[11px] text-[#16449B] font-extrabold bg-[#FFFFFF] border border-[#D6E4FF] px-2.5 py-1 rounded-[6px]">
                        Separate multiple numbers with commas (e.g. 1, 2, 3, 4, 6, 8, 12, 24)
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={selectedAnswers[currentQ.id] || ''}
                      onChange={(e) => handleOptionSelect(currentQ.id, e.target.value)}
                      placeholder="Type your answer here... e.g. 1, 2, 3, 4, 6, 8, 12, 24"
                      className="answer-input w-full text-sm font-bold shadow-inner resize-y"
                    />
                    <div className="text-xs text-[#16449B] font-bold pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span>Answer: __________________________________________________</span>
                      <span className="text-[11px] text-[#16449B]/70 font-semibold italic">Evaluated automatically upon submission</span>
                    </div>
                  </div>
                )}

                {/* Educational Feedback / Hint Box (MCQ only) */}
                {Boolean(currentQ.optionA || currentQ.optionB) && selectedOpt && (
                  isSelectedCorrect ? (
                    <div className="p-3.5 bg-[#FFFFFF] border border-[#16449B] text-[#16449B] text-xs flex items-center gap-2.5 font-extrabold rounded-[8px] shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-[#16449B] shrink-0" />
                      <span>Correct! Well done.</span>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#FFFFFF] border border-[#16449B] text-[#16449B] text-xs space-y-1.5 rounded-[8px] shadow-sm">
                      <div className="flex items-center gap-2 font-extrabold text-[#16449B] text-sm">
                        <Lightbulb className="w-4 h-4 text-[#16449B] shrink-0" />
                        <span>Hint</span>
                      </div>
                      <p className="italic text-[#16449B] leading-relaxed pl-6 font-semibold">
                        {currentQ.hint || 'Think about the mathematical concept used in this question.'}
                      </p>
                      <p className="text-[11px] text-[#16449B]/80 pl-6 pt-1 font-bold">
                        You can select another option while time remains for this question.
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between border-t border-[#D6E4FF] pt-4 mt-6">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 bg-white text-[#16449B] hover:bg-[#F8FBFF] border border-[#D6E4FF] font-extrabold px-4 py-2.5 rounded-[10px] text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 text-[#16449B]" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="flex items-center gap-1.5 btn-primary text-xs shadow-md cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="flex items-center gap-1.5 btn-primary text-xs shadow-md cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-white" />
                    <span>Review & Submit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#16449B] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-[#16449B]">
            <h3 className="text-lg font-extrabold text-[#16449B]">Submit Test Confirmation</h3>
            <p className="text-xs text-[#16449B] leading-relaxed font-semibold">
              You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.
              Are you sure you want to finalize and submit Attempt #{attemptNumber}?
            </p>

            {answeredCount < questions.length && (
              <div className="p-3 bg-white border-2 border-[#D32F2F] rounded-xl text-[#D32F2F] text-xs flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#D32F2F]" />
                <span>You have {questions.length - answeredCount} unanswered question(s).</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-[#16449B] hover:underline cursor-pointer"
              >
                Continue Test
              </button>
              <button
                onClick={processSubmission}
                disabled={isSubmitting}
                className="bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

