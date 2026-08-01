export interface Student {
  id: string;
  name: string;
  class: string; // e.g., "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"
  createdAt?: string;
}

export interface Test {
  id: string;
  title: string;
  class: string;
  duration: number; // in minutes
  published: boolean;
  createdAt?: string;
  questionCount?: number;
}

export interface Question {
  id: string;
  testId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'optionA' | 'optionB' | 'optionC' | 'optionD';
  hint?: string;
}

export interface Attempt {
  id: string;
  studentId: string;
  testId: string;
  attemptNumber: number; // 1 or 2
  score: number;
  totalQuestions: number;
  submittedAt: string;
  // Denormalized/enriched metadata for fast display
  studentName?: string;
  studentClass?: string;
  testTitle?: string;
  answers?: Record<string, string>; // questionId -> selectedOption ('optionA'|'optionB'|'optionC'|'optionD')
}

export type UserRole = 'student' | 'admin' | null;

export interface CurrentUser {
  role: UserRole;
  student?: Student;
  adminEmail?: string;
}
