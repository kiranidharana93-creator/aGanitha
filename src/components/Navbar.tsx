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
    <header className="bg-[#16449B] text-white shadow-md sticky top-0 z-40 min-h-[60px] flex items-center px-4 sm:px-6 py-2.5 border-b border-[#16449B]">
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="logo-container flex items-center gap-3">
          <div className="logo-icon w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <Calculator className="w-5 h-5 text-[#16449B]" />
          </div>
          <div>
            <h1 className="logo-title font-['Segoe_UI',Arial,sans-serif] text-lg sm:text-xl font-bold text-white leading-tight tracking-normal">
              CBSE Maths PORTAL
            </h1>
            <p className="logo-subtitle font-['Segoe_UI',Arial,sans-serif] text-[11px] sm:text-xs font-semibold text-white/90">
              Classes 6–10 | Tests | Progress | Admin
            </p>
          </div>
        </div>

        {/* User Badge & Actions */}
        {currentUser.role && (
          <div className="flex items-center space-x-3 self-end sm:self-auto">
            {currentUser.role === 'student' && currentUser.student && (
              <div className="hidden sm:flex items-center space-x-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-white">
                <GraduationCap className="w-3.5 h-3.5 text-white" />
                <span className="font-bold text-white">{currentUser.student.name}</span>
                <span className="text-white/60">•</span>
                <span className="bg-white/20 text-white font-extrabold px-2 py-0.5 rounded-full text-[11px]">
                  {currentUser.student.class}
                </span>
              </div>
            )}

            {currentUser.role === 'admin' && (
              <div className="flex items-center space-x-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-white">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span className="font-bold tracking-wide">ADMINISTRATOR</span>
              </div>
            )}

            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
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

