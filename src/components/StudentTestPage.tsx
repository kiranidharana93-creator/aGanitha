import React, { useState, useEffect, useRef } from 'react';
import { Student, Test, Question, Attempt } from '../types';
import { getQuestionsByTestId, saveAttempt, normalizeAnswerKey, saveDraftAttempt, clearDraftAttempt, getAttemptsForStudent } from '../services/db';
import { extractTopicFromTitle, getRecommendationsForTopic, calculateStudentAnalytics, cleanStudentTestTitle } from '../utils/analytics';
import { Clock, CheckCircle, CheckCircle2, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Send, ArrowLeft, RefreshCw, Award, Lightbulb, Share2, Copy, Check, MessageSquare, Phone } from 'lucide-react';

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
          setQuestionTimeLeft(60);
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

  // Reset 60s Timer whenever question index changes
  useEffect(() => {
    if (questions.length > 0) {
      setQuestionTimeLeft(60);
    }
  }, [currentIndex, questions.length]);

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
    let score = 0;
    questions.forEach((q) => {
      const selected = selectedAnswers[q.id];
      const correct = normalizeAnswerKey(q.correctAnswer);
      if (selected && normalizeAnswerKey(selected) === correct) {
        score++;
      }
    });
    return score;
  };

  const processSubmission = async () => {
    if (isSubmitting || completedAttempt) return;
    setIsSubmitting(true);

    try {
      // Clear draft immediately before network request
      clearDraftAttempt(student.id);

      const finalScore = calculateScore();
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
      const percentage = Math.round((finalScore / (questions.length || 1)) * 100);
      const statusText =
        analytics.avgPercentage >= 85
          ? 'Excellent'
          : analytics.avgPercentage >= 70
          ? 'Good'
          : analytics.avgPercentage >= 50
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-200">Loading Test Questions...</h2>
        <p className="text-xs text-slate-400 mt-1">Preparing examination environment for {test.title}</p>
      </div>
    );
  }

  // Completed Test Result View - Clean Student Confirmation
  if (completedAttempt) {
    const percentage = Math.round((completedAttempt.score / (completedAttempt.totalQuestions || 1)) * 100);
    const statusText =
      percentage >= 85
        ? 'PASSED (Excellent)'
        : percentage >= 70
        ? 'PASSED (Good)'
        : percentage >= 50
        ? 'PASSED (Needs Practice)'
        : 'NEEDS IMPROVEMENT';
    const isPassed = percentage >= 40;
    const topicName = extractTopicFromTitle(test.title);

    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">Exam Submitted Successfully</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">CBSE Mathematics Online Examination Portal</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left space-y-3 font-medium text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Topic</span>
              <span className="text-white font-bold">{topicName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Score</span>
              <span className="text-white font-bold">{completedAttempt.score} / {completedAttempt.totalQuestions}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Percentage</span>
              <span className="text-emerald-400 font-bold">{percentage}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Status</span>
              <span className={`font-bold uppercase ${isPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isPassed ? 'PASSED' : 'NEEDS PRACTICE'}
              </span>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold py-3.5 px-4 rounded-xl text-center space-y-1">
            <p className="font-bold text-sm text-emerald-300">Result submitted successfully. Parent has been notified.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={onFinishTest}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all text-xs cursor-pointer hover:scale-[1.01]"
            >
              Return to Dashboard
            </button>
            <button
              onClick={onFinishTest}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-3.5 px-4 rounded-xl transition-all text-xs cursor-pointer"
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
    selectedOpt && currentQ ? normalizeAnswerKey(selectedOpt) === normalizeAnswerKey(currentQ.correctAnswer) : false;

  // Visual styling for the per-question timer
  let timerStyle = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  if (questionTimeLeft <= 10) {
    timerStyle = 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse';
  } else if (questionTimeLeft <= 30) {
    timerStyle = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Test Sticky Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl sticky top-20 z-30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            CBSE Examination Mode • Attempt #{attemptNumber}
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white mt-1">{cleanStudentTestTitle(test.title)}</h2>
        </div>

        {/* Global Action & Finish Button */}
        <div className="flex items-center space-x-4 shrink-0">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Test</span>
          </button>
        </div>
      </div>

      {/* Main Examination Layout */}
      {questions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Questions Found</h3>
          <p className="text-xs text-slate-400 mt-1">This test does not have any questions assigned yet.</p>
          <button
            onClick={onFinishTest}
            className="mt-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Palette Sidebar */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Question Palette</h3>
              <span className="text-xs font-bold text-blue-400">
                {answeredCount} / {questions.length} Answered
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-3 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(selectedAnswers[q.id]);
                const isCurrent = idx === currentIndex;

                let paletteStyle = 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700';
                if (isCurrent) {
                  paletteStyle = 'bg-blue-600 text-white border-blue-400 font-extrabold ring-2 ring-blue-500/40';
                } else if (isAnswered) {
                  paletteStyle = 'bg-emerald-950 text-emerald-300 border-emerald-600/60 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl text-xs font-semibold border flex items-center justify-center transition-all cursor-pointer ${paletteStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700 inline-block"></span>
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                <span>Current Question</span>
              </div>
            </div>
          </div>

          {/* Active Question Display */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* Question Header with Per-Question Timer */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">
                  Question {currentIndex + 1} of {questions.length}
                </span>

                {/* Per-Question Timer (60s countdown) */}
                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-colors ${timerStyle}`}>
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-mono font-bold">
                    Time left: <strong className="text-sm">{questionTimeLeft}s</strong>
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-lg font-bold text-white leading-relaxed">{currentQ.question}</h3>

              {/* Multiple Choice Options */}
              <div className="space-y-3">
                {[
                  { key: 'optionA', label: 'Option A', text: currentQ.optionA },
                  { key: 'optionB', label: 'Option B', text: currentQ.optionB },
                  { key: 'optionC', label: 'Option C', text: currentQ.optionC },
                  { key: 'optionD', label: 'Option D', text: currentQ.optionD },
                ].map((opt) => {
                  const isSelected = selectedAnswers[currentQ.id] === opt.key;

                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleOptionSelect(currentQ.id, opt.key)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? isSelectedCorrect
                            ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500'
                            : 'bg-amber-600/15 border-amber-500 text-white shadow-md ring-1 ring-amber-500'
                          : 'bg-slate-800/50 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center transition-colors ${
                            isSelected
                              ? isSelectedCorrect
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'bg-amber-600 border-amber-500 text-white'
                              : 'border-slate-600 text-slate-400 bg-slate-900'
                          }`}
                        >
                          {opt.label.replace('Option ', '')}
                        </div>
                        <span className="text-sm font-medium">{opt.text}</span>
                      </div>

                      {isSelected && (
                        isSelectedCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-amber-400 shrink-0" />
                        )
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Educational Feedback / Hint Box */}
              {selectedOpt && (
                isSelectedCorrect ? (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2.5 font-bold shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Correct! Well done.</span>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Hint</span>
                    </div>
                    <p className="italic text-amber-200/90 leading-relaxed pl-6">
                      {currentQ.hint || 'Think about the mathematical concept used in this question.'}
                    </p>
                    <p className="text-[11px] text-slate-400 pl-6 pt-1 font-medium">
                      You can select another option while time remains for this question.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Review & Submit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Submit Test Confirmation</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.
              Are you sure you want to finalize and submit Attempt #{attemptNumber}?
            </p>

            {answeredCount < questions.length && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>You have {questions.length - answeredCount} unanswered question(s).</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Continue Test
              </button>
              <button
                onClick={processSubmission}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md cursor-pointer disabled:opacity-50"
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

