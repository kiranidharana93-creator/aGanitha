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
        question: data.question || '',
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
 * Helper to populate official Class 6 Whole Numbers test paper and questions
 */
export async function createWholeNumbersTestPaper(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Whole Numbers (Multiplication, Division & Number Lines)',
    class: 'Class 6',
    duration: 45,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    // --- SECTION A: MCQs ---
    // Topic 1: Multiplication
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 1] Topic: Multiplication\nQ1. Which property is shown by: (2 × 3) × 4 = 2 × (3 × 4)?',
      optionA: 'Commutative',
      optionB: 'Associative',
      optionC: 'Distributive',
      optionD: 'Identity',
      correctAnswer: 'optionB',
      hint: 'Associative property states that grouping in multiplication does not change the product.',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 2] Topic: Multiplication\nQ2. 6 × (5 + 2) = ?',
      optionA: '30',
      optionB: '35',
      optionC: '42',
      optionD: '72',
      correctAnswer: 'optionC',
      hint: '6 × (5 + 2) = 6 × 7 = 42.',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 3] Topic: Multiplication\nQ3. Which property is shown by: (4 × 5) × 2 = 4 × (5 × 2)?',
      optionA: 'Identity',
      optionB: 'Associative',
      optionC: 'Commutative',
      optionD: 'Closure',
      correctAnswer: 'optionB',
      hint: 'Grouping property in multiplication is called Associative property.',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 4] Topic: Multiplication\nQ4. 9 × (10 − 2) = ?',
      optionA: '72',
      optionB: '90',
      optionC: '18',
      optionD: '81',
      correctAnswer: 'optionA',
      hint: '9 × 8 = 72.',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 5] Topic: Multiplication\nQ5. 5 × (6 + 4) is equal to:',
      optionA: '5 × 6 + 4',
      optionB: '5 × 6 + 5 × 4',
      optionC: '6 + 4 × 5',
      optionD: '10 × 5 × 5',
      correctAnswer: 'optionB',
      hint: 'Distributive law: a × (b + c) = a × b + a × c.',
    },

    // Topic 2: Division
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 6] Topic: Division\nQ6. In 56 ÷ 7 = 8, the divisor is:',
      optionA: '56',
      optionB: '7',
      optionC: '8',
      optionD: '0',
      correctAnswer: 'optionB',
      hint: 'The number doing the dividing (7) is the divisor.',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 7] Topic: Division\nQ7. In 63 ÷ 8 = 7 remainder 7, the remainder is:',
      optionA: '63',
      optionB: '8',
      optionC: '7',
      optionD: '56',
      correctAnswer: 'optionC',
      hint: 'The leftover value after division (7) is the remainder.',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 8] Topic: Division\nQ8. In 72 ÷ 9 = 8, the dividend is:',
      optionA: '72',
      optionB: '9',
      optionC: '8',
      optionD: '0',
      correctAnswer: 'optionA',
      hint: 'The number being divided (72) is the dividend.',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 9] Topic: Division\nQ9. The remainder when 28 is divided by 5 is:',
      optionA: '5',
      optionB: '4',
      optionC: '3',
      optionD: '2',
      correctAnswer: 'optionC',
      hint: '28 = (5 × 5) + 3, so remainder is 3.',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 10] Topic: Division\nQ10. Which has remainder 0?',
      optionA: '25 ÷ 4',
      optionB: '30 ÷ 5',
      optionC: '19 ÷ 2',
      optionD: '41 ÷ 6',
      correctAnswer: 'optionB',
      hint: '30 ÷ 5 = 6 cleanly with remainder 0.',
    },

    // Topic 3: Representing Division on Number Lines
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 11] Topic: Number Lines\nQ11. To represent 12 ÷ 3 on a number line, we make jumps of:',
      optionA: '12',
      optionB: '6',
      optionC: '3',
      optionD: '1',
      correctAnswer: 'optionC',
      hint: 'Jumps on a number line represent the size of the divisor (3).',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 12] Topic: Number Lines\nQ12. 15 ÷ 5 is represented by:',
      optionA: '3 jumps of 5',
      optionB: '5 jumps of 3',
      optionC: '15 jumps of 1',
      optionD: 'Both A and B',
      correctAnswer: 'optionD',
      hint: '15 ÷ 5 = 3 (3 jumps of 5 or 5 jumps of 3).',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 13] Topic: Number Lines\nQ13. To show 18 ÷ 6, the number line ends at:',
      optionA: '6',
      optionB: '12',
      optionC: '18',
      optionD: '24',
      correctAnswer: 'optionC',
      hint: 'The total length on the number line ends at the dividend (18).',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 14] Topic: Number Lines\nQ14. 16 ÷ 4 requires:',
      optionA: '2 jumps',
      optionB: '3 jumps',
      optionC: '4 jumps',
      optionD: '5 jumps',
      correctAnswer: 'optionC',
      hint: '16 ÷ 4 = 4 equal jumps.',
    },
    {
      testId: testObj.id,
      question: '[SECTION A - MCQ 15] Topic: Number Lines\nQ15. Starting from 0, four jumps of 2 reach:',
      optionA: '6',
      optionB: '8',
      optionC: '10',
      optionD: '12',
      correctAnswer: 'optionB',
      hint: '4 × 2 = 8.',
    },

    // --- SECTION B: True / False ---
    // Topic 1: Multiplication
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 1] Topic: Multiplication\nQ1. Multiplication distributes over addition.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only for positive numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. a × (b + c) = a × b + a × c.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 2] Topic: Multiplication\nQ2. Multiplication distributes over subtraction.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only for even numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. a × (b - c) = a × b - a × c.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 3] Topic: Multiplication\nQ3. 4 × (5 + 2) = 4 × 5 + 2.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equal to 22',
      optionD: 'Equal to 28',
      correctAnswer: 'optionB',
      hint: 'False. 4 × (5 + 2) = 28, but 4 × 5 + 2 = 22.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 4] Topic: Multiplication\nQ4. Whole number multiplication is associative.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only for non-zero numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. (a × b) × c = a × (b × c).',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 5] Topic: Multiplication\nQ5. 1 is the multiplicative identity.',
      optionA: 'True',
      optionB: 'False',
      optionC: '0 is identity',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Any number multiplied by 1 remains unchanged.',
    },

    // Topic 2: Division
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 6] Topic: Division\nQ6. Division by zero is possible.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equals zero',
      optionD: 'Equals one',
      correctAnswer: 'optionB',
      hint: 'False. Division by zero is undefined in mathematics.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 7] Topic: Division\nQ7. The quotient can be zero.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only for negative numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. E.g., 0 ÷ 5 = 0.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 8] Topic: Division\nQ8. The remainder is always less than the divisor.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equal to divisor',
      optionD: 'Greater than divisor',
      correctAnswer: 'optionA',
      hint: 'True. If remainder >= divisor, division can continue.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 9] Topic: Division\nQ9. 36 ÷ 6 has remainder 6.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Remainder is 1',
      optionD: 'Remainder is 6',
      correctAnswer: 'optionB',
      hint: 'False. 36 ÷ 6 = 6 with remainder 0.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 10] Topic: Division\nQ10. Dividend = Divisor × Quotient + Remainder.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Divisor = Quotient + Remainder',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Fundamental division formula.',
    },

    // Topic 3: Number Line Division
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 11] Topic: Number Line Division\nQ11. Division can be represented by equal jumps on a number line.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only addition can',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Equal jumps represent division on a number line.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 12] Topic: Number Line Division\nQ12. 12 ÷ 3 needs four equal jumps of 3.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Needs three jumps of 4',
      optionD: 'Needs 12 jumps of 3',
      correctAnswer: 'optionA',
      hint: 'True. 4 jumps of 3 units = 12.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 13] Topic: Number Line Division\nQ13. Number-line division uses unequal jumps.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Random length jumps',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. Jumps must be equal in size.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 14] Topic: Number Line Division\nQ14. Repeated subtraction helps in division on a number line.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Repeated addition only',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True. Moving backwards on a number line is repeated subtraction.',
    },
    {
      testId: testObj.id,
      question: '[SECTION B - True/False 15] Topic: Number Line Division\nQ15. 20 ÷ 5 reaches 20 after four jumps of 5.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Five jumps of 4',
      optionD: 'Ten jumps of 2',
      correctAnswer: 'optionA',
      hint: 'True. 4 × 5 = 20.',
    },

    // --- SECTION C: Word Problems ---
    // Topic 1: Multiplication
    {
      testId: testObj.id,
      question: '[SECTION C - Word Problem 1] Topic: Multiplication\nQ1. A classroom has 6 rows of benches. Each row has 8 benches. How many benches are there in total?',
      optionA: '14 benches',
      optionB: '48 benches',
      optionC: '42 benches',
      optionD: '56 benches',
      correctAnswer: 'optionB',
      hint: '6 × 8 = 48 benches.',
    },
    {
      testId: testObj.id,
      question: '[SECTION C - Word Problem 2] Topic: Multiplication\nQ2. A gardener plants 5 rows of 12 flowers. How many flowers are planted?',
      optionA: '50 flowers',
      optionB: '60 flowers',
      optionC: '70 flowers',
      optionD: '48 flowers',
      correctAnswer: 'optionB',
      hint: '5 × 12 = 60 flowers.',
    },

    // Topic 2: Division
    {
      testId: testObj.id,
      question: '[SECTION C - Word Problem 3] Topic: Division\nQ3. 45 chocolates are shared equally among 5 children. How many chocolates does each child get?',
      optionA: '8 chocolates',
      optionB: '9 chocolates',
      optionC: '10 chocolates',
      optionD: '5 chocolates',
      correctAnswer: 'optionB',
      hint: '45 ÷ 5 = 9 chocolates.',
    },
    {
      testId: testObj.id,
      question: '[SECTION C - Word Problem 4] Topic: Division\nQ4. 53 mangoes are shared among 5 children. Find the quotient and remainder.',
      optionA: 'Quotient = 10, Remainder = 3',
      optionB: 'Quotient = 9, Remainder = 8',
      optionC: 'Quotient = 10, Remainder = 0',
      optionD: 'Quotient = 11, Remainder = 2',
      correctAnswer: 'optionA',
      hint: '53 ÷ 5 = 10 with remainder 3.',
    },

    // Topic 3: Representing Division on Number Lines
    {
      testId: testObj.id,
      question: '[SECTION C - Word Problem 5] Topic: Number Line Division\nQ5. A frog jumps 4 steps at a time. It starts at 0 and reaches 20. How many jumps did it make?',
      optionA: '4 jumps',
      optionB: '5 jumps',
      optionC: '6 jumps',
      optionD: '20 jumps',
      correctAnswer: 'optionB',
      hint: '20 ÷ 4 = 5 jumps.',
    },
    {
      testId: testObj.id,
      question: '[SECTION C - Word Problem 6] Topic: Number Line Division\nQ6. A toy car moves 3 units at a time from 0 to 18. How many jumps does it make?',
      optionA: '5 jumps',
      optionB: '6 jumps',
      optionC: '7 jumps',
      optionD: '8 jumps',
      correctAnswer: 'optionB',
      hint: '18 ÷ 3 = 6 jumps.',
    },

    // --- SECTION D: Reading Comprehension ---
    // Topic 1: Multiplication
    {
      testId: testObj.id,
      question: '[SECTION D - Reading Comprehension 1] Topic: Multiplication Passage\nPassage: A farmer has 7 baskets. Each basket contains 9 apples.\nQ1. How many apples are there in all?',
      optionA: '56 apples',
      optionB: '63 apples',
      optionC: '72 apples',
      optionD: '49 apples',
      correctAnswer: 'optionB',
      hint: '7 × 9 = 63 apples.',
    },
    {
      testId: testObj.id,
      question: '[SECTION D - Reading Comprehension 2] Topic: Multiplication Passage\nPassage: A farmer has 7 baskets with 9 apples each.\nQ2. If 5 apples spoil, how many are left?',
      optionA: '58 apples',
      optionB: '60 apples',
      optionC: '63 apples',
      optionD: '55 apples',
      correctAnswer: 'optionA',
      hint: '63 − 5 = 58 apples.',
    },

    // Topic 2: Division
    {
      testId: testObj.id,
      question: '[SECTION D - Reading Comprehension 3] Topic: Division Passage\nPassage: A librarian has 48 books. She arranges them equally on 6 shelves.\nQ3. How many books are on each shelf?',
      optionA: '6 books',
      optionB: '8 books',
      optionC: '12 books',
      optionD: '48 books',
      correctAnswer: 'optionB',
      hint: '48 ÷ 6 = 8 books.',
    },
    {
      testId: testObj.id,
      question: '[SECTION D - Reading Comprehension 4] Topic: Division Passage\nPassage: A librarian has 48 books on 6 shelves.\nQ4. What is the dividend in this division?',
      optionA: '48',
      optionB: '6',
      optionC: '8',
      optionD: '0',
      correctAnswer: 'optionA',
      hint: '48 is the dividend.',
    },

    // Topic 3: Representing Division on Number Lines
    {
      testId: testObj.id,
      question: '[SECTION D - Reading Comprehension 5] Topic: Number Line Passage\nPassage: A child plays a hopping game. She jumps 4 spaces each time and reaches 16 starting from 0.\nQ5. How many jumps did she make?',
      optionA: '3 jumps',
      optionB: '4 jumps',
      optionC: '5 jumps',
      optionD: '6 jumps',
      correctAnswer: 'optionB',
      hint: '16 ÷ 4 = 4 jumps.',
    },
    {
      testId: testObj.id,
      question: '[SECTION D - Reading Comprehension 6] Topic: Number Line Passage\nPassage: A child plays a hopping game (jumps 4 spaces each time to reach 16).\nQ6. Which operation is represented on the number line?',
      optionA: 'Addition only',
      optionB: 'Division by repeated subtraction',
      optionC: 'Fraction addition',
      optionD: 'Random counting',
      correctAnswer: 'optionB',
      hint: 'Division on a number line is repeated subtraction.',
    },

    // --- TEACHER\'S QUESTION BANK ---
    // MCQs (10)
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - MCQs 1] 1. 8 × (4 + 1) = ?',
      optionA: '32',
      optionB: '40',
      optionC: '13',
      optionD: '45',
      correctAnswer: 'optionB',
      hint: '8 × 5 = 40.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - MCQs 2] 2. Which property is shown by: (3 × 6) × 5 = 3 × (6 × 5)?',
      optionA: 'Identity',
      optionB: 'Associative',
      optionC: 'Commutative',
      optionD: 'Closure',
      correctAnswer: 'optionB',
      hint: 'Associative property of multiplication.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - MCQs 3] 3. 84 ÷ 7 = ?',
      optionA: '11',
      optionB: '12',
      optionC: '13',
      optionD: '14',
      correctAnswer: 'optionB',
      hint: '84 ÷ 7 = 12.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - MCQs 4] 4. In 49 ÷ 8, the remainder is:',
      optionA: '1',
      optionB: '2',
      optionC: '3',
      optionD: '4',
      correctAnswer: 'optionA',
      hint: '49 = 8 × 6 + 1. Remainder is 1.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - MCQs 5] 5. 24 ÷ 6 on a number line needs:',
      optionA: '2 jumps',
      optionB: '3 jumps',
      optionC: '4 jumps',
      optionD: '6 jumps',
      correctAnswer: 'optionC',
      hint: '24 ÷ 6 = 4 jumps.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - MCQs 6] 6. 7 × (9 − 2) = ?',
      optionA: '49',
      optionB: '56',
      optionC: '63',
      optionD: '35',
      correctAnswer: 'optionA',
      hint: '7 × 7 = 49.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - MCQs 7] 7. The quotient in 90 ÷ 9 is:',
      optionA: '9',
      optionB: '10',
      optionC: '11',
      optionD: '81',
      correctAnswer: 'optionB',
      hint: '90 ÷ 9 = 10.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - MCQs 8] 8. Five jumps of 4 reach:',
      optionA: '16',
      optionB: '18',
      optionC: '20',
      optionD: '24',
      correctAnswer: 'optionC',
      hint: '5 × 4 = 20.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - MCQs 9] 9. Which is divisible by 5?',
      optionA: '42',
      optionB: '55',
      optionC: '73',
      optionD: '88',
      correctAnswer: 'optionB',
      hint: '55 ends in 5, so it is divisible by 5.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - MCQs 10] 10. 3 jumps of 6 represent:',
      optionA: '18 ÷ 6',
      optionB: '18 ÷ 3',
      optionC: '6 ÷ 3',
      optionD: '3 ÷ 6',
      correctAnswer: 'optionB',
      hint: '18 ÷ 3 = 6.',
    },

    // True / False (10)
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - True/False 1] 1. Multiplication is closed for whole numbers.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Only for non-zero numbers',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - True/False 2] 2. 0 is the multiplicative identity.',
      optionA: 'True',
      optionB: 'False',
      optionC: '1 is identity',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. 1 is the multiplicative identity.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - True/False 3] 3. Division by 1 leaves the number unchanged.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Changes the number',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - True/False 4] 4. The remainder can be greater than the divisor.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Always greater',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. Remainder must be less than divisor.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - True/False 5] 5. 15 ÷ 3 can be shown by five jumps of 3.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Three jumps of 5',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - True/False 6] 6. 9 × (2 + 4) = 9 × 2 + 9 × 4.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equal to 50',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - True/False 7] 7. In 64 ÷ 8 = 8, 64 is the divisor.',
      optionA: 'True',
      optionB: 'False',
      optionC: '64 is quotient',
      optionD: 'None of the above',
      correctAnswer: 'optionB',
      hint: 'False. 64 is dividend.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - True/False 8] 8. Number-line division uses repeated subtraction.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Repeated addition only',
      optionD: 'None of the above',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - True/False 9] 9. 1 × 999 = 999.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Equals 1',
      optionD: 'Equals 0',
      correctAnswer: 'optionA',
      hint: 'True.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - True/False 10] 10. 27 ÷ 5 has remainder 5.',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Remainder is 2',
      optionD: 'Remainder is 0',
      correctAnswer: 'optionB',
      hint: 'False. Remainder is 2.',
    },

    // Word Problems & Reading Comprehension (6)
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - Word Problem 1] 1. A shopkeeper has 8 boxes with 9 pens each. How many pens are there?',
      optionA: '64 pens',
      optionB: '72 pens',
      optionC: '80 pens',
      optionD: '81 pens',
      correctAnswer: 'optionB',
      hint: '8 × 9 = 72 pens.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - Word Problem 2] 2. 96 oranges are packed equally into 8 bags. How many oranges are in each bag?',
      optionA: '10 oranges',
      optionB: '11 oranges',
      optionC: '12 oranges',
      optionD: '14 oranges',
      correctAnswer: 'optionC',
      hint: '96 ÷ 8 = 12 oranges.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - Word Problem 3] 3. A rabbit jumps 5 spaces each time and reaches 30. How many jumps did it make?',
      optionA: '5 jumps',
      optionB: '6 jumps',
      optionC: '7 jumps',
      optionD: '8 jumps',
      correctAnswer: 'optionB',
      hint: '30 ÷ 5 = 6 jumps.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - Passage 4] Passage: Meena has 42 marbles. She shares them equally among 6 friends.\nQ4. How many marbles does each friend get?',
      optionA: '6 marbles',
      optionB: '7 marbles',
      optionC: '8 marbles',
      optionD: '9 marbles',
      correctAnswer: 'optionB',
      hint: '42 ÷ 6 = 7 marbles.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - Passage 5] Passage: A train moves 4 stations at a time on a game board and reaches 28 from 0.\nQ5. How many jumps were made?',
      optionA: '6 jumps',
      optionB: '7 jumps',
      optionC: '8 jumps',
      optionD: '9 jumps',
      correctAnswer: 'optionB',
      hint: '28 ÷ 4 = 7 jumps.',
    },
    {
      testId: testObj.id,
      question: '[Teacher\'s Question Bank - Passage 6] Passage: A school has 5 sections with 18 students each participating in a maths activity.\nQ6. How many students participated altogether?',
      optionA: '80 students',
      optionB: '85 students',
      optionC: '90 students',
      optionD: '95 students',
      correctAnswer: 'optionC',
      hint: '5 × 18 = 90 students.',
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

    // CLASS 6: WHOLE NUMBERS TEST PAPER
    await createWholeNumbersTestPaper();

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

    let hasFullWholeNumbersTest = false;

    for (const docSnap of wholeNumbersDocs) {
      const testId = docSnap.id;
      const questions = await getQuestionsByTestId(testId);
      const hasUnorderedQuestions = questions.some((q) => q.orderIndex === undefined || q.orderIndex === 9999);
      
      if (questions.length < 35 || hasUnorderedQuestions) {
        console.log(`Deleting outdated Whole Numbers test paper (${testId})...`);
        await deleteTest(testId);
      } else {
        hasFullWholeNumbersTest = true;
      }
    }

    if (!hasFullWholeNumbersTest) {
      console.log('Publishing full CBSE Class 6: Whole Numbers test paper with ordered questions...');
      await createWholeNumbersTestPaper();
    }
  } catch (error) {
    console.error('Error seeding sample data:', error);
  }
}
