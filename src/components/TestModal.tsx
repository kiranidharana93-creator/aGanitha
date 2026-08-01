import React, { useState } from 'react';
import { Test } from '../types';
import { X, Plus, Save } from 'lucide-react';

interface TestModalProps {
  testToEdit?: Test | null;
  onClose: () => void;
  onSave: (testData: { title: string; class: string; duration: number; published: boolean }) => Promise<void>;
}

export const TestModal: React.FC<TestModalProps> = ({ testToEdit, onClose, onSave }) => {
  const [title, setTitle] = useState(testToEdit?.title || '');
  const [testClass, setTestClass] = useState(testToEdit?.class || 'Class 6');
  const [duration, setDuration] = useState(testToEdit?.duration || 15);
  const [published, setPublished] = useState(testToEdit ? testToEdit.published : true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const classOptions = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'All Classes'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a test title');
      return;
    }
    if (duration <= 0) {
      setError('Duration must be at least 1 minute');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        class: testClass,
        duration: Number(duration),
        published,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save test. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {testToEdit ? <Save className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-blue-400" />}
            <span>{testToEdit ? 'Edit Upcoming Test' : 'Create Upcoming Test'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Test Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CBSE Class 10: Polynomials & Quadratic Equations"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Target Class</label>
              <select
                value={testClass}
                onChange={(e) => setTestClass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {classOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                max="180"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Publish Test Immediately</p>
              <p className="text-[11px] text-slate-400">Published tests are immediately visible to students.</p>
            </div>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
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
              {isSaving ? 'Saving...' : testToEdit ? 'Update Test' : 'Create Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
