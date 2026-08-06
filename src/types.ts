export interface Student {
  id: string;
  studentId?: string; // Generated ID e.g., "c6-2026-0012"
  name: string;
  class: string; // e.g., "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"
  section?: string; // e.g., "A", "B"
  rollNumber?: string | number; // e.g., 23
  parentMobile?: string; // Required for parent notifications
  password?: string; // Temporary or updated password
  isPasswordChanged?: boolean; // Force change on first login
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface DraftAttempt {
  studentId: string;
  testId: string;
  testTitle: string;
  testClass: string;
  currentIndex: number;
  selectedAnswers: Record<string, string>;
  timeLeft: number;
  status?: 'in-progress' | 'completed';
  submitted?: boolean;
  updatedAt: string;
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
  orderIndex?: number;
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
