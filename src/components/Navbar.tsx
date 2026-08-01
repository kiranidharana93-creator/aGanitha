import React from 'react';
import { CurrentUser } from '../types';
import { LogOut, ShieldCheck, UserCheck, GraduationCap, Calculator } from 'lucide-react';

interface NavbarProps {
  currentUser: CurrentUser;
  onLogout: () => void;
  activeView: 'dashboard' | 'admin' | 'test';
  setActiveView: (view: 'dashboard' | 'admin' | 'test') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
}) => {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-inner font-bold">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              CBSE Maths <span className="bg-blue-600 text-xs px-2 py-0.5 rounded font-medium tracking-wide">PORTAL</span>
            </h1>
            <p className="text-xs text-slate-400">Online Examination & Assessment System</p>
          </div>
        </div>

        {/* User Badge & Actions */}
        {currentUser.role && (
          <div className="flex items-center space-x-4">
            {currentUser.role === 'student' && currentUser.student && (
              <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 rounded-full px-3.5 py-1.5 text-xs text-slate-200">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-white">{currentUser.student.name}</span>
                <span className="text-slate-500">•</span>
                <span className="bg-blue-500/20 text-blue-300 font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
                  {currentUser.student.class}
                </span>
              </div>
            )}

            {currentUser.role === 'admin' && (
              <div className="flex items-center space-x-2 bg-indigo-950/80 border border-indigo-700/60 rounded-full px-3.5 py-1.5 text-xs text-indigo-200">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span className="font-bold tracking-wide">ADMINISTRATOR</span>
              </div>
            )}

            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
