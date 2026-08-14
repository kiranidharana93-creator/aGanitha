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
    <header className="bg-[#0B3D91] text-white shadow-md sticky top-0 z-40 h-[72px] flex items-center border-b border-[#2563EB]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#0B3D91] shadow-inner font-bold">
            <Calculator className="w-6 h-6 text-[#0B3D91]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              CBSE Maths <span className="bg-[#2563EB] text-white text-xs px-2 py-0.5 rounded font-extrabold tracking-wide">PORTAL</span>
            </h1>
            <p className="text-xs text-blue-100 font-medium">Classes 6–10 | Tests | Progress | Admin</p>
          </div>
        </div>

        {/* User Badge & Actions */}
        {currentUser.role && (
          <div className="flex items-center space-x-4">
            {currentUser.role === 'student' && currentUser.student && (
              <div className="hidden sm:flex items-center space-x-2 bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-xs text-white">
                <GraduationCap className="w-4 h-4 text-white" />
                <span className="font-bold text-white">{currentUser.student.name}</span>
                <span className="text-white/60">•</span>
                <span className="bg-[#2563EB] text-white font-extrabold px-2.5 py-0.5 rounded-full">
                  {currentUser.student.class}
                </span>
              </div>
            )}

            {currentUser.role === 'admin' && (
              <div className="flex items-center space-x-2 bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-xs text-white">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span className="font-bold tracking-wide">ADMINISTRATOR</span>
              </div>
            )}

            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
