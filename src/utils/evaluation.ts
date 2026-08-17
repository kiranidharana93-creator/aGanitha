import { Question } from '../types';

/**
 * Intelligent evaluation for student short answers / fill-in-the-blank questions
 */
export function evaluateShortAnswer(userAns: string | undefined | null, correctAns: string | undefined | null): boolean {
  if (userAns === undefined || userAns === null) return false;
  if (correctAns === undefined || correctAns === null) return false;

  const user = String(userAns).trim().toLowerCase();
  const correct = String(correctAns).trim().toLowerCase();

  if (!user && !correct) return true;
  if (!user || !correct) return false;

  // Direct exact match
  if (user === correct) return true;

  // 1. Alphanumeric normalized equality (ignoring punctuation & spaces)
  const normUser = user.replace(/[^a-z0-9]/g, '');
  const normCorr = correct.replace(/[^a-z0-9]/g, '');
  if (normUser && normCorr && normUser === normCorr) return true;

  // 2. Number sets comparison (e.g. factors "1, 2, 3, 4, 6, 8, 12, 24" or multiples "5, 10, 15, 20, 25")
  const corrNums = correct.match(/-?\d+(?:\.\d+)?/g);
  const userNums = user.match(/-?\d+(?:\.\d+)?/g);

  if (corrNums && userNums && corrNums.length > 0 && userNums.length > 0) {
    if (corrNums.length === userNums.length) {
      const sortedCorr = [...corrNums].map(Number).sort((a, b) => a - b).join(',');
      const sortedUser = [...userNums].map(Number).sort((a, b) => a - b).join(',');
      if (sortedCorr === sortedUser) return true;
    }
  }

  // 3. True / False normalization
  const isCorrectTrue = correct === 'true' || correct === 't' || correct === 'yes';
  const isCorrectFalse = correct === 'false' || correct === 'f' || correct === 'no';
  if (isCorrectTrue || isCorrectFalse) {
    const isUserTrue = user === 'true' || user === 't' || user === 'yes';
    const isUserFalse = user === 'false' || user === 'f' || user === 'no';
    if (isCorrectTrue && isUserTrue) return true;
    if (isCorrectFalse && isUserFalse) return true;
  }

  // 4. Fractions normalization (e.g. "3/4" vs "3 / 4")
  const normFraction = (str: string) => str.replace(/\s*\/\s*/g, '/').replace(/\s+/g, '');
  if (normFraction(user) === normFraction(correct)) return true;

  // 5. Unit stripping (e.g., "12 cm" vs "12" or "12cm" vs "12 cm")
  const stripUnits = (str: string) =>
    str
      .replace(/\b(cm|m|km|mm|sq\s*cm|cm²|cm2|m²|m2|units|sq\s*units|degrees?|°|rupees?|rs\.?|₹)\b/gi, '')
      .replace(/[^a-z0-9\.\/-]/g, '')
      .trim();

  const unitStrippedUser = stripUnits(user);
  const unitStrippedCorr = stripUnits(correct);
  if (unitStrippedUser && unitStrippedCorr && unitStrippedUser === unitStrippedCorr) {
    return true;
  }

  // 6. Substring containment for descriptive mathematical terms if difference is small
  if (normUser && normCorr && (normUser.includes(normCorr) || normCorr.includes(normUser))) {
    if (Math.abs(normUser.length - normCorr.length) <= 4) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes an answer option key case-insensitively
 */
export function normalizeOptionKey(ans: string | undefined | null): 'optionA' | 'optionB' | 'optionC' | 'optionD' | null {
  if (!ans) return null;
  const clean = String(ans).trim().toLowerCase();
  if (clean === 'a' || clean === 'optiona' || clean === 'option a' || clean === 'opt a' || clean === '(a)' || clean === 'a.' || clean === 'a)') return 'optionA';
  if (clean === 'b' || clean === 'optionb' || clean === 'option b' || clean === 'opt b' || clean === '(b)' || clean === 'b.' || clean === 'b)') return 'optionB';
  if (clean === 'c' || clean === 'optionc' || clean === 'option c' || clean === 'opt c' || clean === '(c)' || clean === 'c.' || clean === 'c)') return 'optionC';
  if (clean === 'd' || clean === 'optiond' || clean === 'option d' || clean === 'opt d' || clean === '(d)' || clean === 'd.' || clean === 'd)') return 'optionD';
  return null;
}

/**
 * Resolves a given raw answer to an option key (optionA-D) using key aliases or matching option text
 */
export function getCanonicalOption(raw: string | undefined | null, q: Question): 'optionA' | 'optionB' | 'optionC' | 'optionD' | null {
  if (!raw) return null;
  const directKey = normalizeOptionKey(raw);
  if (directKey) return directKey;

  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  // Match against option text values
  if (q.optionA && evaluateShortAnswer(trimmed, q.optionA)) return 'optionA';
  if (q.optionB && evaluateShortAnswer(trimmed, q.optionB)) return 'optionB';
  if (q.optionC && evaluateShortAnswer(trimmed, q.optionC)) return 'optionC';
  if (q.optionD && evaluateShortAnswer(trimmed, q.optionD)) return 'optionD';

  return null;
}

/**
 * Accurately determines if the student answer matches the question's correct answer
 */
export function isQuestionCorrect(studentAnswer: string | undefined | null, q: Question): boolean {
  if (studentAnswer === undefined || studentAnswer === null) return false;
  const userTrimmed = String(studentAnswer).trim();
  if (!userTrimmed) return false;

  const corrTrimmed = String(q.correctAnswer || '').trim();
  if (!corrTrimmed) return false;

  const isMcq = Boolean(q.optionA || q.optionB || q.optionC || q.optionD);

  if (isMcq) {
    const userOpt = getCanonicalOption(userTrimmed, q);
    const corrOpt = getCanonicalOption(corrTrimmed, q);

    // If both resolve to option keys (e.g. 'optionB' === 'optionB')
    if (userOpt && corrOpt) {
      return userOpt === corrOpt;
    }

    // If student selected option key but correctAnswer is text
    if (userOpt) {
      const userOptText = (q as any)[userOpt];
      if (userOptText && evaluateShortAnswer(userOptText, corrTrimmed)) {
        return true;
      }
    }

    // If correctAnswer is option key but student entered text
    if (corrOpt) {
      const corrOptText = (q as any)[corrOpt];
      if (corrOptText && evaluateShortAnswer(userTrimmed, corrOptText)) {
        return true;
      }
    }

    // Fallback direct text comparison
    return evaluateShortAnswer(userTrimmed, corrTrimmed);
  }

  // Non-MCQ / short answer
  return evaluateShortAnswer(userTrimmed, corrTrimmed);
}

export interface QuestionResultItem {
  questionId: string;
  status: 'correct' | 'wrong' | 'unanswered';
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface TestResultSummary {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  totalMarks: number;
  percentage: number;
  questionResults: Record<string, QuestionResultItem>;
}

/**
 * Calculates complete test results accurately:
 * - correctCount + wrongCount + unansweredCount === totalQuestions
 * - score === correctCount
 * - percentage === (score / totalQuestions) * 100
 */
export function calculateTestResults(
  questions: Question[],
  selectedAnswers: Record<string, string>
): TestResultSummary {
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  const questionResults: Record<string, QuestionResultItem> = {};

  questions.forEach((q) => {
    const rawAnswer = selectedAnswers[q.id];
    const isUnanswered = rawAnswer === undefined || rawAnswer === null || String(rawAnswer).trim() === '';

    if (isUnanswered) {
      unansweredCount++;
      questionResults[q.id] = {
        questionId: q.id,
        status: 'unanswered',
        studentAnswer: '',
        correctAnswer: q.correctAnswer || '',
        isCorrect: false,
      };
    } else {
      const isCorrect = isQuestionCorrect(rawAnswer, q);
      if (isCorrect) {
        correctCount++;
        questionResults[q.id] = {
          questionId: q.id,
          status: 'correct',
          studentAnswer: String(rawAnswer).trim(),
          correctAnswer: q.correctAnswer || '',
          isCorrect: true,
        };
      } else {
        wrongCount++;
        questionResults[q.id] = {
          questionId: q.id,
          status: 'wrong',
          studentAnswer: String(rawAnswer).trim(),
          correctAnswer: q.correctAnswer || '',
          isCorrect: false,
        };
      }
    }
  });

  const totalQuestions = questions.length;
  const totalMarks = totalQuestions;
  const score = correctCount;
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const answeredCount = correctCount + wrongCount;

  return {
    totalQuestions,
    answeredCount,
    unansweredCount,
    correctCount,
    wrongCount,
    score,
    totalMarks,
    percentage,
    questionResults,
  };
}
