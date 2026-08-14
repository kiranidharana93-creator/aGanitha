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
    <div className="test-card bg-white border-2 border-[#0052CC] rounded-2xl p-6 shadow-md flex flex-col justify-between transition-all space-y-5 text-[#0052CC]">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          {isDraftForThis ? (
            <span className="bg-white text-[#D32F2F] border-2 border-[#D32F2F] text-[11px] px-2.5 py-1 rounded-full font-bold">
              In Progress
            </span>
          ) : attemptsCount > 0 ? (
            <span className="bg-white text-[#0052CC] border-2 border-[#0052CC] text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-[#0052CC]" />
              Attempted {attemptsCount} {attemptsCount === 1 ? 'Time' : 'Times'}
            </span>
          ) : (
            <span className="bg-[#0052CC] text-white text-[11px] px-2.5 py-1 rounded-full font-bold">
              New Test
            </span>
          )}
        </div>

        {/* Display ONLY the lesson name and test number - NO CBSE or Class Prefix */}
        <h3 className="text-lg font-extrabold text-[#0052CC] leading-snug">{cleanTitle}</h3>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="bg-white p-2.5 rounded-xl border-2 border-[#0052CC] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0052CC]" />
            <div>
              <p className="text-[10px] text-[#0052CC] font-bold uppercase">Per Qn Time</p>
              <p className="font-extrabold text-[#0052CC]">60 Seconds</p>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border-2 border-[#0052CC] flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#0052CC]" />
            <div>
              <p className="text-[10px] text-[#0052CC] font-bold uppercase">Questions</p>
              <p className="font-extrabold text-[#0052CC]">{test.questionCount || 0} Questions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        {isDraftForThis && onContinueDraft ? (
          <button
            onClick={onContinueDraft}
            className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Resume Test</span>
          </button>
        ) : (
          <button
            onClick={() => onStartTest(test, nextAttemptNumber)}
            disabled={(test.questionCount || 0) === 0}
            className="start-btn w-full bg-[#0052CC] hover:bg-[#0052CC]/90 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{attemptsCount > 0 ? `Retake (${nextAttemptNumber})` : 'Start Test'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
