import React, { useState } from 'react';
import { Student } from '../types';
import { updateStudentProfile } from '../services/db';
import { GraduationCap, ArrowRight, UserCheck, Sparkles } from 'lucide-react';

interface CompleteProfilePageProps {
  student: Student;
  onProfileCompleted: (updatedStudent: Student) => void;
}

export const CompleteProfilePage: React.FC<CompleteProfilePageProps> = ({
  student,
  onProfileCompleted,
}) => {
  const [selectedClass, setSelectedClass] = useState('Class 6');
  const [section, setSection] = useState('A');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) {
      setError('Please select your class');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updated = await updateStudentProfile(student.uid || student.id, selectedClass, section);
      onProfileCompleted(updated);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-2 border-[#16449B] rounded-2xl shadow-xl overflow-hidden my-8">
        {/* Banner */}
        <div className="bg-[#16449B] p-6 text-white text-center space-y-2">
          <div className="w-14 h-14 bg-white text-[#16449B] rounded-full flex items-center justify-center mx-auto shadow-md overflow-hidden">
            {student.photoURL ? (
              <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <GraduationCap className="w-7 h-7 text-[#16449B]" />
            )}
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Complete Your Profile</h2>
          <p className="text-xs text-white/90 font-medium">Please select your enrolled class to access test papers</p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          <div className="bg-[#16449B]/5 border border-[#16449B]/20 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#16449B] text-white flex items-center justify-center font-bold text-base shrink-0">
              {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-extrabold text-[#16449B] text-sm truncate">{student.name}</h3>
              <p className="text-xs font-semibold text-[#16449B]/80 truncate">{student.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#16449B] block">
                Select Your Class <span className="text-[#DC2626]">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'].map((cls) => {
                  const isSelected = selectedClass === cls;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className={`py-3 px-3 rounded-xl border-2 text-xs font-extrabold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#16449B] text-white border-[#16449B] shadow-md'
                          : 'bg-white text-[#16449B] border-[#16449B]/30 hover:border-[#16449B]'
                      }`}
                    >
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#16449B] block">
                Section (Optional)
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value.toUpperCase())}
                placeholder="e.g. A, B, C"
                maxLength={3}
                className="w-full bg-white border-2 border-[#16449B] rounded-xl px-4 py-2.5 text-sm text-[#16449B] font-bold focus:outline-none focus:ring-2 focus:ring-[#16449B]"
              />
            </div>

            {error && (
              <div className="p-3 bg-white border-2 border-[#DC2626] rounded-xl text-xs font-bold text-[#DC2626]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving Profile...</span>
              ) : (
                <>
                  <span>Save & Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
