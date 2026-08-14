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
    <div className="class-selection-page max-w-4xl mx-auto px-4 py-12 space-y-8 bg-white">
      {/* Welcome Banner */}
      <div className="bg-white border-2 border-[#0052CC] rounded-3xl p-8 shadow-md text-center space-y-3 relative overflow-hidden text-[#0052CC]">
        <div className="inline-flex items-center gap-2 bg-[#0052CC] text-white text-xs px-3.5 py-1 rounded-full font-bold">
          <GraduationCap className="w-4 h-4 text-white" />
          <span>CBSE Mathematics Examination Portal</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0052CC] tracking-tight">
          Welcome, <span className="text-[#0052CC] underline">{student.name}</span>
        </h2>

        <p className="text-sm text-[#0052CC] max-w-lg mx-auto font-medium">
          Student ID: <strong className="text-[#0052CC] font-mono">{student.studentId || student.id}</strong> • Select your class level below to view all available mathematics assessment test papers.
        </p>
      </div>

      {/* Select Your Class Card Section */}
      <div className="bg-white border-2 border-[#0052CC] rounded-3xl p-8 shadow-md space-y-6 text-[#0052CC]">
        <div className="flex items-center justify-between border-b-2 border-[#0052CC]/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#0052CC] text-white rounded-2xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#0052CC]">Select Your Class</h3>
              <p className="text-xs text-[#0052CC]/80 font-medium">Choose a class to access subject test papers and practice sets</p>
            </div>
          </div>

          <span className="text-xs bg-[#0052CC] text-white px-3 py-1.5 rounded-xl font-bold hidden sm:inline-block">
            Enrolled: {student.class || 'Class 6'}
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
                className={`class-card p-6 rounded-2xl border-2 font-bold text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative hover:scale-[1.03] ${
                  isEnrolled
                    ? 'bg-[#0052CC] border-[#0052CC] text-white shadow-md'
                    : 'bg-white border-[#0052CC] text-[#0052CC] hover:bg-[#0052CC] hover:text-white shadow-sm'
                }`}
              >
                {isEnrolled && (
                  <span className="absolute -top-2.5 right-3 bg-white text-[#0052CC] border border-[#0052CC] text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-2.5 h-2.5 text-[#0052CC]" /> Enrolled
                  </span>
                )}

                <span className="text-2xl font-black tracking-tight">
                  Class {cls}
                </span>
                <span className="text-[11px] font-medium">CBSE Maths</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
