import React from 'react';
import { Student } from '../types';
import { BookOpen, GraduationCap, CheckCircle2 } from 'lucide-react';

interface SelectClassPageProps {
  student: Student;
  onClassSelect: (selectedClassNumber: number | string) => void;
}

export const SelectClassPage: React.FC<SelectClassPageProps> = ({
  student,
  onClassSelect,
}) => {
  const classes = [6, 7, 8, 9, 10];

  const handleSelect = (cls: number) => {
    localStorage.setItem('selectedClass', cls.toString());
    onClassSelect(cls);
  };

  // Get enrolled class number if exists
  const enrolledNum = student.class ? parseInt(student.class.replace(/\D/g, ''), 10) : 6;

  return (
    <div className="class-selection-page max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-3 relative overflow-hidden">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3.5 py-1 rounded-full font-bold">
          <GraduationCap className="w-4 h-4 text-blue-400" />
          <span>CBSE Mathematics Examination Portal</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Welcome, <span className="text-blue-400">{student.name}</span>
        </h2>

        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Student ID: <strong className="text-blue-300 font-mono">{student.studentId || student.id}</strong> • Select your class level below to view all available mathematics assessment test papers.
        </p>
      </div>

      {/* Select Your Class Card Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-2xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Select Your Class</h3>
              <p className="text-xs text-slate-400">Choose a class to access subject test papers and practice sets</p>
            </div>
          </div>

          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 font-semibold hidden sm:inline-block">
            Enrolled: <strong className="text-blue-400">{student.class || 'Class 6'}</strong>
          </span>
        </div>

        {/* Class Grid */}
        <div className="class-grid grid grid-cols-2 sm:grid-cols-5 gap-4">
          {classes.map((cls) => {
            const isEnrolled = enrolledNum === cls;

            return (
              <button
                key={cls}
                onClick={() => handleSelect(cls)}
                className={`class-card p-6 rounded-2xl border font-bold text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group relative hover:scale-[1.03] ${
                  isEnrolled
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-400 text-white shadow-xl ring-2 ring-blue-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/80 shadow-md'
                }`}
              >
                {isEnrolled && (
                  <span className="absolute -top-2.5 right-3 bg-emerald-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Enrolled
                  </span>
                )}

                <span className="text-2xl font-black tracking-tight group-hover:text-blue-300 transition-colors">
                  Class {cls}
                </span>
                <span className="text-[11px] font-medium opacity-70">CBSE Maths</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
