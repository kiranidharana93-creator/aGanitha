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
    <div className="min-h-[calc(100vh-4rem)] bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-2 border-[#16449B] rounded-2xl shadow-xl overflow-hidden my-8">
        {/* Header Branding Banner */}
        <div className="bg-[#16449B] p-7 text-white text-center relative rounded-t-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#16449B] shadow-md">
            <Shield className="h-7 w-7 text-[#16449B]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">CBSE Maths Examination</h1>
          <p className="text-xs text-white/90 mt-1 font-semibold">Official Student & Teacher Testing Portal</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex border-b-2 border-[#16449B] bg-white p-2 gap-2">
          <button
            type="button"
            onClick={() => setRoleTab('student')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              roleTab === 'student'
                ? 'bg-[#16449B] text-white shadow-md'
                : 'text-[#16449B] hover:bg-[#16449B]/10 border border-[#16449B]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Student Login</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleTab('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              roleTab === 'admin'
                ? 'bg-[#16449B] text-white shadow-md'
                : 'text-[#16449B] hover:bg-[#16449B]/10 border border-[#16449B]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Portal</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-6 bg-white">
          {roleTab === 'student' ? (
            <div className="space-y-5">
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#16449B] block">
                    Student ID <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      placeholder="e.g. c6-2026-0012"
                      className="w-full bg-white border-2 border-[#16449B] rounded-xl px-4 py-2.5 text-sm text-[#16449B] placeholder-[#16449B]/50 focus:outline-none focus:ring-2 focus:ring-[#16449B] uppercase tracking-wider font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#16449B] block">
                    Password <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showStudentPassword ? 'text' : 'password'}
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder="Enter student password"
                      className="w-full bg-white border-2 border-[#16449B] rounded-xl pl-4 pr-11 py-2.5 text-sm text-[#16449B] placeholder-[#16449B]/50 focus:outline-none focus:ring-2 focus:ring-[#16449B] font-bold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentPassword(!showStudentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#16449B] hover:opacity-80 p-1 cursor-pointer"
                      aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {studentError && (
                  <div className="p-3 bg-white border-2 border-[#DC2626] rounded-xl text-xs text-[#DC2626] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                    <div>
                      <strong className="font-bold block">Access Denied</strong>
                      <p className="mt-0.5 font-medium">{studentError}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isStudentLoading}
                    className="w-full bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                <label className="text-xs font-bold text-[#16449B] block">
                  Admin Email <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter admin email"
                  autoComplete="username"
                  className="w-full bg-white border-2 border-[#16449B] rounded-xl px-4 py-3 text-sm text-[#16449B] placeholder-[#16449B]/50 focus:outline-none focus:ring-2 focus:ring-[#16449B] font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#16449B] block">
                  Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    className="w-full bg-white border-2 border-[#16449B] rounded-xl pl-4 pr-11 py-3 text-sm text-[#16449B] placeholder-[#16449B]/50 focus:outline-none focus:ring-2 focus:ring-[#16449B] font-bold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#16449B] hover:opacity-80 p-1 cursor-pointer focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {adminError && (
                <div className="p-3 bg-white border-2 border-[#DC2626] rounded-xl text-xs text-[#DC2626] font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                  <span>{adminError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-white" />
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
