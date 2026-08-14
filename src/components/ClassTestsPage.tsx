import React from 'react';
import { Test, Attempt, DraftAttempt } from '../types';
import { TestCard } from './TestCard';
import { FileText, ArrowLeft, RefreshCw } from 'lucide-react';

interface ClassTestsPageProps {
  classId: number | string;
  tests: Test[];
  studentAttemptsMap: Record<string, Attempt[]>;
  draftExam: DraftAttempt | null;
  isLoading?: boolean;
  onChangeClass: () => void;
  onStartTest: (test: Test, attemptNumber: number) => void;
  onContinueDraft?: () => void;
}

export const ClassTestsPage: React.FC<ClassTestsPageProps> = ({
  classId,
  tests,
  studentAttemptsMap,
  draftExam,
  isLoading = false,
  onChangeClass,
  onStartTest,
  onContinueDraft,
}) => {
  // Normalize classId for robust matching
  const classNumStr = String(classId).replace(/\D/g, '') || '6';
  const targetClassA = `Class ${classNumStr}`;
  const targetClassB = classNumStr;

  // Filter tests strictly by selected class
  const filteredTests = tests.filter((test) => {
    if (!test.class) return false;
    const testClassNum = String(test.class).replace(/\D/g, '');
    return (
      test.class === targetClassA ||
      test.class === targetClassB ||
      testClassNum === classNumStr
    );
  });

  return (
    <div className="tests-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-white">
      {/* Page Header */}
      <div className="bg-white border-2 border-[#16449B] rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[#16449B]">
        <div>
          <button
            onClick={onChangeClass}
            className="inline-flex items-center gap-1.5 text-xs text-[#16449B] hover:underline font-bold mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#16449B]" />
            <span>Select Different Class</span>
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#16449B] tracking-tight">
            Available Tests – Class {classNumStr}
          </h2>
          <p className="text-xs text-[#16449B]/80 font-medium mt-1">
            Showing all published test papers for Class {classNumStr}
          </p>
        </div>

        <button
          onClick={onChangeClass}
          className="bg-[#16449B] hover:bg-[#16449B]/90 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer self-start sm:self-auto"
        >
          Change Class ({`Class ${classNumStr}`})
        </button>
      </div>

      {/* Tests Grid */}
      {isLoading ? (
        <div className="text-center py-16 bg-white border-2 border-[#16449B] rounded-3xl">
          <RefreshCw className="w-10 h-10 text-[#16449B] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#16449B]">Loading Available Tests...</p>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="bg-white border-2 border-[#16449B] rounded-3xl p-12 text-center space-y-3 text-[#16449B]">
          <FileText className="w-12 h-12 text-[#16449B] mx-auto" />
          <h3 className="text-lg font-extrabold text-[#16449B]">No Tests Available for Class {classNumStr}</h3>
          <p className="text-xs text-[#16449B]/80 font-medium max-w-md mx-auto">
            There are currently no active test papers published for Class {classNumStr}. Please select another class or check back later.
          </p>
          <button
            onClick={onChangeClass}
            className="mt-2 bg-[#16449B] hover:bg-[#16449B]/90 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md cursor-pointer"
          >
            Select Another Class
          </button>
        </div>
      ) : (
        <div className="tests-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => {
            const attempts = studentAttemptsMap[test.id] || [];

            return (
              <TestCard
                key={test.id}
                test={test}
                attemptsCount={attempts.length}
                onStartTest={onStartTest}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
