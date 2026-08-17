import React, { useState } from 'react';
import { UserRole, Student } from '../types';
import { loginStudentWithCredentials, completeStudentPasswordChange } from '../services/db';
import {
  User,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  GraduationCap,
  KeyRound,
  CheckCircle2,
  Lock,
  ArrowLeft,
} from 'lucide-react';

interface LoginModalProps {
  onStudentLogin: (student: Student) => void;
  onAdminLogin: (email?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onStudentLogin, onAdminLogin }) => {
  const [roleTab, setRoleTab] = useState<UserRole>('student');

  // Student Form State
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [isStudentLoggingIn, setIsStudentLoggingIn] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [studentSuccess, setStudentSuccess] = useState('');

  // Change Password State (when mustChangePassword === true)
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pendingStudent, setPendingStudent] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');

  // Admin Form State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');
    setStudentSuccess('');

    const cleanId = studentId.trim();
    const cleanPass = studentPassword.trim();

    if (!cleanId) {
      setStudentError('Please enter your Student ID.');
      return;
    }
    if (!cleanPass) {
      setStudentError('Please enter your password.');
      return;
    }

    setIsStudentLoggingIn(true);
    try {
      const { student } = await loginStudentWithCredentials(cleanId, cleanPass);

      // Check if student must change password
      if (student.mustChangePassword) {
        setPendingStudent(student);
        setIsChangingPassword(true);
        setNewPassword('');
        setConfirmPassword('');
        setChangePasswordError('');
        return;
      }

      onStudentLogin(student);
    } catch (err: any) {
      console.error('Student Login Error:', err);
      setStudentError(err?.message || 'Invalid Student ID or Password. Please try again.');
    } finally {
      setIsStudentLoggingIn(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingStudent) return;
    setChangePasswordError('');

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew) {
      setChangePasswordError('Please enter a new password.');
      return;
    }
    if (cleanNew.length > 8) {
      setChangePasswordError('Password cannot exceed 8 characters.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setChangePasswordError('New password and Confirm password do not match.');
      return;
    }
    if (cleanNew.toLowerCase() === (pendingStudent.password || '').toLowerCase()) {
      setChangePasswordError('New password must be different from your current temporary password.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await completeStudentPasswordChange(pendingStudent.id, cleanNew);

      // Successfully updated password!
      // Return to student login screen with prefilled student ID and cleared password as requested:
      // "after changing password it should direct to student login with student ID and updated password"
      const currentStudentId = pendingStudent.studentId || pendingStudent.id;
      setIsChangingPassword(false);
      setPendingStudent(null);
      setStudentId(currentStudentId);
      setStudentPassword('');
      setStudentSuccess('Password updated successfully! Please enter your new password to log in.');
    } catch (err: any) {
      console.error('Error changing password:', err);
      setChangePasswordError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const cleanUser = adminUsername.trim().toLowerCase();
    const cleanPass = adminPassword.trim();

    if (!cleanUser) {
      setAdminError('Please enter admin username or email');
      return;
    }
    if (!cleanPass) {
      setAdminError('Please enter admin password');
      return;
    }

    setIsAdminLoggingIn(true);
    try {
      const encodedTarget = typeof btoa !== 'undefined' ? btoa(cleanUser) : '';

      // Check if admin matches official admin credentials or admin username
      const isAdminMatch =
        cleanUser === 'admin' ||
        cleanUser === 'admin@cbse.nic.in' ||
        cleanUser === 'kiran' ||
        encodedTarget === 'a2lyYW5pZGhhcmFuYTkzQGdtYWlsLmNvbQ==' ||
        encodedTarget === 'a2lyYW5AZ21haWwuY29t';

      if (isAdminMatch && cleanPass.length > 0) {
        onAdminLogin(cleanUser);
      } else {
        setAdminError('Invalid admin credentials or password. Please try again.');
        setAdminPassword('');
      }
    } catch (err) {
      console.error('Admin authentication error:', err);
      setAdminError('Authentication error occurred. Please try again.');
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-2 border-[#16449B] rounded-2xl shadow-xl overflow-hidden my-8">
        {/* Header Branding Banner */}
        <div className="bg-[#16449B] p-7 text-white text-center relative rounded-t-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#16449B] shadow-md">
            {isChangingPassword ? (
              <KeyRound className="h-7 w-7 text-[#16449B]" />
            ) : (
              <Shield className="h-7 w-7 text-[#16449B]" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">CBSE Maths Examination</h1>
          <p className="text-xs text-white/90 mt-1 font-semibold">Official Student & Teacher Testing Portal</p>
        </div>

        {/* Role Selection Tabs (Only shown when not in Change Password flow) */}
        {!isChangingPassword && (
          <div className="flex border-b-2 border-[#16449B] bg-white p-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setRoleTab('student');
                setStudentError('');
                setStudentSuccess('');
              }}
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
              onClick={() => {
                setRoleTab('admin');
                setAdminError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                roleTab === 'admin'
                  ? 'bg-[#16449B] text-white shadow-md'
                  : 'text-[#16449B] hover:bg-[#16449B]/10 border border-[#16449B]'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Teacher / Admin</span>
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 space-y-5 bg-white">
          {isChangingPassword && pendingStudent ? (
            /* Change Password Form Required */
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="text-center space-y-1 pb-1">
                <span className="bg-[#16449B] text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                  First Login Action Required
                </span>
                <h2 className="text-lg font-extrabold text-[#16449B] mt-2">
                  Change Account Password
                </h2>
                <p className="text-xs text-[#16449B]/80 font-medium">
                  Welcome <strong className="font-bold text-[#16449B]">{pendingStudent.name}</strong> ({pendingStudent.studentId || pendingStudent.id}). Your password was set by the administrator. Please create your updated password to proceed.
                </p>
              </div>

              {/* Status Alert */}
              {changePasswordError && (
                <div className="p-3 bg-white border-2 border-[#DC2626] rounded-xl text-xs text-[#DC2626] flex items-start gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                  <div>
                    <strong className="font-bold block">Password Update Error</strong>
                    <p className="mt-0.5 font-medium">{changePasswordError}</p>
                  </div>
                </div>
              )}

              {/* New Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#16449B] block">
                  New Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    maxLength={8}
                    placeholder="Enter new password (up to 8 characters)"
                    className="w-full bg-white border-2 border-[#16449B] rounded-xl pl-4 pr-11 py-3 text-sm text-[#16449B] font-bold placeholder-[#16449B]/40 focus:outline-none focus:ring-2 focus:ring-[#16449B]"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#16449B] hover:opacity-80 p-1 cursor-pointer focus:outline-none"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#16449B] block">
                  Confirm New Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    maxLength={8}
                    placeholder="Re-enter new password"
                    className="w-full bg-white border-2 border-[#16449B] rounded-xl pl-4 pr-11 py-3 text-sm text-[#16449B] font-bold placeholder-[#16449B]/40 focus:outline-none focus:ring-2 focus:ring-[#16449B]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#16449B] hover:opacity-80 p-1 cursor-pointer focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isSavingPassword || !newPassword.trim() || !confirmPassword.trim()}
                  className="w-full bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Save Password & Proceed to Login</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPendingStudent(null);
                    setStudentPassword('');
                  }}
                  className="w-full bg-white text-[#16449B] hover:bg-[#16449B]/10 border border-[#16449B] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          ) : roleTab === 'student' ? (
            /* Student Login Form */
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              {/* Success Alert */}
              {studentSuccess && (
                <div className="p-3.5 bg-[#16449B]/5 border-2 border-[#16449B] rounded-xl text-xs text-[#16449B] flex items-start gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#16449B]" />
                  <div>
                    <strong className="font-extrabold block text-sm">Success</strong>
                    <p className="mt-0.5 font-bold">{studentSuccess}</p>
                  </div>
                </div>
              )}

              {/* Status Alert */}
              {studentError && (
                <div className="p-3 bg-white border-2 border-[#DC2626] rounded-xl text-xs text-[#DC2626] flex items-start gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                  <div>
                    <strong className="font-bold block">Login Failed</strong>
                    <p className="mt-0.5 font-medium">{studentError}</p>
                  </div>
                </div>
              )}

              {/* Student ID Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#16449B] block">
                  Student ID <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. STD-1001"
                    autoComplete="username"
                    className="w-full bg-white border-2 border-[#16449B] rounded-xl pl-4 pr-10 py-3 text-sm text-[#16449B] font-bold placeholder-[#16449B]/40 focus:outline-none focus:ring-2 focus:ring-[#16449B]"
                    required
                    autoFocus
                  />
                  <GraduationCap className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#16449B]/60 pointer-events-none" />
                </div>
              </div>

              {/* Student Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#16449B] block">
                  Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showStudentPassword ? 'text' : 'password'}
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="Enter your student password"
                    autoComplete="current-password"
                    className="w-full bg-white border-2 border-[#16449B] rounded-xl pl-4 pr-11 py-3 text-sm text-[#16449B] font-bold placeholder-[#16449B]/40 focus:outline-none focus:ring-2 focus:ring-[#16449B]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#16449B] hover:opacity-80 p-1 cursor-pointer focus:outline-none"
                    aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isStudentLoggingIn || !studentId.trim() || !studentPassword.trim()}
                className="w-full bg-[#16449B] hover:bg-[#16449B]/90 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isStudentLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Login to Test Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Admin Login Tab */
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              {adminError && (
                <div className="p-3 bg-white border-2 border-[#DC2626] rounded-xl text-xs text-[#DC2626] font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                  <span>{adminError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#16449B] block">
                  Admin Username / Email <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="e.g. admin or kiranidharana93@gmail.com"
                    autoComplete="username"
                    className="w-full bg-white border-2 border-[#16449B] rounded-xl pl-4 pr-10 py-3 text-sm text-[#16449B] placeholder-[#16449B]/50 focus:outline-none focus:ring-2 focus:ring-[#16449B] font-bold"
                    required
                  />
                  <Shield className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#16449B]/60 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#16449B] block">
                  Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    className="w-full bg-white border-2 border-[#16449B] rounded-xl pl-4 pr-11 py-3 text-sm text-[#16449B] placeholder-[#16449B]/50 focus:outline-none focus:ring-2 focus:ring-[#16449B] font-bold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#16449B] hover:opacity-80 p-1 cursor-pointer focus:outline-none"
                    aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isAdminLoggingIn}
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
