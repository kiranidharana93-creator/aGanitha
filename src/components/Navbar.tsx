import React from 'react';
import { CurrentUser } from '../types';
import { LogOut, ShieldCheck, GraduationCap, Calculator } from 'lucide-react';

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
    <header className="bg-[#16449B] text-white shadow-md sticky top-0 z-40 min-h-[92px] flex items-center px-[28px] py-4 border-b border-[#16449B]">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand */}
        <div className="logo-container flex items-center gap-[18px]">
          <div className="logo-icon w-[64px] h-[64px] bg-white rounded-[14px] flex items-center justify-center flex-shrink-0 shadow-sm">
            <Calculator className="w-9 h-9 text-[#16449B]" />
          </div>
          <div>
            <h1 className="logo-title font-['Segoe_UI',Arial,sans-serif] text-[28px] sm:text-[38px] font-bold text-white leading-none tracking-normal">
              CBSE Maths PORTAL
            </h1>
            <p className="logo-subtitle mt-[6px] font-['Segoe_UI',Arial,sans-serif] text-[13px] sm:text-[15px] font-semibold text-white opacity-95">
              Classes 6–10 | Tests | Progress | Admin
            </p>
          </div>
        </div>

        {/* User Badge & Actions */}
        {currentUser.role && (
          <div className="flex items-center space-x-4 self-end md:self-auto">
            {currentUser.role === 'student' && currentUser.student && (
              <div className="hidden sm:flex items-center space-x-2 bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-xs text-white">
                <GraduationCap className="w-4 h-4 text-white" />
                <span className="font-bold text-white">{currentUser.student.name}</span>
                <span className="text-white/60">•</span>
                <span className="bg-white/20 text-white font-extrabold px-2.5 py-0.5 rounded-full">
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

