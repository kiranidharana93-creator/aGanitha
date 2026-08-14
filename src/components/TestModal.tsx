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
    <div className="fixed inset-0 z-50 bg-[#16449B]/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-[#16449B] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="bg-[#16449B] p-4 text-white flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            {testToEdit ? <Save className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            <span>{testToEdit ? 'Edit Upcoming Test' : 'Create Upcoming Test'}</span>
          </h3>
          <button onClick={onClose} className="text-white hover:opacity-80 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#16449B] block">
              Test Title <span className="text-[#D32F2F]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CBSE Class 10: Polynomials & Quadratic Equations"
              className="w-full bg-white border border-[#16449B] rounded-xl px-4 py-2.5 text-sm text-[#16449B] placeholder-[#16449B]/50 focus:outline-none focus:ring-2 focus:ring-[#16449B]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#16449B] block">Target Class</label>
              <select
                value={testClass}
                onChange={(e) => setTestClass(e.target.value)}
                className="w-full bg-white border border-[#16449B] rounded-xl px-3 py-2.5 text-sm text-[#16449B] focus:outline-none focus:ring-2 focus:ring-[#16449B] cursor-pointer"
              >
                {classOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#16449B] block">Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                max="180"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-white border border-[#16449B] rounded-xl px-4 py-2.5 text-sm text-[#16449B] focus:outline-none focus:ring-2 focus:ring-[#16449B]"
                required
              />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#16449B] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#16449B]">Publish Test Immediately</p>
              <p className="text-[11px] text-[#16449B]/80">Published tests are immediately visible to students.</p>
            </div>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-5 h-5 accent-[#16449B] rounded cursor-pointer"
            />
          </div>

          {error && <div className="p-3 bg-[#D32F2F]/10 border border-[#D32F2F] text-xs text-[#D32F2F] font-bold rounded-xl">{error}</div>}

          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[#16449B]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold border border-[#16449B] text-[#16449B] hover:bg-[#16449B] hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-[#16449B] hover:bg-[#16449B]/90 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : testToEdit ? 'Update Test' : 'Create Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
