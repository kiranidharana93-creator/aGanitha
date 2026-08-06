import React from 'react';
import { Attempt } from '../types';
import { cleanStudentTestTitle } from '../utils/analytics';
import { X, Award, CheckCircle2, XCircle } from 'lucide-react';

interface ResultDetailsModalProps {
  attempt: Attempt;
  onClose: () => void;
}

export const ResultDetailsModal: React.FC<ResultDetailsModalProps> = ({ attempt, onClose }) => {
  const percentage = Math.round((attempt.score / (attempt.totalQuestions || 1)) * 100);
  const isPassed = percentage >= 40;
  const cleanTitle = cleanStudentTestTitle(attempt.testTitle || 'Test');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-400" />
            <span>Student Attempt Details</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-white">{attempt.studentName || 'Student'}</h4>
                <p className="text-xs text-slate-400">Class: {attempt.studentClass || 'N/A'}</p>
              </div>
              <span className="bg-slate-800 border border-slate-700 text-xs px-2.5 py-1 rounded-full text-slate-300 font-semibold">
                Attempt #{attempt.attemptNumber}
              </span>
            </div>

            <div className="border-t border-slate-800 pt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Test</p>
                <p className="font-semibold text-slate-200 truncate">{cleanTitle}</p>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Score</p>
                <p className="font-bold text-white">
                  {attempt.score} / {attempt.totalQuestions}
                </p>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Percentage</p>
                <p className={`font-extrabold ${isPassed ? 'text-emerald-400' : 'text-amber-400'}`}>{percentage}%</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Submitted on:{' '}
              {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('en-IN') : 'N/A'}
            </p>
          </div>

          {/* Submission Answers Map */}
          {attempt.answers && Object.keys(attempt.answers).length > 0 ? (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recorded Answer Submissions</h5>
              <div className="space-y-2">
                {Object.entries(attempt.answers).map(([qId, ans], idx) => (
                  <div key={qId} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Question {idx + 1}</span>
                    <span className="bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-md font-bold uppercase">
                      {String(ans || '').replace('option', 'Option ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center py-2">Detailed per-question log not recorded for this older submission.</p>
          )}

          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2 rounded-xl border border-slate-700 cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
