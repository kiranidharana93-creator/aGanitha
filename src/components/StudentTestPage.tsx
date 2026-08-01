import React, { useState, useEffect, useRef } from 'react';
import { Student, Test, Question, Attempt } from '../types';
import { getQuestionsByTestId, saveAttempt, normalizeAnswerKey } from '../services/db';
import { Clock, CheckCircle2, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Send, ArrowLeft, RefreshCw, Award, Lightbulb } from 'lucide-react';

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

  // Per-Question Timer state (60 seconds per question)
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load questions
  useEffect(() => {
    let isMounted = true;

    async function initTest() {
      setIsLoading(true);
      try {
        const qList = await getQuestionsByTestId(test.id);
        if (isMounted) {
          setQuestions(qList);
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

  // Completed Test Result View
  if (completedAttempt) {
    const percentage = Math.round((completedAttempt.score / (completedAttempt.totalQuestions || 1)) * 100);
    const isPassed = percentage >= 40;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Score Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              Attempt {completedAttempt.attemptNumber} Submitted
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-2">{test.title}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Student: <strong className="text-slate-200">{student.name}</strong> ({student.class})
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto pt-2">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Score Achieved</p>
              <p className="text-2xl font-black text-white mt-0.5">
                {completedAttempt.score} / {completedAttempt.totalQuestions}
              </p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Percentage</p>
              <p className={`text-2xl font-black mt-0.5 ${isPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {percentage}%
              </p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Status</p>
              <p className={`text-lg font-bold mt-1 ${isPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isPassed ? 'PASSED' : 'NEEDS PRACTICE'}
              </p>
            </div>
          </div>

          <button
            onClick={onFinishTest}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all text-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Test Portal</span>
          </button>
        </div>

        {/* Detailed Question Review */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Answer Breakdown & Explanations</span>
          </h3>

          <div className="space-y-6">
            {questions.map((q, idx) => {
              const studentAnsKey = selectedAnswers[q.id];
              const correctKey = normalizeAnswerKey(q.correctAnswer);
              const isCorrect = studentAnsKey && normalizeAnswerKey(studentAnsKey) === correctKey;

              const optionsMap: Record<string, string> = {
                optionA: q.optionA,
                optionB: q.optionB,
                optionC: q.optionC,
                optionD: q.optionD,
              };

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-xl border ${
                    isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-slate-800/60 border-slate-700/80'
                  } space-y-3`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-white">
                      <span className="text-blue-400 mr-1.5 font-bold">Q{idx + 1}.</span>
                      {q.question}
                    </p>

                    {isCorrect ? (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+1)
                      </span>
                    ) : (
                      <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0">
                        <XCircle className="w-3.5 h-3.5" /> Incorrect
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {['optionA', 'optionB', 'optionC', 'optionD'].map((optKey) => {
                      const isSelected = studentAnsKey === optKey;
                      const isThisCorrect = correctKey === optKey;

                      let style = 'bg-slate-900 border-slate-800 text-slate-300';
                      if (isThisCorrect) {
                        style = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-bold';
                      } else if (isSelected && !isCorrect) {
                        style = 'bg-red-500/20 border-red-500/60 text-red-200 font-bold';
                      }

                      return (
                        <div
                          key={optKey}
                          className={`p-3 rounded-lg border flex items-center justify-between ${style}`}
                        >
                          <span>
                            <strong className="uppercase mr-1">{optKey.replace('option', '')}:</strong>{' '}
                            {optionsMap[optKey]}
                          </span>
                          {isThisCorrect && <span className="text-[10px] text-emerald-400 font-bold">✔ Correct</span>}
                          {isSelected && !isThisCorrect && (
                            <span className="text-[10px] text-red-400 font-bold"> Your Answer</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.hint && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">Educational Hint:</strong>
                        <p className="mt-0.5 italic text-amber-200">{q.hint}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
          <h2 className="text-base sm:text-lg font-bold text-white mt-1">{test.title}</h2>
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
                      {currentQ.hint || 'Remember to analyze the math rule step-by-step and double-check calculations.'}
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

