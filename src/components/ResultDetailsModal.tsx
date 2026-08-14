import React from 'react';
import { Attempt } from '../types';
import { cleanStudentTestTitle } from '../utils/analytics';
import { X, Award } from 'lucide-react';

interface ResultDetailsModalProps {
  attempt: Attempt;
  onClose: () => void;
}

export const ResultDetailsModal: React.FC<ResultDetailsModalProps> = ({ attempt, onClose }) => {
  const percentage = Math.round((attempt.score / (attempt.totalQuestions || 1)) * 100);
  const isPassed = percentage >= 40;
  const cleanTitle = cleanStudentTestTitle(attempt.testTitle || 'Test');

  return (
    <div className="fixed inset-0 z-50 bg-[#16449B]/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-[#16449B] rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="bg-[#16449B] p-4 text-white flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-white" />
            <span>Student Attempt Details</span>
          </h3>
          <button onClick={onClose} className="text-white hover:opacity-80 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary Box */}
          <div className="bg-white p-4 rounded-xl border-2 border-[#16449B] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-[#16449B]">{attempt.studentName || 'Student'}</h4>
                <p className="text-xs font-semibold text-[#16449B]/80">Class: {attempt.studentClass || 'N/A'}</p>
              </div>
              <span className="bg-[#16449B] text-white text-xs px-3 py-1 rounded-full font-bold">
                Attempt #{attempt.attemptNumber}
              </span>
            </div>

            <div className="border-t border-[#16449B]/20 pt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-[#16449B]">
                <p className="text-[10px] text-[#16449B] font-bold uppercase">Test</p>
                <p className="font-bold text-[#16449B] truncate">{cleanTitle}</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#16449B]">
                <p className="text-[10px] text-[#16449B] font-bold uppercase">Score</p>
                <p className="font-extrabold text-[#16449B]">
                  {attempt.score} / {attempt.totalQuestions}
                </p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#16449B]">
                <p className="text-[10px] text-[#16449B] font-bold uppercase">Percentage</p>
                <p className={`font-extrabold ${isPassed ? 'text-[#16449B]' : 'text-[#D32F2F]'}`}>{percentage}%</p>
              </div>
            </div>

            <p className="text-[11px] text-[#16449B]/80 font-medium">
              Submitted on:{' '}
              {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('en-IN') : 'N/A'}
            </p>
          </div>

          {/* Submission Answers Map */}
          {attempt.answers && Object.keys(attempt.answers).length > 0 ? (
            <div className="space-y-3">
              <h5 className="text-xs font-extrabold text-[#16449B] uppercase tracking-wider">Recorded Answer Submissions</h5>
              <div className="space-y-2">
                {Object.entries(attempt.answers).map(([qId, ans], idx) => (
                  <div key={qId} className="bg-white p-3 rounded-lg border border-[#16449B] flex items-center justify-between text-xs">
                    <span className="text-[#16449B] font-bold">Question {idx + 1}</span>
                    <span className="bg-[#16449B] text-white px-2.5 py-0.5 rounded-md font-bold uppercase">
                      {String(ans || '').replace('option', 'Option ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#16449B]/70 italic text-center py-2">Detailed per-question log not recorded for this older submission.</p>
          )}

          <div className="pt-2 border-t border-[#16449B]/20 flex justify-end">
            <button
              onClick={onClose}
              className="bg-[#16449B] hover:bg-[#16449B] text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer shadow-md"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
