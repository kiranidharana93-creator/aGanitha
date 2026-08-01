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
    return snap.docs.map((d) => {
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
      };
    });
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
    correctAnswer: normalizeAnswerKey(qData.correctAnswer),
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
      },
      {
        testId: test6.id,
        question: 'What is the predecessor of 10,000?',
        optionA: '9,999',
        optionB: '10,001',
        optionC: '9,990',
        optionD: '9,000',
        correctAnswer: 'optionA',
      },
      {
        testId: test6.id,
        question: 'An angle whose measure is less than 90° is called an:',
        optionA: 'Acute angle',
        optionB: 'Obtuse angle',
        optionC: 'Right angle',
        optionD: 'Straight angle',
        correctAnswer: 'optionA',
      },
      {
        testId: test6.id,
        question: 'What is the perimeter of a square with side length 7 cm?',
        optionA: '28 cm',
        optionB: '14 cm',
        optionC: '49 cm',
        optionD: '21 cm',
        correctAnswer: 'optionA',
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
      },
      {
        testId: test7.id,
        question: 'Solve for x in the equation: 3x + 7 = 22',
        optionA: 'x = 5',
        optionB: 'x = 4',
        optionC: 'x = 6',
        optionD: 'x = 3',
        correctAnswer: 'optionA',
      },
      {
        testId: test7.id,
        question: 'The complementary angle of 35° is:',
        optionA: '55°',
        optionB: '145°',
        optionC: '65°',
        optionD: '45°',
        correctAnswer: 'optionA',
      },
      {
        testId: test7.id,
        question: 'Find the area of a triangle with base = 10 cm and height = 6 cm.',
        optionA: '30 sq cm',
        optionB: '60 sq cm',
        optionC: '16 sq cm',
        optionD: '20 sq cm',
        correctAnswer: 'optionA',
      },
    ];
    for (const q of test7Questions) await createQuestion(q);

    // CLASS 8 TEST PAPER
    const test8 = await createTest({
      title: 'CBSE Class 8: Rational Numbers & Linear Equations',
      class: 'Class 8',
      duration: 15,
      published: true,
    });
    const test8Questions: Omit<Question, 'id'>[] = [
      {
        testId: test8.id,
        question: 'What is the additive inverse of -5/9?',
        optionA: '5/9',
        optionB: '-9/5',
        optionC: '9/5',
        optionD: '1',
        correctAnswer: 'optionA',
      },
      {
        testId: test8.id,
        question: 'Solve for x: 5x - 4 = 2x + 11',
        optionA: 'x = 5',
        optionB: 'x = 3',
        optionC: 'x = 7',
        optionD: 'x = 4',
        correctAnswer: 'optionA',
      },
      {
        testId: test8.id,
        question: 'What is the value of 2³ × 2⁴?',
        optionA: '128',
        optionB: '64',
        optionC: '256',
        optionD: '32',
        correctAnswer: 'optionA',
      },
      {
        testId: test8.id,
        question: 'The sum of all interior angles of a pentagon (5 sides) is:',
        optionA: '540°',
        optionB: '360°',
        optionC: '720°',
        optionD: '180°',
        correctAnswer: 'optionA',
      },
    ];
    for (const q of test8Questions) await createQuestion(q);

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
      },
      {
        testId: test9.id,
        question: 'What is the degree of the non-zero constant polynomial?',
        optionA: '0',
        optionB: '1',
        optionC: 'Not defined',
        optionD: '2',
        correctAnswer: 'optionA',
      },
      {
        testId: test9.id,
        question: 'If (x + 2) is a factor of x³ + 3x² + 2x + k, then k is equal to:',
        optionA: '0',
        optionB: '2',
        optionC: '-2',
        optionD: '4',
        correctAnswer: 'optionA',
      },
      {
        testId: test9.id,
        question: 'The perpendicular distance of the point P(3, 4) from the y-axis is:',
        optionA: '3 units',
        optionB: '4 units',
        optionC: '5 units',
        optionD: '7 units',
        correctAnswer: 'optionA',
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
      },
      {
        testId: test10.id,
        question: 'If sin θ = 3/5, then the value of cos θ is:',
        optionA: '4/5',
        optionB: '5/4',
        optionC: '3/4',
        optionD: '1/2',
        correctAnswer: 'optionA',
      },
      {
        testId: test10.id,
        question: 'What is the value of (sin² 30° + cos² 30°)?',
        optionA: '1',
        optionB: '0',
        optionC: '1/2',
        optionD: '2',
        correctAnswer: 'optionA',
      },
      {
        testId: test10.id,
        question: 'If α and β are the zeroes of f(x) = x² - 5x + 6, then α + β is:',
        optionA: '5',
        optionB: '6',
        optionC: '-5',
        optionD: '-6',
        correctAnswer: 'optionA',
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
 * or contains legacy Class 11/12 tests without Class 6.
 */
export async function seedSampleDataIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));
    if (snap.empty) {
      await publishClass6To10DefaultTests(false);
      return;
    }

    const tests = snap.docs.map((docSnap) => docSnap.data());
    const hasClass6 = tests.some((t) => t.class === 'Class 6');
    const hasLegacy = tests.some((t) => t.class === 'Class 11' || t.class === 'Class 12');

    if (!hasClass6 || hasLegacy) {
      console.log('Migrating tests to official CBSE Class 6 to 10 papers...');
      await publishClass6To10DefaultTests(true);
    }
  } catch (error) {
    console.error('Error seeding sample data:', error);
  }
}
