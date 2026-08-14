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
      <div className="bg-white border-2 border-[#16449B] rounded-3xl p-8 shadow-md text-center space-y-3 relative overflow-hidden text-[#16449B]">
        <div className="inline-flex items-center gap-2 bg-[#16449B] text-white text-xs px-3.5 py-1 rounded-full font-bold">
          <GraduationCap className="w-4 h-4 text-white" />
          <span>CBSE Mathematics Examination Portal</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#16449B] tracking-tight">
          Welcome, <span className="text-[#16449B] underline">{student.name}</span>
        </h2>

        <p className="text-sm text-[#16449B] max-w-lg mx-auto font-medium">
          Student ID: <strong className="text-[#16449B] font-mono">{student.studentId || student.id}</strong> • Select your class level below to view all available mathematics assessment test papers.
        </p>
      </div>

      {/* Select Your Class Card Section */}
      <div className="bg-[#FFFFFF] border border-[#D6E4FF] border-t-4 border-t-[#16449B] rounded-[14px] p-6 shadow-[0_2px_8px_rgba(22,68,155,0.08)] space-y-6 text-[#16449B]">
        <div className="flex items-center justify-between border-b border-[#D6E4FF] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#16449B] text-[#FFFFFF] rounded-[10px]">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#16449B]">Select Your Class</h3>
              <p className="text-xs text-[#16449B]/80 font-medium">Choose a class to access subject test papers and practice sets</p>
            </div>
          </div>

          <span className="text-xs bg-[#16449B] text-white px-3 py-1.5 rounded-[8px] font-bold hidden sm:inline-block">
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
                className={`class-card p-5 rounded-[14px] border border-[#D6E4FF] border-t-4 ${
                  isEnrolled ? 'border-t-[#DC2626] bg-[#16449B] text-white' : 'border-t-[#16449B] bg-[#FFFFFF] text-[#16449B] hover:bg-[#F8FBFF]'
                } font-bold text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative shadow-[0_2px_8px_rgba(22,68,155,0.08)] hover:scale-[1.03]`}
              >
                {isEnrolled && (
                  <span className="absolute -top-2.5 right-2 bg-[#DC2626] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" /> Enrolled
                  </span>
                )}

                <span className="text-2xl font-black tracking-tight">
                  Class {cls}
                </span>
                <span className="text-[11px] font-medium opacity-90">CBSE Maths</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
