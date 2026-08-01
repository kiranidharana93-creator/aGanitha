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
 * Helper to populate official Class 6 Whole Numbers – Sample Test 1 (57 questions)
 */
export async function createWholeNumbersTestPaper1(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Whole Numbers – Sample Test 1',
    class: 'Class 6',
    duration: 45,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    // --- Section A: MCQs ---
    {
      testId: testObj.id,
      question: 'Q1. Which property is shown by: 3 × (4 × 5) = (3 × 4) × 5',
      optionA: 'Commutative',
      optionB: 'Associative',
      optionC: 'Distributive',
      optionD: 'Identity',
      correctAnswer: 'optionB',
      hint: 'Associative property states that grouping in multiplication does not change the product: 3 × (4 × 5) = (3 × 4) × 5.',
    },
    {
      testId: testObj.id,
      question: 'Q2. 7 × (8 + 2) = ?',
      optionA: '56',
      optionB: '70',
      optionC: '72',
      optionD: '80',
      correctAnswer: 'optionB',
      hint: '7 × (8 + 2) = 7 × 10 = 70.',
    },
    {
      testId: testObj.id,
      question: 'Q3. 6 × (9 − 4) = ?',
      optionA: '30',
      optionB: '54',
      optionC: '24',
      optionD: '36',
      correctAnswer: 'optionA',
      hint: '6 × (9 − 4) = 6 × 5 = 30.',
    },
    {
      testId: testObj.id,
      question: 'Q4. Which is equal to 4 × (7 + 5)?',
      optionA: '4 × 7 + 5',
      optionB: '4 × 7 + 4 × 5',
      optionC: '7 + 5 × 4',
      optionD: '4 × 12 × 4',
      correctAnswer: 'optionB',
      hint: 'Distributive property: 4 × (7 + 5) = 4 × 7 + 4 × 5.',
    },
    {
      testId: testObj.id,
      question: 'Q5. 1 × 458 shows the:',
      optionA: 'Zero property',
      optionB: 'Associative property',
      optionC: 'Multiplicative identity',
      optionD: 'Distributive property',
      correctAnswer: 'optionC',
      hint: '1 is the multiplicative identity because multiplying any number by 1 yields the same number.',
    },

    {
      testId: testObj.id,
      question: 'Q6. In 81 ÷ 9 = 9, the quotient is:',
      optionA: '81',
      optionB: '9',
      optionC: '0',
      optionD: '72',
      correctAnswer: 'optionB',
      hint: 'In 81 ÷ 9 = 9, 81 is the dividend, 9 is the divisor, and 9 is the quotient.',
    },
    {
      testId: testObj.id,
      question: 'Q7. In 75 ÷ 8 = 9 remainder 3, the dividend is:',
      optionA: '8',
      optionB: '9',
      optionC: '3',
      optionD: '75',
      correctAnswer: 'optionD',
      hint: 'The total value being divided (75) is the dividend.',
    },
    {
      testId: testObj.id,
      question: 'Q8. The remainder when 46 is divided by 7 is:',
      optionA: '3',
      optionB: '4',
      optionC: '5',
      optionD: '6',
      correctAnswer: 'optionB',
      hint: '46 = (7 × 6) + 4, so the remainder is 4.',
    },
    {
      testId: testObj.id,
      question: 'Q9. Which statement is correct?',
      optionA: 'Quotient = Dividend + Divisor',
      optionB: 'Dividend = Divisor × Quotient + Remainder',
      optionC: 'Remainder can be greater than divisor',
      optionD: 'Divisor is always 1',
      correctAnswer: 'optionB',
      hint: 'Fundamental division rule: Dividend = Divisor × Quotient + Remainder.',
    },
    {
      testId: testObj.id,
      question: 'Q10. Which division has remainder 0?',
      optionA: '54 ÷ 6',
      optionB: '43 ÷ 5',
      optionC: '67 ÷ 8',
      optionD: '29 ÷ 4',
      correctAnswer: 'optionA',
      hint: '54 ÷ 6 = 9 cleanly with remainder 0.',
    },

    {
      testId: testObj.id,
      question: 'Q11. To represent 20 ÷ 5 on a number line, we make jumps of:',
      optionA: '20',
      optionB: '10',
      optionC: '5',
      optionD: '2',
      correctAnswer: 'optionC',
      hint: 'Jumps on a number line correspond to the size of the divisor (5).',
    },
    {
      testId: testObj.id,
      question: 'Q12. 24 ÷ 6 can be shown by:',
      optionA: '4 jumps of 6',
      optionB: '6 jumps of 4',
      optionC: 'Both A and B',
      optionD: '24 jumps of 1',
      correctAnswer: 'optionC',
      hint: '24 ÷ 6 = 4 jumps of 6 or 6 jumps of 4.',
    },
    {
      testId: testObj.id,
      question: 'Q13. Starting from 0, three jumps of 7 reach:',
      optionA: '14',
      optionB: '21',
      optionC: '24',
      optionD: '28',
      correctAnswer: 'optionB',
      hint: '3 × 7 = 21.',
    },
    {
      testId: testObj.id,
      question: 'Q14. Which operation is used repeatedly on a number line to show division?',
      optionA: 'Addition',
      optionB: 'Multiplication',
      optionC: 'Repeated subtraction',
      optionD: 'Doubling',
      correctAnswer: 'optionC',
      hint: 'Division on a number line is fundamentally repeated subtraction.',
    },
    {
      testId: testObj.id,
      question: 'Q15. 18 ÷ 3 needs:',
      optionA: '3 jumps',
      optionB: '4 jumps',
      optionC: '5 jumps',
      optionD: '6 jumps',
      correctAnswer: 'optionD',
      hint: '18 ÷ 3 = 6 jumps.',
    },

    // --- Section B: True / False ---
    {
      testId: testObj.id,
      question: 'Q1. Multiplication is associative for whole numbers.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only for negative numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Grouping does not change the product.',
    },
    {
      testId: testObj.id,
      question: 'Q2. 5 × (3 + 4) = 5 × 3 + 5 × 4.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Sometimes True',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Multiplication distributes over addition.',
    },
    {
      testId: testObj.id,
      question: 'Q3. 8 × (10 − 2) = 8 × 10 − 2.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equal to 64',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. 8 × (10 − 2) = (8 × 10) − (8 × 2) = 64, whereas 8 × 10 − 2 = 78.',
    },
    {
      testId: testObj.id,
      question: 'Q4. 1 is called the multiplicative identity.',
      optionA: 'True',
      optionB: 'False',
      optionC: '0 is the identity',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Multiplying any number by 1 yields that number.',
    },
    {
      testId: testObj.id,
      question: 'Q5. Multiplication of two whole numbers always gives a whole number.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only for even numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Whole numbers are closed under multiplication.',
    },

    {
      testId: testObj.id,
      question: 'Q6. The divisor can be zero.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Sometimes True',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. Division by zero is undefined in mathematics.',
    },
    {
      testId: testObj.id,
      question: 'Q7. In 64 ÷ 8 = 8, 64 is the dividend.',
      optionA: 'True',
      optionB: 'False',
      optionC: '64 is quotient',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. 64 is the dividend.',
    },
    {
      testId: testObj.id,
      question: 'Q8. The remainder is always smaller than the divisor.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Remainder equals divisor',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Remainder must be strictly less than the divisor.',
    },
    {
      testId: testObj.id,
      question: 'Q9. 35 ÷ 5 has remainder 5.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Remainder is 1',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. 35 ÷ 5 = 7 with remainder 0.',
    },
    {
      testId: testObj.id,
      question: 'Q10. Quotient × Divisor + Remainder gives the dividend.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Gives divisor',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Dividend = (Divisor × Quotient) + Remainder.',
    },

    {
      testId: testObj.id,
      question: 'Q11. Division can be represented by equal jumps on a number line.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only addition can',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: 'Q12. 16 ÷ 4 can be shown by four jumps of 4.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Needs 16 jumps',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. 4 × 4 = 16.',
    },
    {
      testId: testObj.id,
      question: 'Q13. Number-line division uses random jumps.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Jumps of variable sizes',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. Jumps must be equal in size.',
    },
    {
      testId: testObj.id,
      question: 'Q14. Repeated subtraction helps us understand division.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Repeated addition only',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Division on a number line is repeated subtraction.',
    },
    {
      testId: testObj.id,
      question: 'Q15. 25 ÷ 5 reaches 25 after five jumps of 5.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Four jumps of 5',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. 5 × 5 = 25.',
    },

    // --- Section C: Word Problems ---
    {
      testId: testObj.id,
      question: 'Q1. A school has 7 rows of desks. Each row has 9 desks. How many desks are there in total?',
      optionA: '56 desks',
      optionB: '63 desks',
      optionC: '70 desks',
      optionD: '72 desks',
      correctAnswer: 'optionB',
      hint: '7 × 9 = 63 desks.',
    },
    {
      testId: testObj.id,
      question: 'Q2. A shopkeeper arranges 8 packets with 6 biscuits in each packet. How many biscuits are there altogether?',
      optionA: '42 biscuits',
      optionB: '48 biscuits',
      optionC: '54 biscuits',
      optionD: '60 biscuits',
      correctAnswer: 'optionB',
      hint: '8 × 6 = 48 biscuits.',
    },

    {
      testId: testObj.id,
      question: 'Q3. 72 pencils are shared equally among 8 students. How many pencils does each student get?',
      optionA: '8 pencils',
      optionB: '9 pencils',
      optionC: '10 pencils',
      optionD: '12 pencils',
      correctAnswer: 'optionB',
      hint: '72 ÷ 8 = 9 pencils.',
    },
    {
      testId: testObj.id,
      question: 'Q4. 58 candies are distributed equally among 6 children. Find the quotient and remainder.',
      optionA: 'Quotient = 9, Remainder = 4',
      optionB: 'Quotient = 8, Remainder = 10',
      optionC: 'Quotient = 9, Remainder = 0',
      optionD: 'Quotient = 6, Remainder = 4',
      correctAnswer: 'optionA',
      hint: '58 ÷ 6 = 9 with remainder 4.',
    },

    {
      testId: testObj.id,
      question: 'Q5. A kangaroo jumps 5 spaces at a time from 0 and reaches 25. How many jumps did it make?',
      optionA: '4 jumps',
      optionB: '5 jumps',
      optionC: '6 jumps',
      optionD: '25 jumps',
      correctAnswer: 'optionB',
      hint: '25 ÷ 5 = 5 jumps.',
    },
    {
      testId: testObj.id,
      question: 'Q6. A toy robot moves 4 units each time and reaches 28 from 0. How many jumps were made?',
      optionA: '6 jumps',
      optionB: '7 jumps',
      optionC: '8 jumps',
      optionD: '9 jumps',
      correctAnswer: 'optionB',
      hint: '28 ÷ 4 = 7 jumps.',
    },

    // --- Section D: Reading Comprehension ---
    {
      testId: testObj.id,
      question: 'Passage: A fruit seller has 8 baskets. Each basket contains 7 oranges.\n\nQ1. How many oranges are there in all?',
      optionA: '49 oranges',
      optionB: '56 oranges',
      optionC: '63 oranges',
      optionD: '70 oranges',
      correctAnswer: 'optionB',
      hint: '8 × 7 = 56 oranges.',
    },
    {
      testId: testObj.id,
      question: 'Passage: A fruit seller has 8 baskets with 7 oranges each.\n\nQ2. If 6 oranges are sold, how many oranges remain?',
      optionA: '50 oranges',
      optionB: '52 oranges',
      optionC: '56 oranges',
      optionD: '60 oranges',
      correctAnswer: 'optionA',
      hint: '56 − 6 = 50 oranges.',
    },

    {
      testId: testObj.id,
      question: 'Passage: A teacher has 54 notebooks. She distributes them equally among 6 groups.\n\nQ3. How many notebooks does each group get?',
      optionA: '8 notebooks',
      optionB: '9 notebooks',
      optionC: '10 notebooks',
      optionD: '12 notebooks',
      correctAnswer: 'optionB',
      hint: '54 ÷ 6 = 9 notebooks.',
    },
    {
      testId: testObj.id,
      question: 'Passage: A teacher has 54 notebooks distributed equally among 6 groups.\n\nQ4. What is the divisor in this division?',
      optionA: '54',
      optionB: '6',
      optionC: '9',
      optionD: '0',
      correctAnswer: 'optionB',
      hint: 'The divisor is 6 (the number of groups).',
    },

    {
      testId: testObj.id,
      question: 'Passage: A child hops 3 spaces each time and reaches 18 starting from 0.\n\nQ5. How many hops did the child make?',
      optionA: '5 hops',
      optionB: '6 hops',
      optionC: '7 hops',
      optionD: '18 hops',
      correctAnswer: 'optionB',
      hint: '18 ÷ 3 = 6 hops.',
    },
    {
      testId: testObj.id,
      question: 'Passage: A child hops 3 spaces each time to reach 18 starting from 0.\n\nQ6. Which mathematical operation is represented on the number line?',
      optionA: 'Addition',
      optionB: 'Division by repeated subtraction',
      optionC: 'Fraction multiplication',
      optionD: 'Long division without jumps',
      correctAnswer: 'optionB',
      hint: 'Division on a number line is represented as repeated subtraction.',
    },

    // --- Teacher\'s Question Bank ---
    {
      testId: testObj.id,
      question: '1. 9 × (5 + 3) = ?',
      optionA: '72',
      optionB: '45',
      optionC: '27',
      optionD: '54',
      correctAnswer: 'optionA',
      hint: '9 × 8 = 72.',
    },
    {
      testId: testObj.id,
      question: '2. Which property is shown by: (2 × 7) × 4 = 2 × (7 × 4)?',
      optionA: 'Identity',
      optionB: 'Associative',
      optionC: 'Commutative',
      optionD: 'Closure',
      correctAnswer: 'optionB',
      hint: 'Associative property of multiplication.',
    },
    {
      testId: testObj.id,
      question: '3. 96 ÷ 8 = ?',
      optionA: '10',
      optionB: '11',
      optionC: '12',
      optionD: '13',
      correctAnswer: 'optionC',
      hint: '96 ÷ 8 = 12.',
    },
    {
      testId: testObj.id,
      question: '4. The remainder in 52 ÷ 5 is:',
      optionA: '0',
      optionB: '1',
      optionC: '2',
      optionD: '3',
      correctAnswer: 'optionC',
      hint: '52 = (5 × 10) + 2. Remainder is 2.',
    },
    {
      testId: testObj.id,
      question: '5. 30 ÷ 5 on a number line requires:',
      optionA: '5 jumps',
      optionB: '6 jumps',
      optionC: '7 jumps',
      optionD: '8 jumps',
      correctAnswer: 'optionB',
      hint: '30 ÷ 5 = 6 jumps.',
    },
    {
      testId: testObj.id,
      question: '6. 4 × (12 − 3) = ?',
      optionA: '36',
      optionB: '48',
      optionC: '24',
      optionD: '45',
      correctAnswer: 'optionA',
      hint: '4 × 9 = 36.',
    },
    {
      testId: testObj.id,
      question: '7. The quotient in 84 ÷ 7 is:',
      optionA: '10',
      optionB: '11',
      optionC: '12',
      optionD: '13',
      correctAnswer: 'optionC',
      hint: '84 ÷ 7 = 12.',
    },
    {
      testId: testObj.id,
      question: '8. Four jumps of 5 reach:',
      optionA: '15',
      optionB: '20',
      optionC: '25',
      optionD: '30',
      correctAnswer: 'optionB',
      hint: '4 × 5 = 20.',
    },
    {
      testId: testObj.id,
      question: '9. Which is divisible by 9?',
      optionA: '63',
      optionB: '65',
      optionC: '67',
      optionD: '69',
      correctAnswer: 'optionA',
      hint: '63 ÷ 9 = 7.',
    },
    {
      testId: testObj.id,
      question: '10. 5 jumps of 4 represent:',
      optionA: '20 ÷ 5',
      optionB: '20 ÷ 4',
      optionC: '4 ÷ 5',
      optionD: '5 ÷ 20',
      correctAnswer: 'optionB',
      hint: '20 ÷ 4 = 5 jumps of 4.',
    },

    {
      testId: testObj.id,
      question: '1. Multiplication distributes over addition.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only positive numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '2. 0 is the multiplicative identity.',
      optionA: 'True',
      optionB: 'False',
      optionC: '1 is identity',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. 1 is the multiplicative identity.',
    },
    {
      testId: testObj.id,
      question: '3. Division by 1 gives the same number.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Changes the number',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '4. The remainder can be equal to the divisor.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Always equal',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. Remainder must be strictly less than divisor.',
    },
    {
      testId: testObj.id,
      question: '5. 24 ÷ 6 can be shown by four jumps of 6.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Six jumps of 4',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '6. 6 × (2 + 3) = 6 × 2 + 6 × 3.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equals 30',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '7. In 45 ÷ 9 = 5, 9 is the quotient.',
      optionA: 'True',
      optionB: 'False',
      optionC: '9 is dividend',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. 9 is the divisor and 5 is the quotient.',
    },
    {
      testId: testObj.id,
      question: '8. Number-line division is based on repeated subtraction.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Addition only',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '9. 1 × 875 = 875.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equals 1',
      optionD: 'Equals 0',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '10. 31 ÷ 6 has remainder 6.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Remainder is 1',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. 31 = (6 × 5) + 1, so remainder is 1.',
    },

    {
      testId: testObj.id,
      question: '1. A library has 9 shelves with 8 books each. How many books are there altogether?',
      optionA: '64 books',
      optionB: '72 books',
      optionC: '80 books',
      optionD: '81 books',
      correctAnswer: 'optionB',
      hint: '9 × 8 = 72 books.',
    },
    {
      testId: testObj.id,
      question: '2. 84 chocolates are packed equally into 7 boxes. How many chocolates are in each box?',
      optionA: '10 chocolates',
      optionB: '11 chocolates',
      optionC: '12 chocolates',
      optionD: '14 chocolates',
      correctAnswer: 'optionC',
      hint: '84 ÷ 7 = 12 chocolates.',
    },
    {
      testId: testObj.id,
      question: '3. A rabbit jumps 6 spaces each time and reaches 36. How many jumps did it make?',
      optionA: '5 jumps',
      optionB: '6 jumps',
      optionC: '7 jumps',
      optionD: '8 jumps',
      correctAnswer: 'optionB',
      hint: '36 ÷ 6 = 6 jumps.',
    },
    {
      testId: testObj.id,
      question: 'Passage: Rohan has 63 marbles. He shares them equally among 9 friends.\n\nQ4. How many marbles does each friend get?',
      optionA: '6 marbles',
      optionB: '7 marbles',
      optionC: '8 marbles',
      optionD: '9 marbles',
      correctAnswer: 'optionB',
      hint: '63 ÷ 9 = 7 marbles.',
    },
    {
      testId: testObj.id,
      question: 'Passage: A toy train moves 4 stations at a time and reaches 32 from 0.\n\nQ5. How many jumps were made?',
      optionA: '6 jumps',
      optionB: '7 jumps',
      optionC: '8 jumps',
      optionD: '9 jumps',
      correctAnswer: 'optionC',
      hint: '32 ÷ 4 = 8 jumps.',
    },
    {
      testId: testObj.id,
      question: 'Passage: A school has 6 sections with 15 students each participating in a maths activity.\n\nQ6. How many students participated altogether?',
      optionA: '80 students',
      optionB: '85 students',
      optionC: '90 students',
      optionD: '95 students',
      correctAnswer: 'optionC',
      hint: '6 × 15 = 90 students.',
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
    // --- Section A: MCQs ---
    {
      testId: testObj.id,
      question: 'Q1. Evaluate 9 × (10 + 4) using the distributive property.',
      optionA: '126',
      optionB: '94',
      optionC: '130',
      optionD: '116',
      correctAnswer: 'optionA',
      hint: '9 × (10 + 4) = (9 × 10) + (9 × 4) = 90 + 36 = 126.',
    },
    {
      testId: testObj.id,
      question: 'Q2. Which property states that 15 × 8 = 8 × 15?',
      optionA: 'Commutative Property',
      optionB: 'Associative Property',
      optionC: 'Distributive Property',
      optionD: 'Additive Identity',
      correctAnswer: 'optionA',
      hint: 'Changing the order of factors does not change the product: a × b = b × a.',
    },
    {
      testId: testObj.id,
      question: 'Q3. Find the product of 25 × 37 × 4 by suitable rearrangement.',
      optionA: '370',
      optionB: '3700',
      optionC: '37000',
      optionD: '925',
      correctAnswer: 'optionB',
      hint: '(25 × 4) × 37 = 100 × 37 = 3700.',
    },
    {
      testId: testObj.id,
      question: 'Q4. 12 × (100 − 2) is equal to:',
      optionA: '1200 − 2',
      optionB: '1200 − 24',
      optionC: '1200 + 24',
      optionD: '100 − 24',
      correctAnswer: 'optionB',
      hint: 'Distributive property over subtraction: 12 × 100 − 12 × 2 = 1200 − 24 = 1176.',
    },
    {
      testId: testObj.id,
      question: 'Q5. If a × b = 0, where a and b are whole numbers, then:',
      optionA: 'a must be 0',
      optionB: 'b must be 0',
      optionC: 'At least one of a or b must be 0',
      optionD: 'Neither a nor b can be 0',
      correctAnswer: 'optionC',
      hint: 'If product of two whole numbers is zero, at least one of them must be zero.',
    },

    {
      testId: testObj.id,
      question: 'Q6. In 96 ÷ 12 = 8, what is the role of 12?',
      optionA: 'Dividend',
      optionB: 'Divisor',
      optionC: 'Quotient',
      optionD: 'Remainder',
      correctAnswer: 'optionB',
      hint: '12 is the number by which 96 is divided, so 12 is the divisor.',
    },
    {
      testId: testObj.id,
      question: 'Q7. Find the remainder when 58 is divided by 9.',
      optionA: '2',
      optionB: '3',
      optionC: '4',
      optionD: '5',
      correctAnswer: 'optionC',
      hint: '58 = (9 × 6) + 4. So the remainder is 4.',
    },
    {
      testId: testObj.id,
      question: 'Q8. What is 0 ÷ 15?',
      optionA: '0',
      optionB: '15',
      optionC: '1',
      optionD: 'Not defined',
      correctAnswer: 'optionA',
      hint: 'Zero divided by any non-zero whole number is zero.',
    },
    {
      testId: testObj.id,
      question: 'Q9. In a division sum, Divisor = 12, Quotient = 7, and Remainder = 5. Find the Dividend.',
      optionA: '89',
      optionB: '84',
      optionC: '91',
      optionD: '95',
      correctAnswer: 'optionA',
      hint: 'Dividend = Divisor × Quotient + Remainder = 12 × 7 + 5 = 84 + 5 = 89.',
    },
    {
      testId: testObj.id,
      question: 'Q10. Which of the following division operations is NOT defined?',
      optionA: '15 ÷ 3',
      optionB: '0 ÷ 7',
      optionC: '12 ÷ 0',
      optionD: '24 ÷ 6',
      correctAnswer: 'optionC',
      hint: 'Division of any whole number by zero is not defined.',
    },

    {
      testId: testObj.id,
      question: 'Q11. To represent 21 ÷ 7 on a number line starting from 0, how many equal jumps of 7 units are needed?',
      optionA: '2 jumps',
      optionB: '3 jumps',
      optionC: '7 jumps',
      optionD: '21 jumps',
      correctAnswer: 'optionB',
      hint: '21 ÷ 7 = 3 equal jumps of size 7.',
    },
    {
      testId: testObj.id,
      question: 'Q12. Moving backwards from 15 to 0 in steps of 3 models which division?',
      optionA: '15 ÷ 5 = 3',
      optionB: '15 ÷ 3 = 5',
      optionC: '15 − 3 = 12',
      optionD: '3 ÷ 15 = 0',
      correctAnswer: 'optionB',
      hint: 'Starting at 15 and making 5 steps of 3 units backwards to 0 models 15 ÷ 3 = 5.',
    },
    {
      testId: testObj.id,
      question: 'Q13. Starting from 0, six equal jumps of 4 units reach which point on the number line?',
      optionA: '20',
      optionB: '24',
      optionC: '28',
      optionD: '16',
      correctAnswer: 'optionB',
      hint: '6 × 4 = 24.',
    },
    {
      testId: testObj.id,
      question: 'Q14. Showing 35 ÷ 5 on a number line requires equal jumps ending at:',
      optionA: '5',
      optionB: '7',
      optionC: '35',
      optionD: '40',
      correctAnswer: 'optionC',
      hint: 'The total length covered on the number line ends at the dividend (35).',
    },
    {
      testId: testObj.id,
      question: 'Q15. On a number line, 18 ÷ 6 needs:',
      optionA: '2 jumps of 6',
      optionB: '3 jumps of 6',
      optionC: '6 jumps of 6',
      optionD: '18 jumps of 6',
      correctAnswer: 'optionB',
      hint: '18 ÷ 6 = 3 jumps of size 6.',
    },

    // --- Section B: True / False ---
    {
      testId: testObj.id,
      question: 'Q1. Multiplying any whole number by 0 always results in 0.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only for odd numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Any whole number multiplied by 0 is 0.',
    },
    {
      testId: testObj.id,
      question: 'Q2. 12 × (5 − 2) = 12 × 5 − 2.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equal to 36',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. 12 × (5 − 2) = 12 × 3 = 36, whereas 12 × 5 − 2 = 60 − 2 = 58.',
    },
    {
      testId: testObj.id,
      question: 'Q3. Whole number multiplication is commutative.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only for positive numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. a × b = b × a for all whole numbers.',
    },
    {
      testId: testObj.id,
      question: 'Q4. 1 is the multiplicative identity for whole numbers.',
      optionA: 'True',
      optionB: 'False',
      optionC: '0 is the identity',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Multiplying any number by 1 yields that number.',
    },
    {
      testId: testObj.id,
      question: 'Q5. 15 × (10 + 4) = 15 × 10 + 15 × 4.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equal to 150',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Distributive property of multiplication over addition.',
    },

    {
      testId: testObj.id,
      question: 'Q6. 0 divided by any non-zero whole number is equal to 0.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Undefined',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. 0 ÷ a = 0 for any a ≠ 0.',
    },
    {
      testId: testObj.id,
      question: 'Q7. In division, the remainder can be equal to or greater than the divisor.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Always greater',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. The remainder must always be strictly smaller than the divisor.',
    },
    {
      testId: testObj.id,
      question: 'Q8. Division of whole numbers is commutative.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Sometimes true',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. E.g., 12 ÷ 4 ≠ 4 ÷ 12.',
    },
    {
      testId: testObj.id,
      question: 'Q9. In 77 ÷ 8 = 9 remainder 5, 77 is the dividend.',
      optionA: 'True',
      optionB: 'False',
      optionC: '77 is divisor',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. 77 is the total being divided.',
    },
    {
      testId: testObj.id,
      question: 'Q10. 50 ÷ 5 has a quotient of 10 and remainder 0.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Remainder is 5',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. 50 = 5 × 10 + 0.',
    },

    {
      testId: testObj.id,
      question: 'Q11. On a number line, 16 ÷ 4 can be shown by 4 backward jumps of 4 steps from 16 to 0.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Needs 16 jumps',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Repeated subtraction on a number line models division.',
    },
    {
      testId: testObj.id,
      question: 'Q12. Number-line division uses jumps of unequal length.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Random lengths allowed',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. Jumps on a number line for division must always be of equal size.',
    },
    {
      testId: testObj.id,
      question: 'Q13. 28 ÷ 7 reaches 28 after 4 jumps of 7 units starting from 0.',
      optionA: 'True',
      optionB: 'False',
      optionC: '7 jumps of 4 units',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. 4 × 7 = 28.',
    },
    {
      testId: testObj.id,
      question: 'Q14. Moving towards the left on a number line corresponds to repeated addition.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Corresponds to multiplication',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. Moving left corresponds to subtraction; moving right corresponds to addition.',
    },
    {
      testId: testObj.id,
      question: 'Q15. 18 ÷ 2 can be represented on a number line by 9 equal jumps of 2.',
      optionA: 'True',
      optionB: 'False',
      optionC: '2 jumps of 9',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. 9 × 2 = 18.',
    },

    // --- Section C: Word Problems ---
    {
      testId: testObj.id,
      question: 'Q1. A factory produces 25 bicycles every day. How many bicycles does it produce in 14 days?',
      optionA: '320 bicycles',
      optionB: '350 bicycles',
      optionC: '375 bicycles',
      optionD: '400 bicycles',
      correctAnswer: 'optionB',
      hint: '25 × 14 = 350 bicycles.',
    },
    {
      testId: testObj.id,
      question: 'Q2. An auditorium has 15 rows of chairs with 18 chairs in each row. How many chairs are there in total?',
      optionA: '250 chairs',
      optionB: '260 chairs',
      optionC: '270 chairs',
      optionD: '280 chairs',
      correctAnswer: 'optionC',
      hint: '15 × 18 = 270 chairs.',
    },

    {
      testId: testObj.id,
      question: 'Q3. 108 apples are distributed equally into 9 baskets. How many apples are placed in each basket?',
      optionA: '11 apples',
      optionB: '12 apples',
      optionC: '13 apples',
      optionD: '14 apples',
      correctAnswer: 'optionB',
      hint: '108 ÷ 9 = 12 apples.',
    },
    {
      testId: testObj.id,
      question: 'Q4. 78 notebooks are shared among 7 students equally. Find the quotient and remainder.',
      optionA: 'Quotient = 11, Remainder = 1',
      optionB: 'Quotient = 10, Remainder = 8',
      optionC: 'Quotient = 11, Remainder = 2',
      optionD: 'Quotient = 12, Remainder = 0',
      correctAnswer: 'optionA',
      hint: '78 = (7 × 11) + 1. Quotient = 11, Remainder = 1.',
    },

    {
      testId: testObj.id,
      question: 'Q5. A grasshopper jumps 5 spaces at a time on a number line starting at 0. How many jumps does it take to reach 35?',
      optionA: '5 jumps',
      optionB: '6 jumps',
      optionC: '7 jumps',
      optionD: '8 jumps',
      correctAnswer: 'optionC',
      hint: '35 ÷ 5 = 7 jumps.',
    },
    {
      testId: testObj.id,
      question: 'Q6. A toy car moves 4 units at a time from 0 to 32 on a number line. How many jumps does it make?',
      optionA: '6 jumps',
      optionB: '7 jumps',
      optionC: '8 jumps',
      optionD: '9 jumps',
      correctAnswer: 'optionC',
      hint: '32 ÷ 4 = 8 jumps.',
    },

    // --- Section D: Reading Comprehension / Passages ---
    {
      testId: testObj.id,
      question: 'Passage: A school bus carries 42 students per trip. It completes 6 trips every morning.\n\nQ1. How many total students are transported in a morning?',
      optionA: '240 students',
      optionB: '252 students',
      optionC: '262 students',
      optionD: '272 students',
      correctAnswer: 'optionB',
      hint: '42 × 6 = 252 students.',
    },
    {
      testId: testObj.id,
      question: 'Passage: A school bus carries 42 students per trip for 6 trips (252 students).\n\nQ2. If 12 students were absent across all trips, how many students were actually transported?',
      optionA: '240 students',
      optionB: '242 students',
      optionC: '250 students',
      optionD: '238 students',
      correctAnswer: 'optionA',
      hint: '252 - 12 = 240 students.',
    },

    {
      testId: testObj.id,
      question: 'Passage: A bakery bakes 120 muffins and packs them into boxes containing 8 muffins each.\n\nQ3. How many full boxes of muffins are packed?',
      optionA: '12 boxes',
      optionB: '14 boxes',
      optionC: '15 boxes',
      optionD: '16 boxes',
      correctAnswer: 'optionC',
      hint: '120 ÷ 8 = 15 boxes.',
    },
    {
      testId: testObj.id,
      question: 'Passage: In the bakery\'s calculation of 120 muffins divided by 8 to get 15 boxes:\n\nQ4. What term describes the number 8 in this equation?',
      optionA: 'Dividend',
      optionB: 'Divisor',
      optionC: 'Quotient',
      optionD: 'Remainder',
      correctAnswer: 'optionB',
      hint: '8 is the divisor.',
    },

    {
      testId: testObj.id,
      question: 'Passage: A kangaroo hops 6 units per leap on a track from 0 to 42.\n\nQ5. How many leaps did it take and what math operation is modeled?',
      optionA: '6 leaps, modeled by 42 ÷ 7',
      optionB: '7 leaps, modeled by 42 ÷ 6',
      optionC: '8 leaps, modeled by 42 - 6',
      optionD: '7 leaps, modeled by 42 + 6',
      correctAnswer: 'optionB',
      hint: '42 ÷ 6 = 7 leaps.',
    },
    {
      testId: testObj.id,
      question: 'Passage: A kangaroo hops 6 units per leap from 0 to reach 42 on a number line.\n\nQ6. If the kangaroo starts at 42 and hops backwards 6 units at a time to reach 0, which property of division on a number line is demonstrated?',
      optionA: 'Division as repeated addition',
      optionB: 'Division as repeated subtraction',
      optionC: 'Commutative law of division',
      optionD: 'Distributive law over zero',
      correctAnswer: 'optionB',
      hint: 'Backward jumps on a number line demonstrate division as repeated subtraction.',
    },

    // --- Teacher\'s Question Bank ---
    {
      testId: testObj.id,
      question: '1. 12 × (5 + 3) = ?',
      optionA: '90',
      optionB: '96',
      optionC: '100',
      optionD: '84',
      correctAnswer: 'optionB',
      hint: '12 × 8 = 96.',
    },
    {
      testId: testObj.id,
      question: '2. Which property is shown by: 14 × 6 = 6 × 14?',
      optionA: 'Associative',
      optionB: 'Commutative',
      optionC: 'Distributive',
      optionD: 'Closure',
      correctAnswer: 'optionB',
      hint: 'Commutative property of multiplication.',
    },
    {
      testId: testObj.id,
      question: '3. 99 ÷ 11 = ?',
      optionA: '8',
      optionB: '9',
      optionC: '10',
      optionD: '11',
      correctAnswer: 'optionB',
      hint: '99 ÷ 11 = 9.',
    },
    {
      testId: testObj.id,
      question: '4. In 67 ÷ 7, the remainder is:',
      optionA: '3',
      optionB: '4',
      optionC: '5',
      optionD: '6',
      correctAnswer: 'optionB',
      hint: '67 = (7 × 9) + 4. Remainder is 4.',
    },
    {
      testId: testObj.id,
      question: '5. 30 ÷ 5 on a number line requires how many equal jumps of 5?',
      optionA: '5 jumps',
      optionB: '6 jumps',
      optionC: '7 jumps',
      optionD: '8 jumps',
      correctAnswer: 'optionB',
      hint: '30 ÷ 5 = 6 jumps.',
    },
    {
      testId: testObj.id,
      question: '6. 8 × (10 − 3) = ?',
      optionA: '56',
      optionB: '64',
      optionC: '72',
      optionD: '48',
      correctAnswer: 'optionA',
      hint: '8 × 7 = 56.',
    },
    {
      testId: testObj.id,
      question: '7. The quotient in 144 ÷ 12 is:',
      optionA: '10',
      optionB: '12',
      optionC: '14',
      optionD: '16',
      correctAnswer: 'optionB',
      hint: '144 ÷ 12 = 12.',
    },
    {
      testId: testObj.id,
      question: '8. Six jumps of 5 starting from 0 reach:',
      optionA: '25',
      optionB: '30',
      optionC: '35',
      optionD: '40',
      correctAnswer: 'optionB',
      hint: '6 × 5 = 30.',
    },
    {
      testId: testObj.id,
      question: '9. Which number when divided by 8 gives a quotient of 9 and remainder of 2?',
      optionA: '72',
      optionB: '74',
      optionC: '76',
      optionD: '78',
      correctAnswer: 'optionB',
      hint: 'Dividend = (8 × 9) + 2 = 72 + 2 = 74.',
    },
    {
      testId: testObj.id,
      question: '10. 4 jumps of 7 on a number line represent:',
      optionA: '28 ÷ 7',
      optionB: '28 ÷ 4',
      optionC: '7 ÷ 4',
      optionD: '4 ÷ 7',
      correctAnswer: 'optionA',
      hint: '28 ÷ 7 = 4 jumps of 7.',
    },

    {
      testId: testObj.id,
      question: '1. Whole numbers are closed under multiplication.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only for even numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Product of two whole numbers is always a whole number.',
    },
    {
      testId: testObj.id,
      question: '2. Division of whole numbers is commutative.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Sometimes true',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. E.g., 12 ÷ 4 ≠ 4 ÷ 12.',
    },
    {
      testId: testObj.id,
      question: '3. Any non-zero whole number divided by itself equals 1.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equals 0',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. a ÷ a = 1 for a ≠ 0.',
    },
    {
      testId: testObj.id,
      question: '4. In division, the remainder is always strictly less than the divisor.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equal to divisor',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. If remainder >= divisor, division continues.',
    },
    {
      testId: testObj.id,
      question: '5. 24 ÷ 4 on a number line can be shown by 6 equal jumps of 4.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Needs 4 jumps of 6',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. 6 × 4 = 24.',
    },
    {
      testId: testObj.id,
      question: '6. 7 × (3 + 5) = 7 × 3 + 5.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equal to 56',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. 7 × (3 + 5) = 7 × 8 = 56, whereas 7 × 3 + 5 = 21 + 5 = 26.',
    },
    {
      testId: testObj.id,
      question: '7. In 81 ÷ 9 = 9, 81 is the dividend.',
      optionA: 'True',
      optionB: 'False',
      optionC: '81 is divisor',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '8. Moving left on a number line represents repeated addition.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Represents multiplication',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. Moving left represents subtraction.',
    },
    {
      testId: testObj.id,
      question: '9. 0 × 1234 = 1234.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equals 1',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. Anything multiplied by 0 is 0.',
    },
    {
      testId: testObj.id,
      question: '10. 45 ÷ 6 has a quotient of 7 and remainder of 3.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Quotient is 6',
      optionD: 'Remainder is 5',
      correctAnswer: 'optionA',
      hint: 'True. 45 = (6 × 7) + 3.',
    },

    {
      testId: testObj.id,
      question: '1. A store has 12 boxes with 15 pens each. How many pens are there in total?',
      optionA: '150 pens',
      optionB: '165 pens',
      optionC: '180 pens',
      optionD: '195 pens',
      correctAnswer: 'optionC',
      hint: '12 × 15 = 180 pens.',
    },
    {
      testId: testObj.id,
      question: '2. 105 candies are packed equally into bags of 7. How many bags are needed?',
      optionA: '13 bags',
      optionB: '14 bags',
      optionC: '15 bags',
      optionD: '16 bags',
      correctAnswer: 'optionC',
      hint: '105 ÷ 7 = 15 bags.',
    },
    {
      testId: testObj.id,
      question: '3. A frog jumps 3 units each time from 0 to 27 on a number line. How many jumps did it take?',
      optionA: '8 jumps',
      optionB: '9 jumps',
      optionC: '10 jumps',
      optionD: '11 jumps',
      correctAnswer: 'optionB',
      hint: '27 ÷ 3 = 9 jumps.',
    },
    {
      testId: testObj.id,
      question: 'Passage: Priya has 56 stamps and pastes 8 stamps per page in her album.\n\nQ4. How many pages does she fill completely?',
      optionA: '6 pages',
      optionB: '7 pages',
      optionC: '8 pages',
      optionD: '9 pages',
      correctAnswer: 'optionB',
      hint: '56 ÷ 8 = 7 pages.',
    },
    {
      testId: testObj.id,
      question: 'Passage: A cyclist travels 5 km per hour for 8 hours along a straight highway.\n\nQ5. What total distance is covered on the highway scale?',
      optionA: '35 km',
      optionB: '40 km',
      optionC: '45 km',
      optionD: '50 km',
      correctAnswer: 'optionB',
      hint: '5 × 8 = 40 km.',
    },
    {
      testId: testObj.id,
      question: 'Passage: A farmer harvests 14 crates of oranges with 20 oranges in each crate.\n\nQ6. How many oranges did the farmer harvest in total?',
      optionA: '260 oranges',
      optionB: '270 oranges',
      optionC: '280 oranges',
      optionD: '290 oranges',
      correctAnswer: 'optionC',
      hint: '14 × 20 = 280 oranges.',
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

    // CLASS 6: WHOLE NUMBERS SAMPLE TEST 1 (57 Questions)
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
export async function seedSampleDataIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));

    if (snap.empty) {
      await publishClass6To10DefaultTests(false);
      return;
    }

    // Check existing Whole Numbers test papers
    const wholeNumbersDocs = snap.docs.filter((docSnap) => {
      const title = docSnap.data().title || '';
      return title.includes('Whole Numbers');
    });

    let hasSampleTest1 = false;
    let hasSampleTest2 = false;

    for (const docSnap of wholeNumbersDocs) {
      const testId = docSnap.id;
      const title = docSnap.data().title || '';
      const questions = await getQuestionsByTestId(testId);
      const hasUnorderedQuestions = questions.some((q) => q.orderIndex === undefined || q.orderIndex === 9999);

      // Check if raw questions in Firestore still contain legacy section/topic prefixes
      const rawQSnap = await getDocs(query(collection(db, QUESTIONS_COL), where('testId', '==', testId)));
      const hasDirtyQuestions = rawQSnap.docs.some((d) => {
        const text = d.data().question || '';
        return (
          text.includes('[SECTION') ||
          text.includes('Topic') ||
          text.includes('MCQ') ||
          text.includes('True/False') ||
          text.includes('Word Problem') ||
          text.includes('Reading Comprehension') ||
          text.includes("Teacher's") ||
          text.startsWith('Q1.') ||
          text.startsWith('Q2.') ||
          text.startsWith('× ') ||
          text.startsWith('÷ ') ||
          text.startsWith('+ ')
        );
      });

      if (title.includes('Sample Test 1')) {
        if (questions.length < 55 || hasUnorderedQuestions || hasDirtyQuestions) {
          console.log(`Deleting outdated Sample Test 1 paper (${testId})...`);
          await deleteTest(testId);
        } else {
          hasSampleTest1 = true;
        }
      } else if (title.includes('Sample Test 2')) {
        if (questions.length < 65 || hasUnorderedQuestions || hasDirtyQuestions) {
          console.log(`Deleting outdated Sample Test 2 paper (${testId})...`);
          await deleteTest(testId);
        } else {
          hasSampleTest2 = true;
        }
      } else {
        console.log(`Deleting legacy/unlabeled Whole Numbers test paper (${testId})...`);
        await deleteTest(testId);
      }
    }

    if (!hasSampleTest1) {
      console.log('Publishing CBSE Class 6: Whole Numbers – Sample Test 1...');
      await createWholeNumbersTestPaper1();
    }
    if (!hasSampleTest2) {
      console.log('Publishing CBSE Class 6: Whole Numbers – Sample Test 2...');
      await createWholeNumbersTestPaper2();
    }
  } catch (error) {
    console.error('Error seeding sample data:', error);
  }
}
