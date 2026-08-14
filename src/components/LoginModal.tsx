import React, { useState } from 'react';
import { UserRole, Student } from '../types';
import { signInStudentWithGoogle } from '../services/db';
import { User, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { CompleteProfilePage } from './CompleteProfilePage';

interface LoginModalProps {
  onStudentLogin: (student: Student) => void;
  onAdminLogin: (email?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onStudentLogin, onAdminLogin }) => {
  const [roleTab, setRoleTab] = useState<UserRole>('student');

  // Google Student Auth State
  const [studentError, setStudentError] = useState('');
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [pendingProfileStudent, setPendingProfileStudent] = useState<Student | null>(null);

  // Admin Form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleGoogleLogin = async () => {
    setStudentError('');
    setIsStudentLoading(true);

    try {
      const { student, needsProfileCompletion } = await signInStudentWithGoogle();
      if (needsProfileCompletion || !student.class) {
        setPendingProfileStudent(student);
      } else {
        onStudentLogin(student);
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setStudentError(err?.message || 'Unable to sign in with Google. Please try again.');
    } finally {
      setIsStudentLoading(false);
    }
  };

  const handleProfileCompleted = (updatedStudent: Student) => {
    setPendingProfileStudent(null);
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

  if (pendingProfileStudent) {
    return (
      <CompleteProfilePage
        student={pendingProfileStudent}
        onProfileCompleted={handleProfileCompleted}
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
            <div className="space-y-6 text-center py-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#16449B]">Welcome to CBSE Maths Portal</h2>
                <p className="text-xs font-semibold text-[#16449B]/80 mt-1">
                  Sign in with your Gmail account to take practice tests and track progress.
                </p>
              </div>

              {studentError && (
                <div className="p-3 bg-white border-2 border-[#DC2626] rounded-xl text-xs text-[#DC2626] flex items-start gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                  <div>
                    <strong className="font-bold block">Sign In Failed</strong>
                    <p className="mt-0.5 font-medium">{studentError}</p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isStudentLoading}
                className="w-full bg-white hover:bg-slate-50 text-[#16449B] border-2 border-[#16449B] font-extrabold py-3.5 px-5 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {isStudentLoading ? (
                  <span>Connecting to Google...</span>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
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

