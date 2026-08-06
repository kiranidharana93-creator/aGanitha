import React from 'react';
import { Test, Attempt, DraftAttempt } from '../types';
import { cleanStudentTestTitle } from '../utils/analytics';
import { Play, CheckCircle, Clock, HelpCircle } from 'lucide-react';

interface TestCardProps {
  test: Test;
  attemptsCount?: number;
  draftExam?: DraftAttempt | null;
  onStartTest: (test: Test, attemptNumber: number) => void;
  onContinueDraft?: () => void;
}

export const TestCard: React.FC<TestCardProps> = ({
  test,
  attemptsCount = 0,
  draftExam,
  onStartTest,
  onContinueDraft,
}) => {
  const isDraftForThis = Boolean(draftExam && draftExam.testId === test.id);
  const nextAttemptNumber = attemptsCount + 1;
  const cleanTitle = cleanStudentTestTitle(test.title);

  return (
    <div className="test-card bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-lg flex flex-col justify-between transition-all space-y-5">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          {isDraftForThis ? (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] px-2.5 py-1 rounded-full font-bold">
              In Progress
            </span>
          ) : attemptsCount > 0 ? (
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Attempted {attemptsCount} {attemptsCount === 1 ? 'Time' : 'Times'}
            </span>
          ) : (
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] px-2.5 py-1 rounded-full font-bold">
              New Test
            </span>
          )}
        </div>

        {/* Display ONLY the lesson name and test number - NO CBSE or Class Prefix */}
        <h3 className="text-lg font-bold text-white leading-snug">{cleanTitle}</h3>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Per Qn Time</p>
              <p className="font-bold text-slate-200">60 Seconds</p>
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Questions</p>
              <p className="font-bold text-slate-200">{test.questionCount || 0} Questions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        {isDraftForThis && onContinueDraft ? (
          <button
            onClick={onContinueDraft}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3.5 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Resume Test</span>
          </button>
        ) : (
          <button
            onClick={() => onStartTest(test, nextAttemptNumber)}
            disabled={(test.questionCount || 0) === 0}
            className="start-btn w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{attemptsCount > 0 ? `Retake (${nextAttemptNumber})` : 'Start Test'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
