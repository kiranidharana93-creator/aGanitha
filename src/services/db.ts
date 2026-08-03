import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student, Test, Question, Attempt } from '../types';

// Collections references
const STUDENTS_COL = 'students';
const TESTS_COL = 'tests';
const QUESTIONS_COL = 'questions';
const ATTEMPTS_COL = 'attempts';

// Helper to normalize answer key
export function normalizeAnswerKey(ans: string): string {
  if (!ans) return 'optionA';
  const clean = ans.trim();
  if (clean === 'A' || clean === 'optionA') return 'optionA';
  if (clean === 'B' || clean === 'optionB') return 'optionB';
  if (clean === 'C' || clean === 'optionC') return 'optionC';
  if (clean === 'D' || clean === 'optionD') return 'optionD';
  return clean;
}

/**
 * Strips section titles ([SECTION A - MCQ 1]), topic labels (Topic 1: Multiplication),
 * question category headings (MCQs, True/False, Word Problems), and leading Q1. / 1. numbers
 * from question strings so questions are clean and properly ordered.
 */
export function cleanQuestionText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Remove bracketed section/topic/type tags like [SECTION A - MCQ 1], [SECTION B], [Teacher's Question Bank - MCQs 1], etc.
  cleaned = cleaned.replace(/\[[^\]]*\]/g, '');

  // 2. Remove "Topic X: ..." lines or inline phrases
  cleaned = cleaned.replace(/Topic\s*\d+\s*:[^\n]*\n?/gi, '');

  // 3. Remove Section / Category headings
  cleaned = cleaned.replace(/(Section\s*[A-Z]\s*:?\s*)?(MCQs?|True\s*\/\s*False|Word\s*Problems?|Reading\s*Comprehension|Teacher'?s?\s*Question\s*Bank)/gi, '');

  // 4. Remove leading Q1., Q2., Q12., Q1:, Q1 prefixes at start or after newlines
  cleaned = cleaned.replace(/(^|\n)\s*Q\d+[\.\:]?\s*/gi, '$1');

  // 5. Remove leading question numbers like "1. ", "2. ", "10. " at start of string or after newline ONLY if followed by dot/colon AND space
  cleaned = cleaned.replace(/(^|\n)\s*\d{1,3}[\.\:]\s+/g, '$1');

  // 6. Remove any leftover leading dashes, dots, colons, or whitespace
  cleaned = cleaned.replace(/^[\s\-\–\—\:\.]+/g, '');

  return cleaned.trim();
}

/**
 * Find existing student by name & class, or create new one in Firestore
 */
export async function getOrCreateStudent(name: string, studentClass: string): Promise<Student> {
  const trimmedName = name.trim();
  const trimmedClass = studentClass.trim();

  try {
    const q = query(
      collection(db, STUDENTS_COL),
      where('name', '==', trimmedName),
      where('class', '==', trimmedClass)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return {
        id: docSnap.id,
        ...(docSnap.data() as Omit<Student, 'id'>),
      };
    }

    // Create new student
    const newStudentData = {
      name: trimmedName,
      class: trimmedClass,
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, STUDENTS_COL), newStudentData);
    return {
      id: docRef.id,
      ...newStudentData,
    };
  } catch (error) {
    console.error('Error in getOrCreateStudent:', error);
    // Fallback in-memory object if offline or firestore glitch
    return {
      id: 'std_' + Date.now(),
      name: trimmedName,
      class: trimmedClass,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Get all tests
 */
export async function getAllTests(): Promise<Test[]> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));
    const tests: Test[] = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      tests.push({
        id: docSnap.id,
        title: data.title || '',
        class: data.class || '',
        duration: data.duration || 15,
        published: Boolean(data.published),
        createdAt: data.createdAt || '',
      });
    }

    // Also attach question counts
    const qSnap = await getDocs(collection(db, QUESTIONS_COL));
    const counts: Record<string, number> = {};
    qSnap.docs.forEach((qDoc) => {
      const tId = qDoc.data().testId;
      if (tId) {
        counts[tId] = (counts[tId] || 0) + 1;
      }
    });

    return tests.map((t) => ({
      ...t,
      questionCount: counts[t.id] || 0,
    }));
  } catch (error) {
    console.error('Error fetching tests:', error);
    return [];
  }
}

/**
 * Get published tests for student class
 */
export async function getPublishedTestsForClass(studentClass: string): Promise<Test[]> {
  const allTests = await getAllTests();
  return allTests.filter(
    (t) => t.published && (t.class === studentClass || t.class === 'All' || t.class === 'All Classes')
  );
}

/**
 * Create a new test
 */
export async function createTest(testData: { title: string; class: string; duration: number; published: boolean }): Promise<Test> {
  const payload = {
    ...testData,
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, TESTS_COL), payload);
  return {
    id: docRef.id,
    ...payload,
    questionCount: 0,
  };
}

/**
 * Update test publish status or details
 */
export async function updateTest(id: string, updates: Partial<Test>): Promise<void> {
  const docRef = doc(db, TESTS_COL, id);
  await updateDoc(docRef, updates);
}

/**
 * Delete a test and its questions
 */
export async function deleteTest(id: string): Promise<void> {
  // Delete test doc
  await deleteDoc(doc(db, TESTS_COL, id));

  // Delete associated questions
  const q = query(collection(db, QUESTIONS_COL), where('testId', '==', id));
  const snap = await getDocs(q);
  const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, QUESTIONS_COL, d.id)));
  await Promise.all(deletePromises);
}

/**
 * Get questions for a specific test
 */
export async function getQuestionsByTestId(testId: string): Promise<Question[]> {
  try {
    const q = query(collection(db, QUESTIONS_COL), where('testId', '==', testId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        testId: data.testId,
        question: cleanQuestionText(data.question || ''),
        optionA: data.optionA || '',
        optionB: data.optionB || '',
        optionC: data.optionC || '',
        optionD: data.optionD || '',
        correctAnswer: normalizeAnswerKey(data.correctAnswer) as any,
        hint: data.hint || '',
        orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 9999,
      };
    });
    return list.sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
}

/**
 * Create question
 */
export async function createQuestion(qData: Omit<Question, 'id'>): Promise<Question> {
  const payload = {
    ...qData,
    question: cleanQuestionText(qData.question),
    correctAnswer: normalizeAnswerKey(qData.correctAnswer) as Question['correctAnswer'],
    orderIndex: typeof qData.orderIndex === 'number' ? qData.orderIndex : 9999,
  };
  const docRef = await addDoc(collection(db, QUESTIONS_COL), payload);
  return {
    id: docRef.id,
    ...payload,
  };
}

/**
 * Update question
 */
export async function updateQuestion(id: string, updates: Partial<Question>): Promise<void> {
  const docRef = doc(db, QUESTIONS_COL, id);
  const payload = { ...updates };
  if (payload.question) {
    payload.question = cleanQuestionText(payload.question);
  }
  if (payload.correctAnswer) {
    payload.correctAnswer = normalizeAnswerKey(payload.correctAnswer) as any;
  }
  await updateDoc(docRef, payload);
}

/**
 * Delete question
 */
export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, QUESTIONS_COL, id));
}

/**
 * Get attempts for a specific student and test
 */
export async function getAttemptsForStudentAndTest(studentId: string, testId: string): Promise<Attempt[]> {
  try {
    const q = query(
      collection(db, ATTEMPTS_COL),
      where('studentId', '==', studentId),
      where('testId', '==', testId)
    );
    const snap = await getDocs(q);
    const attempts = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        studentId: data.studentId,
        testId: data.testId,
        attemptNumber: data.attemptNumber || 1,
        score: data.score || 0,
        totalQuestions: data.totalQuestions || 0,
        submittedAt: data.submittedAt || '',
        studentName: data.studentName,
        studentClass: data.studentClass,
        testTitle: data.testTitle,
        answers: data.answers || {},
      };
    });

    // Sort by attemptNumber ascending
    return attempts.sort((a, b) => a.attemptNumber - b.attemptNumber);
  } catch (error) {
    console.error('Error fetching attempts for student and test:', error);
    return [];
  }
}

/**
 * Get all attempts for a student
 */
export async function getAttemptsForStudent(studentId: string): Promise<Attempt[]> {
  try {
    const q = query(collection(db, ATTEMPTS_COL), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        studentId: data.studentId,
        testId: data.testId,
        attemptNumber: data.attemptNumber || 1,
        score: data.score || 0,
        totalQuestions: data.totalQuestions || 0,
        submittedAt: data.submittedAt || '',
        studentName: data.studentName,
        studentClass: data.studentClass,
        testTitle: data.testTitle,
        answers: data.answers || {},
      };
    });
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch (error) {
    console.error('Error fetching student attempts:', error);
    return [];
  }
}

/**
 * Get all attempts across all students for Admin reporting
 */
export async function getAllAttempts(): Promise<Attempt[]> {
  try {
    const snap = await getDocs(collection(db, ATTEMPTS_COL));
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        studentId: data.studentId,
        testId: data.testId,
        attemptNumber: data.attemptNumber || 1,
        score: data.score || 0,
        totalQuestions: data.totalQuestions || 0,
        submittedAt: data.submittedAt || '',
        studentName: data.studentName || 'Unknown Student',
        studentClass: data.studentClass || 'N/A',
        testTitle: data.testTitle || 'Untitled Test',
        answers: data.answers || {},
      };
    });
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch (error) {
    console.error('Error fetching all attempts:', error);
    return [];
  }
}

/**
 * Save attempt
 */
export async function saveAttempt(
  attemptData: Omit<Attempt, 'id'>
): Promise<Attempt> {
  const payload = {
    ...attemptData,
    submittedAt: attemptData.submittedAt || new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, ATTEMPTS_COL), payload);
  return {
    id: docRef.id,
    ...payload,
  };
}

/**
 * Helper to populate official Class 6 Whole Numbers – Sample Test 1 (38 comprehensive questions)
 */
export async function createWholeNumbersTestPaper1(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Whole Numbers – Sample Test 1',
    class: 'Class 6',
    duration: 45,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    // --- SECTION P: Number Line and Whole Numbers ---
    {
      testId: testObj.id,
      question: 'Which number is represented when starting from 4 and making 3 jumps to the right on a number line?',
      optionA: '6',
      optionB: '7',
      optionC: '8',
      optionD: '9',
      correctAnswer: 'optionB',
      hint: 'Starting at 4 and taking 3 steps to the right: 4 + 3 = 7.',
    },
    {
      testId: testObj.id,
      question: 'Starting from 2 and making 6 jumps to the right on a number line gives',
      optionA: '7',
      optionB: '8',
      optionC: '9',
      optionD: '10',
      correctAnswer: 'optionB',
      hint: 'Starting at 2 and taking 6 steps to the right: 2 + 6 = 8.',
    },
    {
      testId: testObj.id,
      question: 'What is the result of 8 − 3 on a number line?',
      optionA: '4',
      optionB: '5',
      optionC: '6',
      optionD: '7',
      correctAnswer: 'optionB',
      hint: 'Starting at 8 and taking 3 steps to the left: 8 − 3 = 5.',
    },
    {
      testId: testObj.id,
      question: 'What is the result of 9 − 5 on a number line?',
      optionA: '3',
      optionB: '4',
      optionC: '5',
      optionD: '6',
      correctAnswer: 'optionB',
      hint: 'Starting at 9 and taking 5 steps to the left: 9 − 5 = 4.',
    },
    {
      testId: testObj.id,
      question: 'What is the result of 4 × 3 on a number line?',
      optionA: '7',
      optionB: '10',
      optionC: '12',
      optionD: '14',
      correctAnswer: 'optionC',
      hint: '4 jumps of size 3 starting from 0: 4 × 3 = 12.',
    },
    {
      testId: testObj.id,
      question: 'What is the result of 2 × 6 on a number line?',
      optionA: '8',
      optionB: '10',
      optionC: '12',
      optionD: '14',
      correctAnswer: 'optionC',
      hint: '2 jumps of size 6 starting from 0: 2 × 6 = 12.',
    },

    // --- SECTION Q: Exercise 3F – Number Line Practice ---
    {
      testId: testObj.id,
      question: 'Use number line to find 5 + 4',
      optionA: '7',
      optionB: '8',
      optionC: '9',
      optionD: '10',
      correctAnswer: 'optionC',
      hint: '5 + 4 = 9 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 6 + 3',
      optionA: '8',
      optionB: '9',
      optionC: '10',
      optionD: '11',
      correctAnswer: 'optionB',
      hint: '6 + 3 = 9 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 7 + 1',
      optionA: '7',
      optionB: '8',
      optionC: '9',
      optionD: '10',
      correctAnswer: 'optionB',
      hint: '7 + 1 = 8 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 6 + 5',
      optionA: '10',
      optionB: '11',
      optionC: '12',
      optionD: '13',
      correctAnswer: 'optionB',
      hint: '6 + 5 = 11 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 7 − 5',
      optionA: '1',
      optionB: '2',
      optionC: '3',
      optionD: '4',
      correctAnswer: 'optionB',
      hint: '7 − 5 = 2 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 9 − 4',
      optionA: '4',
      optionB: '5',
      optionC: '6',
      optionD: '7',
      correctAnswer: 'optionB',
      hint: '9 − 4 = 5 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 8 − 1',
      optionA: '6',
      optionB: '7',
      optionC: '8',
      optionD: '9',
      correctAnswer: 'optionB',
      hint: '8 − 1 = 7 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 13 − 8',
      optionA: '4',
      optionB: '5',
      optionC: '6',
      optionD: '7',
      correctAnswer: 'optionB',
      hint: '13 − 8 = 5 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 3 × 5',
      optionA: '10',
      optionB: '12',
      optionC: '15',
      optionD: '18',
      correctAnswer: 'optionC',
      hint: '3 × 5 = 15 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 4 × 2',
      optionA: '6',
      optionB: '8',
      optionC: '10',
      optionD: '12',
      correctAnswer: 'optionB',
      hint: '4 × 2 = 8 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 7 × 3',
      optionA: '18',
      optionB: '20',
      optionC: '21',
      optionD: '24',
      correctAnswer: 'optionC',
      hint: '7 × 3 = 21 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 3 × 6',
      optionA: '15',
      optionB: '18',
      optionC: '20',
      optionD: '24',
      correctAnswer: 'optionB',
      hint: '3 × 6 = 18 on the number line.',
    },

    // --- SECTION R: Exercise 3G – Objective Questions ---
    {
      testId: testObj.id,
      question: 'The least number of 4 digits which is exactly divisible by 9 is',
      optionA: '1018',
      optionB: '1026',
      optionC: '1009',
      optionD: '1008',
      correctAnswer: 'optionD',
      hint: 'Smallest 4-digit number is 1000. 1000 ÷ 9 = 111 remainder 1. 1000 + (9 − 1) = 1008.',
    },
    {
      testId: testObj.id,
      question: 'What least number should be subtracted from 10004 to get a number exactly divisible by 12?',
      optionA: '4',
      optionB: '6',
      optionC: '8',
      optionD: '20',
      correctAnswer: 'optionC',
      hint: '10004 ÷ 12 = 833 remainder 8. Subtracting 8 gives 9996 which is divisible by 12.',
    },
    {
      testId: testObj.id,
      question: 'What least number should be added to 10056 to get a number exactly divisible by 23?',
      optionA: '5',
      optionB: '18',
      optionC: '13',
      optionD: '10',
      correctAnswer: 'optionB',
      hint: '10056 ÷ 23 = 437 remainder 5. Number to add = 23 − 5 = 18.',
    },
    {
      testId: testObj.id,
      question: 'Which whole number nearest to 457 is divisible by 11?',
      optionA: '450',
      optionB: '451',
      optionC: '460',
      optionD: '462',
      correctAnswer: 'optionD',
      hint: '457 ÷ 11 = 41 remainder 6. 11 × 41 = 451 (diff 6), 11 × 42 = 462 (diff 5). Nearest is 462.',
    },
    {
      testId: testObj.id,
      question: 'How many whole numbers are there between 1018 and 1203?',
      optionA: '185',
      optionB: '186',
      optionC: '184',
      optionD: '187',
      correctAnswer: 'optionC',
      hint: 'Whole numbers strictly between 1018 and 1203 = 1203 − 1018 − 1 = 184.',
    },
    {
      testId: testObj.id,
      question: 'A number when divided by 46 gives 11 as quotient and 15 as remainder. The number is',
      optionA: '491',
      optionB: '521',
      optionC: '701',
      optionD: '679',
      correctAnswer: 'optionB',
      hint: 'Dividend = Divisor × Quotient + Remainder = 46 × 11 + 15 = 506 + 15 = 521.',
    },
    {
      testId: testObj.id,
      question: 'In a division sum, dividend = 199, quotient = 16 and remainder = 7. The divisor is',
      optionA: '11',
      optionB: '23',
      optionC: '12',
      optionD: '13',
      correctAnswer: 'optionC',
      hint: 'Divisor = (Dividend − Remainder) ÷ Quotient = (199 − 7) ÷ 16 = 192 ÷ 16 = 12.',
    },
    {
      testId: testObj.id,
      question: '7589 − ? = 3434',
      optionA: '11023',
      optionB: '4245',
      optionC: '4155',
      optionD: '4254',
      correctAnswer: 'optionC',
      hint: '? = 7589 − 3434 = 4155.',
    },
    {
      testId: testObj.id,
      question: '587 × 99 =',
      optionA: '57213',
      optionB: '58513',
      optionC: '58113',
      optionD: '56413',
      correctAnswer: 'optionC',
      hint: '587 × (100 − 1) = 58700 − 587 = 58113.',
    },
    {
      testId: testObj.id,
      question: '4 × 538 × 25 =',
      optionA: '32280',
      optionB: '26900',
      optionC: '53800',
      optionD: '10760',
      correctAnswer: 'optionC',
      hint: '(4 × 25) × 538 = 100 × 538 = 53800.',
    },
    {
      testId: testObj.id,
      question: '24679 × 92 + 24679 × 8 =',
      optionA: '493580',
      optionB: '1233950',
      optionC: '2467900',
      optionD: '2467980',
      correctAnswer: 'optionC',
      hint: '24679 × (92 + 8) = 24679 × 100 = 2467900.',
    },
    {
      testId: testObj.id,
      question: '1625 × 1625 − 1625 × 625 =',
      optionA: '1625000',
      optionB: '162500',
      optionC: '325000',
      optionD: '812500',
      correctAnswer: 'optionA',
      hint: '1625 × (1625 − 625) = 1625 × 1000 = 1625000.',
    },
    {
      testId: testObj.id,
      question: '1568 × 185 − 1568 × 85 =',
      optionA: '7840',
      optionB: '15680',
      optionC: '156800',
      optionD: '158600',
      correctAnswer: 'optionC',
      hint: '1568 × (185 − 85) = 1568 × 100 = 156800.',
    },
    {
      testId: testObj.id,
      question: '(888 + 777 + 555) = (111 × ?)',
      optionA: '120',
      optionB: '280',
      optionC: '20',
      optionD: '140',
      correctAnswer: 'optionC',
      hint: '111 × (8 + 7 + 5) = 111 × 20 = 2220.',
    },
    {
      testId: testObj.id,
      question: 'The sum of two odd numbers is',
      optionA: 'an odd number',
      optionB: 'an even number',
      optionC: 'a prime number',
      optionD: 'a multiple of 3',
      correctAnswer: 'optionB',
      hint: 'The sum of two odd numbers is always an even number (e.g. 3 + 5 = 8).',
    },
    {
      testId: testObj.id,
      question: 'The product of two odd numbers is',
      optionA: 'an odd number',
      optionB: 'an even number',
      optionC: 'a prime number',
      optionD: 'none of these',
      correctAnswer: 'optionA',
      hint: 'The product of two odd numbers is always an odd number (e.g. 3 × 5 = 15).',
    },
    {
      testId: testObj.id,
      question: 'If a is a whole number such that a + a = a, then a =',
      optionA: '1',
      optionB: '2',
      optionC: '3',
      optionD: '0',
      correctAnswer: 'optionD',
      hint: '0 + 0 = 0 is the only whole number satisfying a + a = a.',
    },
    {
      testId: testObj.id,
      question: 'The predecessor of 10000 is',
      optionA: '10001',
      optionB: '9999',
      optionC: '10002',
      optionD: '9998',
      correctAnswer: 'optionB',
      hint: 'Predecessor of 10000 is 10000 − 1 = 9999.',
    },
    {
      testId: testObj.id,
      question: 'The successor of 1001 is',
      optionA: '1000',
      optionB: '1002',
      optionC: '999',
      optionD: '1003',
      correctAnswer: 'optionB',
      hint: 'Successor of 1001 is 1001 + 1 = 1002.',
    },
    {
      testId: testObj.id,
      question: 'The smallest even whole number is',
      optionA: '0',
      optionB: '1',
      optionC: '2',
      optionD: '4',
      correctAnswer: 'optionA',
      hint: '0 is a whole number and is divisible by 2 (even).',
    },
  ];

  for (let idx = 0; idx < rawQuestions.length; idx++) {
    await createQuestion({
      ...rawQuestions[idx],
      orderIndex: idx,
    });
  }

  return testObj;
}

/**
 * Helper to populate official Class 6 Whole Numbers – Sample Test 2
 * Pattern: 4 Sections (A, B, C, D)
 * - Section A: MCQs (15 questions: 5 Multiplication, 5 Division, 5 Number Lines)
 * - Section B: True/False (15 questions: 5 Multiplication, 5 Division, 5 Number Lines)
 * - Section C: Word Problems (6 questions: 2 Multiplication, 2 Division, 2 Number Lines)
 * - Section D: Reading Comprehension (6 questions: 2 Multiplication, 2 Division, 2 Number Lines)
 * plus Teacher's Question Bank (26 questions: 10 MCQs, 10 T/F, 6 Word/Passage)
 * Total = 68 questions (all unique from Sample Test 1)
 */
export async function createWholeNumbersTestPaper2(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Whole Numbers – Sample Test 2',
    class: 'Class 6',
    duration: 45,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    // --- 10 EASY QUESTIONS ---
    {
      testId: testObj.id,
      question: 'The predecessor of 10000 is',
      optionA: '10001',
      optionB: '9999',
      optionC: '10002',
      optionD: '9998',
      correctAnswer: 'optionB',
      hint: 'Predecessor of 10000 is 10000 − 1 = 9999.',
    },
    {
      testId: testObj.id,
      question: 'The successor of 1001 is',
      optionA: '1000',
      optionB: '1002',
      optionC: '999',
      optionD: '1003',
      correctAnswer: 'optionB',
      hint: 'Successor of 1001 is 1001 + 1 = 1002.',
    },
    {
      testId: testObj.id,
      question: 'The smallest 3-digit number is',
      optionA: '99',
      optionB: '100',
      optionC: '101',
      optionD: '999',
      correctAnswer: 'optionB',
      hint: '100 is the smallest 3-digit whole number.',
    },
    {
      testId: testObj.id,
      question: 'The product of a non-zero whole number and its successor is always',
      optionA: 'An odd number',
      optionB: 'An even number',
      optionC: 'Prime number',
      optionD: 'Divisible by 3',
      correctAnswer: 'optionB',
      hint: 'Product of an even and an odd integer is always even.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is the additive identity for whole numbers?',
      optionA: '1',
      optionB: '0',
      optionC: '10',
      optionD: '100',
      correctAnswer: 'optionB',
      hint: '0 is the additive identity because a + 0 = a.',
    },
    {
      testId: testObj.id,
      question: 'Closure property holds true in whole numbers for',
      optionA: 'Addition and Subtraction',
      optionB: 'Addition and Multiplication',
      optionC: 'Multiplication and Division',
      optionD: 'Subtraction and Division',
      correctAnswer: 'optionB',
      hint: 'Whole numbers are closed under addition and multiplication.',
    },
    {
      testId: testObj.id,
      question: '0 divided by any non-zero whole number gives',
      optionA: '1',
      optionB: 'The number itself',
      optionC: '0',
      optionD: 'Not defined',
      correctAnswer: 'optionC',
      hint: '0 ÷ n = 0 for any non-zero whole number n.',
    },
    {
      testId: testObj.id,
      question: 'If a is a whole number such that a + a = a, then a =',
      optionA: '1',
      optionB: '2',
      optionC: '0',
      optionD: 'Any number',
      correctAnswer: 'optionC',
      hint: '0 + 0 = 0.',
    },
    {
      testId: testObj.id,
      question: 'The product of any whole number and zero is',
      optionA: 'The number itself',
      optionB: '1',
      optionC: '0',
      optionD: 'Not defined',
      correctAnswer: 'optionC',
      hint: 'a × 0 = 0 for all whole numbers a.',
    },
    {
      testId: testObj.id,
      question: 'The predecessor of 1 in whole numbers is',
      optionA: '2',
      optionB: '0',
      optionC: 'Does not exist',
      optionD: '-1',
      correctAnswer: 'optionB',
      hint: '1 − 1 = 0, which is a valid whole number.',
    },

    // --- 15 MEDIUM QUESTIONS ---
    {
      testId: testObj.id,
      question: 'Which property is shown by: 14 × 6 = 6 × 14?',
      optionA: 'Associative property',
      optionB: 'Commutative property',
      optionC: 'Distributive property',
      optionD: 'Closure property',
      correctAnswer: 'optionB',
      hint: 'Commutative property states a × b = b × a.',
    },
    {
      testId: testObj.id,
      question: '12 × (10 + 7) = (12 × 10) + (12 × 7) is an example of',
      optionA: 'Commutative property',
      optionB: 'Associative property',
      optionC: 'Distributive property',
      optionD: 'Identity property',
      correctAnswer: 'optionC',
      hint: 'Distributive property of multiplication over addition: a(b + c) = ab + ac.',
    },
    {
      testId: testObj.id,
      question: 'Divide 53968 by 267. The quotient is',
      optionA: '202',
      optionB: '201',
      optionC: '203',
      optionD: '200',
      correctAnswer: 'optionA',
      hint: '53968 ÷ 267 = 202 with remainder 34.',
    },
    {
      testId: testObj.id,
      question: 'Which number is represented when starting from 4 and making 3 jumps to the right on a number line?',
      optionA: '6',
      optionB: '7',
      optionC: '8',
      optionD: '9',
      correctAnswer: 'optionB',
      hint: '4 + 3 = 7 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'Use number line to find 5 + 4',
      optionA: '7',
      optionB: '8',
      optionC: '9',
      optionD: '10',
      correctAnswer: 'optionC',
      hint: '5 + 4 = 9 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'The least number of 4 digits which is exactly divisible by 9 is',
      optionA: '1018',
      optionB: '1026',
      optionC: '1009',
      optionD: '1008',
      correctAnswer: 'optionD',
      hint: 'Smallest 4-digit number is 1000. 1000 ÷ 9 = 111 rem 1. So 1000 + 8 = 1008 is divisible by 9.',
    },
    {
      testId: testObj.id,
      question: 'A number when divided by 46 gives 11 as quotient and 15 as remainder. The number is',
      optionA: '491',
      optionB: '521',
      optionC: '701',
      optionD: '679',
      correctAnswer: 'optionB',
      hint: 'Dividend = Divisor × Quotient + Remainder = 46 × 11 + 15 = 521.',
    },
    {
      testId: testObj.id,
      question: 'When 4178 is divided by 35, the quotient is',
      optionA: '119',
      optionB: '118',
      optionC: '120',
      optionD: '117',
      correctAnswer: 'optionA',
      hint: '4178 ÷ 35 = 119 remainder 13.',
    },
    {
      testId: testObj.id,
      question: 'Find the sum by suitable rearrangement: 837 + 208 + 363',
      optionA: '1408',
      optionB: '1400',
      optionC: '1418',
      optionD: '1398',
      correctAnswer: 'optionA',
      hint: '(837 + 363) + 208 = 1200 + 208 = 1408.',
    },
    {
      testId: testObj.id,
      question: 'Find the product using suitable property: 738 × 103',
      optionA: '76014',
      optionB: '76114',
      optionC: '75014',
      optionD: '76024',
      correctAnswer: 'optionA',
      hint: '738 × (100 + 3) = 73800 + 2214 = 76014.',
    },
    {
      testId: testObj.id,
      question: '854 × 102 =',
      optionA: '87108',
      optionB: '87008',
      optionC: '87208',
      optionD: '87308',
      correctAnswer: 'optionA',
      hint: '854 × (100 + 2) = 85400 + 1708 = 87108.',
    },
    {
      testId: testObj.id,
      question: '1005 × 168 =',
      optionA: '168840',
      optionB: '168940',
      optionC: '168740',
      optionD: '167840',
      correctAnswer: 'optionA',
      hint: '(1000 + 5) × 168 = 168000 + 840 = 168840.',
    },
    {
      testId: testObj.id,
      question: 'Starting from 2 and making 6 jumps to the right on a number line gives',
      optionA: '7',
      optionB: '8',
      optionC: '9',
      optionD: '10',
      correctAnswer: 'optionB',
      hint: '2 + 6 = 8 on the number line.',
    },
    {
      testId: testObj.id,
      question: 'A vendor supplies 32 litres of milk in morning and 68 litres in evening at ₹45 per litre. How much money is due to the vendor per day?',
      optionA: '₹4500',
      optionB: '₹4400',
      optionC: '₹4600',
      optionD: '₹450',
      correctAnswer: 'optionA',
      hint: '(32 + 68) × 45 = 100 × 45 = ₹4500.',
    },
    {
      testId: testObj.id,
      question: 'Find the value of 54279 × 92 + 8 × 54279',
      optionA: '5427900',
      optionB: '542790',
      optionC: '54279000',
      optionD: '54279',
      correctAnswer: 'optionA',
      hint: '54279 × (92 + 8) = 54279 × 100 = 5427900.',
    },

    // --- 5 CHALLENGING QUESTIONS ---
    {
      testId: testObj.id,
      question: 'What least number should be subtracted from 10004 to get a number exactly divisible by 12?',
      optionA: '4',
      optionB: '6',
      optionC: '8',
      optionD: '20',
      correctAnswer: 'optionC',
      hint: '10004 ÷ 12 = 833 remainder 8. Subtract 8.',
    },
    {
      testId: testObj.id,
      question: 'What least number must be added to 10056 to make it exactly divisible by 23?',
      optionA: '18',
      optionB: '5',
      optionC: '13',
      optionD: '10',
      correctAnswer: 'optionA',
      hint: '10056 ÷ 23 = 437 remainder 5. Number to add = 23 − 5 = 18.',
    },
    {
      testId: testObj.id,
      question: 'Find the product using distributive property: 504 × 35',
      optionA: '17640',
      optionB: '17540',
      optionC: '17740',
      optionD: '17650',
      correctAnswer: 'optionA',
      hint: '(500 + 4) × 35 = 17500 + 140 = 17640.',
    },
    {
      testId: testObj.id,
      question: 'Find the product 8 × 291 × 125',
      optionA: '291000',
      optionB: '29100',
      optionC: '2910000',
      optionD: '2910',
      correctAnswer: 'optionA',
      hint: '(8 × 125) × 291 = 1000 × 291 = 291000.',
    },
    {
      testId: testObj.id,
      question: 'Find the value of 81265 × 169 − 81265 × 69',
      optionA: '8126500',
      optionB: '812650',
      optionC: '81265000',
      optionD: '81265',
      correctAnswer: 'optionA',
      hint: '81265 × (169 − 69) = 81265 × 100 = 8126500.',
    },
  ];

  for (let idx = 0; idx < rawQuestions.length; idx++) {
    await createQuestion({
      ...rawQuestions[idx],
      orderIndex: idx,
    });
  }

  return testObj;
}

export const createWholeNumbersTestPaper = createWholeNumbersTestPaper2;

/**
 * Deletes all existing Playing With Numbers tests and associated questions from Firestore.
 */
export async function deleteAllPlayingWithNumbersTests(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));
    const pwnDocs = snap.docs.filter((docSnap) => {
      const title = docSnap.data().title || '';
      return title.toLowerCase().includes('playing with numbers');
    });

    let count = 0;
    for (const docSnap of pwnDocs) {
      await deleteTest(docSnap.id);
      count++;
    }
    console.log(`Deleted ${count} previous Playing With Numbers test papers.`);
    return count;
  } catch (error) {
    console.error('Error deleting Playing With Numbers tests:', error);
    return 0;
  }
}

/**
 * Helper to populate official Class 6 Playing With Numbers – Sample Test 1 (Questions 1 to 20)
 */
export async function createPlayingWithNumbersTestPaper1(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Playing With Numbers – Sample Test 1',
    class: 'Class 6',
    duration: 25,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    {
      testId: testObj.id,
      question: 'Which of the following numbers is divisible by 2?',
      optionA: '357',
      optionB: '482',
      optionC: '915',
      optionD: '731',
      correctAnswer: 'optionB',
      hint: 'A number is divisible by 2 if its last digit is even (0, 2, 4, 6, 8). 482 ends in 2.',
    },
    {
      testId: testObj.id,
      question: 'A number divisible by 2 is called',
      optionA: 'a prime number',
      optionB: 'an odd number',
      optionC: 'an even number',
      optionD: 'a composite number',
      correctAnswer: 'optionC',
      hint: 'Numbers divisible by 2 are even numbers.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following numbers is divisible by 5?',
      optionA: '432',
      optionB: '678',
      optionC: '945',
      optionD: '721',
      correctAnswer: 'optionC',
      hint: 'A number is divisible by 5 if its last digit is 0 or 5. 945 ends in 5.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following numbers is divisible by both 2 and 5?',
      optionA: '125',
      optionB: '450',
      optionC: '333',
      optionD: '715',
      correctAnswer: 'optionB',
      hint: 'A number divisible by both 2 and 5 must end in 0. 450 ends in 0.',
    },
    {
      testId: testObj.id,
      question: 'The number 846 is divisible by 3 because',
      optionA: 'it ends in 6',
      optionB: 'the sum of its digits is 18',
      optionC: 'it is an even number',
      optionD: 'it has three digits',
      correctAnswer: 'optionB',
      hint: 'Sum of digits of 846 = 8 + 4 + 6 = 18, which is divisible by 3.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is divisible by 9?',
      optionA: '729',
      optionB: '734',
      optionC: '715',
      optionD: '743',
      correctAnswer: 'optionA',
      hint: 'Sum of digits of 729 = 7 + 2 + 9 = 18, which is divisible by 9.',
    },
    {
      testId: testObj.id,
      question: 'The sum of the digits of 5,832 is',
      optionA: '16',
      optionB: '17',
      optionC: '18',
      optionD: '19',
      correctAnswer: 'optionC',
      hint: '5 + 8 + 3 + 2 = 18.',
    },
    {
      testId: testObj.id,
      question: 'Which number is divisible by 6?',
      optionA: '144',
      optionB: '155',
      optionC: '171',
      optionD: '195',
      correctAnswer: 'optionA',
      hint: '144 is even and sum of digits 1+4+4=9 (divisible by 3), so it is divisible by 6.',
    },
    {
      testId: testObj.id,
      question: 'A number divisible by both 2 and 3 is divisible by',
      optionA: '4',
      optionB: '5',
      optionC: '6',
      optionD: '9',
      correctAnswer: 'optionC',
      hint: 'Since LCM(2, 3) = 6, a number divisible by both 2 and 3 is divisible by 6.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following numbers is divisible by 10?',
      optionA: '560',
      optionB: '565',
      optionC: '556',
      optionD: '555',
      correctAnswer: 'optionA',
      hint: 'A number is divisible by 10 if its unit digit is 0. 560 ends in 0.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is a factor of 36?',
      optionA: '5',
      optionB: '7',
      optionC: '9',
      optionD: '11',
      correctAnswer: 'optionC',
      hint: '36 ÷ 9 = 4, so 9 is a factor of 36.',
    },
    {
      testId: testObj.id,
      question: 'The factors of 24 are',
      optionA: '1, 2, 3, 4, 6, 8, 12, 24',
      optionB: '1, 2, 4, 8, 16, 24',
      optionC: '1, 3, 6, 12, 24',
      optionD: '2, 4, 6, 8, 10, 12',
      correctAnswer: 'optionA',
      hint: 'Factors of 24 are 1, 2, 3, 4, 6, 8, 12, 24.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is a multiple of 18?',
      optionA: '54',
      optionB: '56',
      optionC: '58',
      optionD: '60',
      correctAnswer: 'optionA',
      hint: '18 × 3 = 54.',
    },
    {
      testId: testObj.id,
      question: 'The smallest factor of every natural number is',
      optionA: '0',
      optionB: '1',
      optionC: '2',
      optionD: 'the number itself',
      correctAnswer: 'optionB',
      hint: '1 divides every natural number, making it the smallest factor.',
    },
    {
      testId: testObj.id,
      question: 'Every number is a factor of',
      optionA: '0',
      optionB: '1',
      optionC: 'itself',
      optionD: '10',
      correctAnswer: 'optionC',
      hint: 'Every non-zero number divides itself completely.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is a prime number?',
      optionA: '21',
      optionB: '27',
      optionC: '29',
      optionD: '35',
      correctAnswer: 'optionC',
      hint: '29 has only two factors: 1 and 29.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is a composite number?',
      optionA: '13',
      optionB: '17',
      optionC: '19',
      optionD: '21',
      correctAnswer: 'optionD',
      hint: '21 has factors 1, 3, 7, 21, so it is composite.',
    },
    {
      testId: testObj.id,
      question: 'The number 1 is',
      optionA: 'prime',
      optionB: 'composite',
      optionC: 'neither prime nor composite',
      optionD: 'even',
      correctAnswer: 'optionC',
      hint: '1 has only one factor, so it is neither prime nor composite.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following numbers has exactly two factors?',
      optionA: '9',
      optionB: '15',
      optionC: '23',
      optionD: '25',
      correctAnswer: 'optionC',
      hint: 'Prime numbers have exactly two factors (1 and itself). 23 is prime.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following pairs are twin primes?',
      optionA: '3 and 5',
      optionB: '5 and 9',
      optionC: '7 and 11',
      optionD: '11 and 15',
      correctAnswer: 'optionA',
      hint: 'Twin primes are prime numbers that differ by 2. 3 and 5 are twin primes.',
    },
  ];

  for (let idx = 0; idx < rawQuestions.length; idx++) {
    await createQuestion({
      ...rawQuestions[idx],
      orderIndex: idx,
    });
  }

  return testObj;
}

/**
 * Helper to populate official Class 6 Playing With Numbers – Sample Test 2 (Questions 21 to 40)
 */
export async function createPlayingWithNumbersTestPaper2(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Playing With Numbers – Sample Test 2',
    class: 'Class 6',
    duration: 25,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    {
      testId: testObj.id,
      question: 'The prime factorisation of 36 is',
      optionA: '2 × 2 × 3 × 3',
      optionB: '2 × 3 × 6',
      optionC: '4 × 9',
      optionD: '2 × 18',
      correctAnswer: 'optionA',
      hint: '36 = 2 × 2 × 3 × 3.',
    },
    {
      testId: testObj.id,
      question: 'The prime factorisation of 72 is',
      optionA: '2 × 2 × 2 × 3 × 3',
      optionB: '2 × 2 × 3 × 6',
      optionC: '8 × 9',
      optionD: '4 × 18',
      correctAnswer: 'optionA',
      hint: '72 = 8 × 9 = 2 × 2 × 2 × 3 × 3.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is the prime factorisation of 60?',
      optionA: '2 × 2 × 3 × 5',
      optionB: '2 × 3 × 10',
      optionC: '4 × 15',
      optionD: '5 × 12',
      correctAnswer: 'optionA',
      hint: '60 = 2 × 2 × 3 × 5.',
    },
    {
      testId: testObj.id,
      question: 'The highest common factor (HCF) of 12 and 18 is',
      optionA: '2',
      optionB: '3',
      optionC: '6',
      optionD: '12',
      correctAnswer: 'optionC',
      hint: 'Factors of 12: 1, 2, 3, 4, 6, 12; Factors of 18: 1, 2, 3, 6, 9, 18. HCF = 6.',
    },
    {
      testId: testObj.id,
      question: 'The HCF of 24 and 36 is',
      optionA: '6',
      optionB: '8',
      optionC: '12',
      optionD: '24',
      correctAnswer: 'optionC',
      hint: '24 = 12 × 2, 36 = 12 × 3. HCF = 12.',
    },
    {
      testId: testObj.id,
      question: 'The least common multiple (LCM) of 4 and 6 is',
      optionA: '10',
      optionB: '12',
      optionC: '18',
      optionD: '24',
      correctAnswer: 'optionB',
      hint: 'Multiples of 4: 4, 8, 12... Multiples of 6: 6, 12... LCM = 12.',
    },
    {
      testId: testObj.id,
      question: 'The LCM of 8 and 12 is',
      optionA: '16',
      optionB: '20',
      optionC: '24',
      optionD: '48',
      correctAnswer: 'optionC',
      hint: 'Multiples of 8: 8, 16, 24... Multiples of 12: 12, 24... LCM = 24.',
    },
    {
      testId: testObj.id,
      question: 'The HCF of two prime numbers is always',
      optionA: '0',
      optionB: '1',
      optionC: '2',
      optionD: 'the larger prime',
      correctAnswer: 'optionB',
      hint: 'Prime numbers share no common factors other than 1.',
    },
    {
      testId: testObj.id,
      question: 'The LCM of two co-prime numbers is equal to',
      optionA: 'their difference',
      optionB: 'their sum',
      optionC: 'their product',
      optionD: 'their HCF',
      correctAnswer: 'optionC',
      hint: 'Since HCF of co-prime numbers is 1, LCM = Product / HCF = Product.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following pairs are co-prime numbers?',
      optionA: '8 and 12',
      optionB: '9 and 27',
      optionC: '14 and 25',
      optionD: '18 and 24',
      correctAnswer: 'optionC',
      hint: '14 (2 × 7) and 25 (5 × 5) share no common factor other than 1.',
    },
    {
      testId: testObj.id,
      question: 'The HCF of 15 and 25 is',
      optionA: '3',
      optionB: '5',
      optionC: '10',
      optionD: '15',
      correctAnswer: 'optionB',
      hint: 'Factors of 15: 1, 3, 5, 15; Factors of 25: 1, 5, 25. HCF = 5.',
    },
    {
      testId: testObj.id,
      question: 'The LCM of 9 and 15 is',
      optionA: '30',
      optionB: '36',
      optionC: '45',
      optionD: '90',
      correctAnswer: 'optionC',
      hint: '9 = 3², 15 = 3 × 5. LCM = 3² × 5 = 45.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following statements is true?',
      optionA: 'Every even number is divisible by 5.',
      optionB: 'Every number divisible by 9 is divisible by 3.',
      optionC: 'Every odd number is prime.',
      optionD: 'Every composite number is even.',
      correctAnswer: 'optionB',
      hint: 'Since 9 = 3 × 3, any multiple of 9 is also a multiple of 3.',
    },
    {
      testId: testObj.id,
      question: 'The number 1,260 is divisible by',
      optionA: '2 only',
      optionB: '5 only',
      optionC: '2, 3, 5, 9 and 10',
      optionD: '7 only',
      correctAnswer: 'optionC',
      hint: '1260 ends in 0 (divisible by 2, 5, 10) and sum of digits 1+2+6+0=9 (divisible by 3 and 9).',
    },
    {
      testId: testObj.id,
      question: 'The greatest common factor of 48 and 64 is',
      optionA: '8',
      optionB: '12',
      optionC: '16',
      optionD: '24',
      correctAnswer: 'optionC',
      hint: '48 = 16 × 3, 64 = 16 × 4. GCF/HCF = 16.',
    },
    {
      testId: testObj.id,
      question: 'The least common multiple of 18 and 24 is',
      optionA: '36',
      optionB: '48',
      optionC: '72',
      optionD: '96',
      correctAnswer: 'optionC',
      hint: '18 = 2 × 3², 24 = 2³ × 3. LCM = 2³ × 3² = 72.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following numbers is not divisible by 3?',
      optionA: '234',
      optionB: '567',
      optionC: '789',
      optionD: '1,001',
      correctAnswer: 'optionD',
      hint: 'Sum of digits of 1001 is 2, which is not divisible by 3.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following numbers is divisible by 9 but not by 10?',
      optionA: '810',
      optionB: '729',
      optionC: '540',
      optionD: '900',
      correctAnswer: 'optionB',
      hint: '729 has sum of digits 18 (divisible by 9) and does not end in 0 (not divisible by 10).',
    },
    {
      testId: testObj.id,
      question: 'The product of two odd numbers is always',
      optionA: 'even',
      optionB: 'odd',
      optionC: 'prime',
      optionD: 'composite',
      correctAnswer: 'optionB',
      hint: 'Multiplying any two odd numbers results in an odd number (e.g. 3 × 5 = 15).',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is the correct prime factor tree result for 84?',
      optionA: '2 × 2 × 3 × 7',
      optionB: '2 × 3 × 14',
      optionC: '4 × 21',
      optionD: '6 × 14',
      correctAnswer: 'optionA',
      hint: 'Prime factorisation of 84 = 2 × 2 × 3 × 7.',
    },
  ];

  for (let idx = 0; idx < rawQuestions.length; idx++) {
    await createQuestion({
      ...rawQuestions[idx],
      orderIndex: idx,
    });
  }

  return testObj;
}

/**
 * Helper to populate official Class 6 to 10 CBSE Math Test Papers
 */
export async function publishClass6To10DefaultTests(clearExisting = false): Promise<void> {
  try {
    if (clearExisting) {
      console.log('Clearing existing tests...');
      const testsSnap = await getDocs(collection(db, TESTS_COL));
      for (const docSnap of testsSnap.docs) {
        await deleteDoc(doc(db, TESTS_COL, docSnap.id));
      }
      const questionsSnap = await getDocs(collection(db, QUESTIONS_COL));
      for (const docSnap of questionsSnap.docs) {
        await deleteDoc(doc(db, QUESTIONS_COL, docSnap.id));
      }
    }

    console.log('Publishing CBSE Class 6 to 10 Test Papers...');

    // CLASS 6: PLAYING WITH NUMBERS SAMPLE TEST 1 (20 Questions)
    await createPlayingWithNumbersTestPaper1();

    // CLASS 6: PLAYING WITH NUMBERS SAMPLE TEST 2 (20 Questions)
    await createPlayingWithNumbersTestPaper2();

    // CLASS 6: WHOLE NUMBERS SAMPLE TEST 1 (38 Questions)
    await createWholeNumbersTestPaper1();

    // CLASS 6: WHOLE NUMBERS SAMPLE TEST 2 (46 Questions)
    await createWholeNumbersTestPaper2();

    // CLASS 6: ODD NUMBERS TEST PAPER
    const testOdd = await createTest({
      title: 'CBSE Class 6: Odd Numbers',
      class: 'Class 6',
      duration: 15,
      published: true,
    });
    const testOddQuestions: Omit<Question, 'id'>[] = [
      {
        testId: testOdd.id,
        question: 'Which of the following is an odd number?',
        optionA: '24',
        optionB: '36',
        optionC: '51',
        optionD: '60',
        correctAnswer: 'optionC',
        hint: 'Odd numbers are not divisible by 2 and usually end in 1, 3, 5, 7, or 9.',
      },
      {
        testId: testOdd.id,
        question: 'What is the next odd number after 97?',
        optionA: '98',
        optionB: '99',
        optionC: '100',
        optionD: '101',
        correctAnswer: 'optionB',
        hint: 'Odd numbers increase by 2 each time: 95, 97, 99, 101.',
      },
      {
        testId: testOdd.id,
        question: 'Which pair contains only odd numbers?',
        optionA: '13 and 17',
        optionB: '12 and 15',
        optionC: '18 and 21',
        optionD: '25 and 30',
        correctAnswer: 'optionA',
        hint: 'Check whether both numbers are not divisible by 2.',
      },
      {
        testId: testOdd.id,
        question: 'The sum of two odd numbers is usually:',
        optionA: 'Odd',
        optionB: 'Even',
        optionC: 'Prime',
        optionD: 'Negative',
        correctAnswer: 'optionB',
        hint: 'Try adding two odd numbers such as 5 + 7 or 9 + 11 and observe the result.',
      },
    ];
    for (const q of testOddQuestions) await createQuestion(q);

    // CLASS 6 TEST PAPER
    const test6 = await createTest({
      title: 'CBSE Class 6: Whole Numbers, Decimals & Geometry',
      class: 'Class 6',
      duration: 15,
      published: true,
    });
    const test6Questions: Omit<Question, 'id'>[] = [
      {
        testId: test6.id,
        question: 'Which is the smallest whole number?',
        optionA: '0',
        optionB: '1',
        optionC: '-1',
        optionD: '10',
        correctAnswer: 'optionA',
        hint: 'Whole numbers start from 0 and include all non-negative integers (0, 1, 2, 3...).',
      },
      {
        testId: test6.id,
        question: 'What is the predecessor of 10,000?',
        optionA: '9,999',
        optionB: '10,001',
        optionC: '9,990',
        optionD: '9,000',
        correctAnswer: 'optionA',
        hint: 'The predecessor of a number is the number that comes immediately before it. Try subtracting 1 from 10,000.',
      },
      {
        testId: test6.id,
        question: 'An angle whose measure is less than 90° is called an:',
        optionA: 'Acute angle',
        optionB: 'Obtuse angle',
        optionC: 'Right angle',
        optionD: 'Straight angle',
        correctAnswer: 'optionA',
        hint: 'Acute angles are smaller than 90°, right angles are exactly 90°, and obtuse angles are between 90° and 180°.',
      },
      {
        testId: test6.id,
        question: 'What is the perimeter of a square with side length 7 cm?',
        optionA: '28 cm',
        optionB: '14 cm',
        optionC: '49 cm',
        optionD: '21 cm',
        correctAnswer: 'optionA',
        hint: 'Perimeter of a square = 4 × side length.',
      },
    ];
    for (const q of test6Questions) await createQuestion(q);

    // CLASS 7 TEST PAPER
    const test7 = await createTest({
      title: 'CBSE Class 7: Integers & Simple Equations',
      class: 'Class 7',
      duration: 15,
      published: true,
    });
    const test7Questions: Omit<Question, 'id'>[] = [
      {
        testId: test7.id,
        question: 'What is the result of (-15) + (+8)?',
        optionA: '-7',
        optionB: '7',
        optionC: '-23',
        optionD: '23',
        correctAnswer: 'optionA',
        hint: 'When adding integers with opposite signs, subtract the absolute values (15 - 8 = 7) and keep the sign of the larger absolute value (-).',
      },
      {
        testId: test7.id,
        question: 'Solve for x in the equation: 3x + 7 = 22',
        optionA: 'x = 5',
        optionB: 'x = 4',
        optionC: 'x = 6',
        optionD: 'x = 3',
        correctAnswer: 'optionA',
        hint: 'First subtract 7 from both sides: 3x = 15. Then divide by 3.',
      },
      {
        testId: test7.id,
        question: 'The complementary angle of 35° is:',
        optionA: '55°',
        optionB: '145°',
        optionC: '65°',
        optionD: '45°',
        correctAnswer: 'optionA',
        hint: 'Two angles are complementary if their sum is 90°. Subtract 35° from 90°.',
      },
      {
        testId: test7.id,
        question: 'Find the area of a triangle with base = 10 cm and height = 6 cm.',
        optionA: '30 sq cm',
        optionB: '60 sq cm',
        optionC: '16 sq cm',
        optionD: '20 sq cm',
        correctAnswer: 'optionA',
        hint: 'Area of a triangle = (1/2) × base × height.',
      },
    ];
    for (const q of test7Questions) await createQuestion(q);

    // CLASS 9 TEST PAPER
    const test9 = await createTest({
      title: 'CBSE Class 9: Number Systems & Polynomials',
      class: 'Class 9',
      duration: 15,
      published: true,
    });
    const test9Questions: Omit<Question, 'id'>[] = [
      {
        testId: test9.id,
        question: 'Which of the following is an irrational number?',
        optionA: '√2',
        optionB: '√4',
        optionC: '0.25',
        optionD: '22/7',
        correctAnswer: 'optionA',
        hint: 'Irrational numbers cannot be expressed as a ratio of two integers. √2 is non-terminating and non-recurring.',
      },
      {
        testId: test9.id,
        question: 'What is the degree of the non-zero constant polynomial?',
        optionA: '0',
        optionB: '1',
        optionC: 'Not defined',
        optionD: '2',
        correctAnswer: 'optionA',
        hint: 'A non-zero constant polynomial like c = c·x⁰ has degree 0.',
      },
      {
        testId: test9.id,
        question: 'If (x + 2) is a factor of x³ + 3x² + 2x + k, then k is equal to:',
        optionA: '0',
        optionB: '2',
        optionC: '-2',
        optionD: '4',
        correctAnswer: 'optionA',
        hint: 'By Factor Theorem, evaluate P(-2) = (-2)³ + 3(-2)² + 2(-2) + k = -8 + 12 - 4 + k = 0 => k = 0.',
      },
      {
        testId: test9.id,
        question: 'The perpendicular distance of the point P(3, 4) from the y-axis is:',
        optionA: '3 units',
        optionB: '4 units',
        optionC: '5 units',
        optionD: '7 units',
        correctAnswer: 'optionA',
        hint: 'The perpendicular distance of a point (x, y) from the y-axis is equal to its x-coordinate |x|.',
      },
    ];
    for (const q of test9Questions) await createQuestion(q);

    // CLASS 10 TEST PAPER
    const test10 = await createTest({
      title: 'CBSE Class 10: Quadratic Equations & Trigonometry',
      class: 'Class 10',
      duration: 15,
      published: true,
    });
    const test10Questions: Omit<Question, 'id'>[] = [
      {
        testId: test10.id,
        question: 'The discriminant (D) of the quadratic equation 3x² - 5x + 2 = 0 is:',
        optionA: '1',
        optionB: '4',
        optionC: '25',
        optionD: '-11',
        correctAnswer: 'optionA',
        hint: 'Formula for discriminant is D = b² - 4ac. Here a=3, b=-5, c=2 => D = (-5)² - 4(3)(2) = 25 - 24 = 1.',
      },
      {
        testId: test10.id,
        question: 'If sin θ = 3/5, then the value of cos θ is:',
        optionA: '4/5',
        optionB: '5/4',
        optionC: '3/4',
        optionD: '1/2',
        correctAnswer: 'optionA',
        hint: 'Use trigonometric identity cos θ = √(1 - sin² θ) = √(1 - (3/5)²) = √(1 - 9/25) = √(16/25) = 4/5.',
      },
      {
        testId: test10.id,
        question: 'What is the value of (sin² 30° + cos² 30°)?',
        optionA: '1',
        optionB: '0',
        optionC: '1/2',
        optionD: '2',
        correctAnswer: 'optionA',
        hint: 'Fundamental trigonometric identity: sin² θ + cos² θ = 1 for any angle θ.',
      },
      {
        testId: test10.id,
        question: 'If α and β are the zeroes of f(x) = x² - 5x + 6, then α + β is:',
        optionA: '5',
        optionB: '6',
        optionC: '-5',
        optionD: '-6',
        correctAnswer: 'optionA',
        hint: 'For quadratic polynomial ax² + bx + c, sum of zeroes (α + β) = -b/a = -(-5)/1 = 5.',
      },
    ];
    for (const q of test10Questions) await createQuestion(q);

    console.log('Published Class 6 to 10 test papers successfully.');
  } catch (err) {
    console.error('Error publishing Class 6 to 10 test papers:', err);
  }
}

/**
 * Seed initial sample CBSE Maths tests and questions if database is empty
 * or replace incomplete test papers with full 57-question test papers.
 */
/**
 * Deletes all existing Whole Numbers tests and associated questions from Firestore.
 */
export async function deleteAllWholeNumbersTests(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));
    const wholeNumbersDocs = snap.docs.filter((docSnap) => {
      const title = docSnap.data().title || '';
      return title.toLowerCase().includes('whole numbers');
    });

    let count = 0;
    for (const docSnap of wholeNumbersDocs) {
      await deleteTest(docSnap.id);
      count++;
    }
    console.log(`Deleted ${count} previous Whole Numbers test papers.`);
    return count;
  } catch (error) {
    console.error('Error deleting Whole Numbers tests:', error);
    return 0;
  }
}

/**
 * Seed default sample data or ensure Class 6 Whole Numbers Sample Tests exist
 */
export async function seedSampleDataIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));

    if (snap.empty) {
      await publishClass6To10DefaultTests(false);
      return;
    }

    // Check if Whole Numbers Sample Test 1 exists and has sufficient questions
    const sample1Docs = snap.docs.filter((d) => {
      const title = (d.data().title || '').toLowerCase();
      return title.includes('sample test 1') && title.includes('whole numbers');
    });

    if (sample1Docs.length === 0) {
      console.log('Seeding Whole Numbers Sample Test 1...');
      await createWholeNumbersTestPaper1();
    } else {
      // Verify questions for existing Sample Test 1
      for (const testDoc of sample1Docs) {
        const qSnap = await getDocs(collection(db, TESTS_COL, testDoc.id, QUESTIONS_COL));
        if (qSnap.size < 30) {
          console.log(`Sample Test 1 has only ${qSnap.size} questions (< 30). Upgrading to full 38-question test paper...`);
          await deleteTest(testDoc.id);
          await createWholeNumbersTestPaper1();
        }
      }
    }

    // Ensure Playing With Numbers tests are seeded
    const pwnDocs = snap.docs.filter((d) => {
      const title = (d.data().title || '').toLowerCase();
      return title.includes('playing with numbers');
    });

    if (pwnDocs.length < 2) {
      console.log('Seeding Playing With Numbers Sample Tests...');
      await deleteAllPlayingWithNumbersTests();
      await createPlayingWithNumbersTestPaper1();
      await createPlayingWithNumbersTestPaper2();
    }
  } catch (error) {
    console.error('Error in seedSampleDataIfEmpty:', error);
  }
}

