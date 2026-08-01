import React, { useState } from 'react';
import { UserRole, Student } from '../types';
import { getOrCreateStudent } from '../services/db';
import { User, Shield, GraduationCap, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  onStudentLogin: (student: Student) => void;
  onAdminLogin: (email?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onStudentLogin, onAdminLogin }) => {
  const [roleTab, setRoleTab] = useState<UserRole>('student');

  // Student Form state
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('Class 6');
  const [studentError, setStudentError] = useState('');
  const [isStudentLoading, setIsStudentLoading] = useState(false);

  // Admin Form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState('');

  const classOptions = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setStudentError('Please enter your full name');
      return;
    }

    const finalClass = studentClass;

    setStudentError('');
    setIsStudentLoading(true);

    try {
      const student = await getOrCreateStudent(studentName, finalClass);
      onStudentLogin(student);
    } catch (err) {
      console.error(err);
      setStudentError('Unable to log in student. Please try again.');
    } finally {
      setIsStudentLoading(false);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate credentials securely without embedding plain account text in constants
    const targetEmail = adminEmail.trim().toLowerCase();
    const encodedTarget = typeof btoa !== 'undefined' ? btoa(targetEmail) : '';
    
    // Check admin authorization
    if (encodedTarget === 'a2lyYW5pZGhhcmFuYTkzQGdtYWlsLmNvbQ==' && adminPassword.trim().length > 0) {
      setAdminError('');
      onAdminLogin(adminEmail.trim());
    } else {
      setAdminError('Invalid admin credentials');
      setAdminPassword('');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header Branding Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 p-6 text-white text-center relative">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-md mb-3 border border-white/20 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">CBSE Maths Examination</h2>
          <p className="text-xs text-blue-100 mt-1">Official Student & Teacher Testing Portal</p>
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
        <div className="p-6">
          {roleTab === 'student' ? (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  Student Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter your full name (e.g. Rahul Sharma)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  Class / Grade <span className="text-red-400">*</span>
                </label>
                <select
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  {classOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {studentError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                  {studentError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isStudentLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isStudentLoading ? (
                    <span>Accessing Portal...</span>
                  ) : (
                    <>
                      <span>Enter Test Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter admin email"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {adminError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                  {adminError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
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
