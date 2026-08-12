import React, { useState } from 'react';
import { UserRole, Student } from '../types';
import { authenticateStudent } from '../services/db';
import { User, Shield, GraduationCap, ArrowRight, Eye, EyeOff, Lock, AlertTriangle, Key } from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';

interface LoginModalProps {
  onStudentLogin: (student: Student) => void;
  onAdminLogin: (email?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onStudentLogin, onAdminLogin }) => {
  const [roleTab, setRoleTab] = useState<UserRole>('student');

  // Student Form state
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [pendingPasswordChangeStudent, setPendingPasswordChangeStudent] = useState<Student | null>(null);

  // Admin Form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdInput.trim()) {
      setStudentError('Please enter your Student ID');
      return;
    }
    if (!studentPassword.trim()) {
      setStudentError('Please enter your Password');
      return;
    }

    setStudentError('');
    setIsStudentLoading(true);

    try {
      const res = await authenticateStudent(studentIdInput, studentPassword);
      if (res.student) {
        if (!res.student.isPasswordChanged) {
          // First time login -> Force password change
          setPendingPasswordChangeStudent(res.student);
        } else {
          onStudentLogin(res.student);
        }
      } else {
        setStudentError('Access Denied: Only registered students can access the portal. Please check your credentials or contact your administrator.');
      }
    } catch (err) {
      console.error(err);
      setStudentError('Access Denied: Unable to authenticate student. Please check your Student ID and Password.');
    } finally {
      setIsStudentLoading(false);
    }
  };

  const handlePasswordChanged = (updatedStudent: Student) => {
    setPendingPasswordChangeStudent(null);
    onStudentLogin(updatedStudent);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!adminEmail.trim()) {
        setAdminError('Please enter admin email');
        return;
      }
      if (!adminPassword.trim()) {
        setAdminError('Please enter password');
        return;
      }

      const targetEmail = adminEmail.trim().toLowerCase();
      const encodedTarget = typeof btoa !== 'undefined' ? btoa(targetEmail) : '';
      
      if (encodedTarget === 'a2lyYW5pZGhhcmFuYTkzQGdtYWlsLmNvbQ==' && adminPassword.trim().length > 0) {
        setAdminError('');
        onAdminLogin(adminEmail.trim());
      } else {
        setAdminError('Invalid admin email or password');
        setAdminPassword('');
      }
    } catch (err) {
      console.error('Admin authentication error:', err);
      setAdminError('Authentication error occurred. Please try logging in again.');
    }
  };

  if (pendingPasswordChangeStudent) {
    return (
      <ChangePasswordModal
        student={pendingPasswordChangeStudent}
        onPasswordChanged={handlePasswordChanged}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header Branding Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-7 text-white text-center relative rounded-t-2xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur border border-white/20 shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">CBSE Maths Examination</h1>
          <p className="text-xs text-blue-100 mt-1 font-medium">Official Student & Teacher Testing Portal</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setRoleTab('student')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              roleTab === 'student'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Student Login</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleTab('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              roleTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Portal</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-6">
          {roleTab === 'student' ? (
            <div className="space-y-5">
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Student ID <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      placeholder="e.g. c6-2026-0012"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wider font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showStudentPassword ? 'text' : 'password'}
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder="Enter student password"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentPassword(!showStudentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                      aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {studentError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <div>
                      <strong className="font-bold block">Access Denied</strong>
                      <p className="mt-0.5">{studentError}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isStudentLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isStudentLoading ? (
                      <span>Authenticating Credentials...</span>
                    ) : (
                      <>
                        <span>Login to Exam Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-blue-100 block">
                  Admin Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter admin email"
                  autoComplete="username"
                  className="w-full bg-[#08142b] border border-blue-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-blue-100 block">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    className="w-full bg-[#08142b] border border-blue-500/40 rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {adminError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
                >
                  <Shield className="w-4 h-4" />
                  <span>Login to Admin Dashboard</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
