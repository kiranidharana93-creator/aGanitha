import React, { useState } from 'react';
import { UserRole, Student } from '../types';
import { getOrCreateStudent } from '../services/db';
import { User, Shield, GraduationCap, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';

interface LoginModalProps {
  onStudentLogin: (student: Student) => void;
  onAdminLogin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onStudentLogin, onAdminLogin }) => {
  const [roleTab, setRoleTab] = useState<UserRole>('student');

  // Student Form state
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('Class 6');
  const [customClass, setCustomClass] = useState('');
  const [studentError, setStudentError] = useState('');
  const [isStudentLoading, setIsStudentLoading] = useState(false);

  // Admin Form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  const classOptions = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Other'];

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setStudentError('Please enter your full name');
      return;
    }

    const finalClass = studentClass === 'Other' ? (customClass.trim() || 'Class 6') : studentClass;

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
    if (adminEmail.trim().toLowerCase() === 'admin@cbsemaths.com' && adminPassword === 'admin123') {
      setAdminError('');
      onAdminLogin();
    } else {
      setAdminError('Invalid credentials! Admin Email: admin@cbsemaths.com / Password: admin123');
    }
  };

  const fillDemoAdmin = () => {
    setAdminEmail('admin@cbsemaths.com');
    setAdminPassword('admin123');
    setAdminError('');
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

              {studentClass === 'Other' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Specify Class</label>
                  <input
                    type="text"
                    value={customClass}
                    onChange={(e) => setCustomClass(e.target.value)}
                    placeholder="e.g. Class 8"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

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
                  placeholder="admin@cbsemaths.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="admin123"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
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

              {/* Demo Fill Quick Action */}
              <div className="bg-indigo-950/40 border border-indigo-800/40 p-3 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-indigo-300 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> Default Credentials:
                  </p>
                  <p className="text-slate-400 mt-0.5">admin@cbsemaths.com / admin123</p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Auto Fill
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
