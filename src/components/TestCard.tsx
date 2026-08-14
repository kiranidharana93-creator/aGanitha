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
  onStartTest,
}) => {
  const nextAttemptNumber = attemptsCount + 1;
  const cleanTitle = cleanStudentTestTitle(test.title);

  return (
    <div className="test-card bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#2563EB] rounded-[14px] p-5 shadow-[0_2px_8px_rgba(11,61,145,0.08)] flex flex-col justify-between transition-all space-y-4 text-[#0B3D91] hover:shadow-lg">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          {attemptsCount > 0 ? (
            <span className="bg-[#FFFFFF] text-[#2563EB] border border-[#2563EB] text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-[#2563EB]" />
              Attempted {attemptsCount} {attemptsCount === 1 ? 'Time' : 'Times'}
            </span>
          ) : (
            <span className="bg-[#0B3D91] text-[#FFFFFF] text-[11px] px-2.5 py-1 rounded-full font-bold">
              New Test
            </span>
          )}
        </div>

        {/* Display ONLY the lesson name and test number - NO CBSE or Class Prefix */}
        <h3 className="text-base font-extrabold text-[#0B3D91] leading-snug">{cleanTitle}</h3>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="bg-[#F8FBFF] p-2.5 rounded-[10px] border border-[#D6E4FF] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2563EB]" />
            <div>
              <p className="text-[10px] text-[#0B3D91]/70 font-bold uppercase">Per Qn Time</p>
              <p className="font-extrabold text-[#0B3D91]">60 Seconds</p>
            </div>
          </div>

          <div className="bg-[#F8FBFF] p-2.5 rounded-[10px] border border-[#D6E4FF] flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#2563EB]" />
            <div>
              <p className="text-[10px] text-[#0B3D91]/70 font-bold uppercase">Questions</p>
              <p className="font-extrabold text-[#0B3D91]">{test.questionCount || 0} Questions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <button
          onClick={() => onStartTest(test, nextAttemptNumber)}
          disabled={(test.questionCount || 0) === 0}
          className="start-btn w-full btn-primary py-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{attemptsCount > 0 ? `Retake (${nextAttemptNumber})` : 'Start Test'}</span>
        </button>
      </div>
    </div>
  );
};
