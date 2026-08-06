import React, { useState } from 'react';
import { Question, Test } from '../types';
import { X, Save, HelpCircle, Sparkles } from 'lucide-react';

interface QuestionModalProps {
  testList: Test[];
  selectedTestId: string;
  questionToEdit?: Question | null;
  onClose: () => void;
  onSave: (qData: Omit<Question, 'id'>) => Promise<void>;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  testList,
  selectedTestId,
  questionToEdit,
  onClose,
  onSave,
}) => {
  const [testId, setTestId] = useState(questionToEdit?.testId || selectedTestId || (testList[0]?.id || ''));
  const [questionText, setQuestionText] = useState(questionToEdit?.question || '');
  const [optionA, setOptionA] = useState(questionToEdit?.optionA || '');
  const [optionB, setOptionB] = useState(questionToEdit?.optionB || '');
  const [optionC, setOptionC] = useState(questionToEdit?.optionC || '');
  const [optionD, setOptionD] = useState(questionToEdit?.optionD || '');
  const [correctAnswer, setCorrectAnswer] = useState<string>(questionToEdit?.correctAnswer || 'optionA');
  const [hint, setHint] = useState(questionToEdit?.hint || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    if (!testId) {
      setError('Please select a test');
      return;
    }
    if (!questionText.trim()) {
      setError('Please enter question text');
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setError('All 4 options (A, B, C, D) are required');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await onSave({
        testId,
        question: questionText.trim(),
        optionA: optionA.trim(),
        optionB: optionB.trim(),
        optionC: optionC.trim(),
        optionD: optionD.trim(),
        correctAnswer: correctAnswer as any,
        hint: hint.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save question. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>{questionToEdit ? 'Edit MCQ Question' : 'Add New MCQ Question'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Test Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">Select Test</label>
            <select
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              required
            >
              {testList.map((t) => {
                const displayTitle = t.title.replace(/\s*\(\s*Class\s*\d+\s*\)/gi, '').trim();
                const hasClassInTitle = /class\s*\d+/i.test(displayTitle);
                const showClassSuffix = !hasClassInTitle && t.class && t.class !== 'All';
                return (
                  <option key={t.id} value={t.id}>
                    {displayTitle}{showClassSuffix ? ` (${t.class})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Question Prompt */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Question Text <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g. Find the discriminant of quadratic equation 2x² - 4x + 3 = 0."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Option A</span>
                {correctAnswer === 'optionA' && <span className="text-[10px] text-emerald-400 font-bold">✔ Correct</span>}
              </label>
              <input
                type="text"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="Option A text"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Option B</span>
                {correctAnswer === 'optionB' && <span className="text-[10px] text-emerald-400 font-bold">✔ Correct</span>}
              </label>
              <input
                type="text"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="Option B text"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Option C</span>
                {correctAnswer === 'optionC' && <span className="text-[10px] text-emerald-400 font-bold">✔ Correct</span>}
              </label>
              <input
                type="text"
                value={optionC}
                onChange={(e) => setOptionC(e.target.value)}
                placeholder="Option C text"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Option D</span>
                {correctAnswer === 'optionD' && <span className="text-[10px] text-emerald-400 font-bold">✔ Correct</span>}
              </label>
              <input
                type="text"
                value={optionD}
                onChange={(e) => setOptionD(e.target.value)}
                placeholder="Option D text"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Correct Answer Selection */}
          <div className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block">
              Set Correct Answer <span className="text-red-400">*</span>
            </label>
            <select
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="optionA">Option A: {optionA || '(Empty)'}</option>
              <option value="optionB">Option B: {optionB || '(Empty)'}</option>
              <option value="optionC">Option C: {optionC || '(Empty)'}</option>
              <option value="optionD">Option D: {optionD || '(Empty)'}</option>
            </select>
          </div>

          {/* Educational Hint Field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Educational Hint (Shown on wrong selection)</span>
              <span className="text-[10px] text-amber-400 font-medium">Optional</span>
            </label>
            <textarea
              rows={2}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. Formula for discriminant is D = b² - 4ac. Identify a, b, and c first."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-xs text-red-400 rounded-xl">{error}</div>}

          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : questionToEdit ? 'Update Question' : 'Save Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
