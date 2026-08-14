import React, { useState } from 'react';
import { Student } from '../types';
import { updateStudentPassword } from '../services/db';
import { KeyRound, ShieldCheck, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react';

interface ChangePasswordModalProps {
  student: Student;
  onPasswordChanged: (updatedStudent: Student) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  student,
  onPasswordChanged,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please check again.');
      return;
    }

    if (newPassword === student.password) {
      setError('Please choose a new password different from your temporary password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await updateStudentPassword(student.id, newPassword.trim());
      const updated: Student = {
        ...student,
        password: newPassword.trim(),
        isPasswordChanged: true,
      };
      onPasswordChanged(updated);
    } catch (err) {
      console.error('Failed to change password:', err);
      setError('Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-[#16449B] max-w-md w-full rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in zoom-in duration-200 text-[#16449B]">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#16449B] text-white rounded-full flex items-center justify-center mx-auto shadow-md">
            <KeyRound className="w-7 h-7 text-white" />
          </div>

          <span className="inline-block text-[11px] font-extrabold text-white bg-[#16449B] px-3.5 py-1 rounded-full">
            First Time Login Detected
          </span>

          <h2 className="text-2xl font-extrabold text-[#16449B]">Update Temporary Password</h2>
          <p className="text-xs text-[#16449B] font-semibold">
            Welcome <strong className="text-[#16449B] underline">{student.name}</strong> ({student.studentId || student.id}). For security reasons, please create a new password to proceed to your exam portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#16449B] block">
              New Password <span className="text-[#D32F2F]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new custom password"
                className="w-full bg-white border-2 border-[#16449B] rounded-xl pl-4 pr-11 py-2.5 text-sm text-[#16449B] placeholder-[#16449B]/50 focus:outline-none focus:ring-2 focus:ring-[#16449B] font-bold"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#16449B] hover:opacity-80 p-1 cursor-pointer"
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#16449B] block">
              Confirm New Password <span className="text-[#D32F2F]">*</span>
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new custom password"
              className="w-full bg-white border-2 border-[#16449B] rounded-xl px-4 py-2.5 text-sm text-[#16449B] placeholder-[#16449B]/50 focus:outline-none focus:ring-2 focus:ring-[#16449B] font-bold"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-white border-2 border-[#D32F2F] rounded-xl text-xs text-[#D32F2F] font-bold">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold py-3 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Securing Account...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Update Password & Continue</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
