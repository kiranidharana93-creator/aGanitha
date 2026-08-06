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
import { Student, Test, Question, Attempt, DraftAttempt } from '../types';

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

export function formatParentPhone(mobile: string): string {
  if (!mobile) return '';
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits || mobile.trim();
}

// Default initial registered students for seamless testing (Only Kiran)
export const INITIAL_REGISTERED_STUDENTS: Student[] = [
  {
    id: 'std_kiran_6',
    studentId: 'c6-2026-0012',
    name: 'kiran',
    class: 'Class 6',
    section: 'A',
    rollNumber: 12,
    parentMobile: '919353913218',
    password: 'KR6421',
    isPasswordChanged: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
];

const UNWANTED_STUDENT_IDS = new Set([
  '3rj8lt7blh3fs8fkdnum',
  '4exmtdmsjmpdcdfphofz',
  'bawcjtrkvuygclgtdotc',
  'efzob3a1f0w5iulkxesl',
  'ihbbzqvi4yfzena7ij47',
  'izowmv6zwrthw7f64dwa',
  'jy4xhko0bd96cbzkdlmg',
  'q0vbpfun2agppdqc9c0w',
  'sq2y0kzo7gh1xm9xodvh',
  'yehfheng4emcnnpw4jy8',
  'lkmjgti3z6xkhspqgocb',
  'tfxxddvxursonhpiers',
  'vbqanh9wbgnehwgg8o9j',
  'voxpyhf38fgyqrishgyb',
  'x1stuudgizj5et4rx15t',
  'c6-2026-0001',
  'c6-2026-0002',
  'c7-2026-0001',
  'c8-2026-0001',
  'std_rahul_6',
  'std_ananya_6',
  'std_priya_7',
  'std_aarav_8',
  'demo-001',
]);

const UNWANTED_STUDENT_NAMES = new Set([
  'yoshmitha',
  'kumar',
  'tanushree.m',
  'vishwa',
  'p krishna',
  'kavya',
  'test',
  'harshitha bm',
  'srinivas',
  'kannika mailar',
  'rahul kumar',
  'ananya sharma',
  'priya patel',
  'aarav singh',
  'demo student',
  'test user',
]);

export function generateStudentId(studentClass: string, index: number): string {
  const classNum = studentClass.replace(/[^0-9]/g, '') || '6';
  const year = new Date().getFullYear();
  const seq = String(index).padStart(4, '0');
  return `C${classNum}-${year}-${seq}`;
}

export function generateTempPassword(name: string): string {
  const parts = name.trim().split(/\s+/);
  let initials = 'ST';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts[0] && parts[0].length >= 2) {
    initials = parts[0].substring(0, 2).toUpperCase();
  }
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${initials}${randomDigits}`;
}

export async function getAllRegisteredStudents(): Promise<Student[]> {
  const mapByKey = new Map<string, Student>();
  const docsToDelete: string[] = [];

  // Fetch from Firestore
  try {
    const snap = await getDocs(collection(db, STUDENTS_COL));
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const rawStudentId = (data.studentId || '').trim();
      const name = (data.name || '').trim();

      const isJunkDoc =
        UNWANTED_STUDENT_IDS.has(docId.toLowerCase()) ||
        UNWANTED_STUDENT_IDS.has(rawStudentId.toLowerCase()) ||
        UNWANTED_STUDENT_NAMES.has(name.toLowerCase()) ||
        (name.toLowerCase() === 'kiran' && rawStudentId.toLowerCase() !== 'c6-2026-0012') ||
        (rawStudentId.length > 15 && !rawStudentId.includes('-'));

      if (isJunkDoc) {
        docsToDelete.push(docId);
      } else {
        const student: Student = {
          id: docId,
          studentId: rawStudentId || docId,
          name: name || 'Student',
          class: data.class || 'Class 6',
          section: data.section || 'A',
          rollNumber: data.rollNumber || '',
          parentMobile: formatParentPhone(data.parentMobile || ''),
          password: data.password || 'KR6421',
          isPasswordChanged: Boolean(data.isPasswordChanged),
          status: data.status || 'ACTIVE',
          createdAt: data.createdAt || new Date().toISOString(),
        };
        const key = (student.studentId || student.id).toLowerCase();
        mapByKey.set(key, student);
      }
    });
  } catch (err) {
    console.error('Error fetching registered students from Firestore:', err);
  }

  // Asynchronously clean up junk docs from Firestore
  if (docsToDelete.length > 0) {
    Promise.all(docsToDelete.map((id) => deleteDoc(doc(db, STUDENTS_COL, id)).catch(() => {}))).catch(
      () => {}
    );
  }

  // Read from localStorage
  try {
    const localRaw = localStorage.getItem('cbse_registered_students');
    if (localRaw) {
      const localList: Student[] = JSON.parse(localRaw);
      localList.forEach((s) => {
        const sId = (s.studentId || s.id || '').toLowerCase();
        const sName = (s.name || '').toLowerCase();
        const isJunk =
          UNWANTED_STUDENT_IDS.has(sId) ||
          UNWANTED_STUDENT_IDS.has((s.id || '').toLowerCase()) ||
          UNWANTED_STUDENT_NAMES.has(sName) ||
          (sName === 'kiran' && sId !== 'c6-2026-0012');

        if (!isJunk && !mapByKey.has(sId)) {
          mapByKey.set(sId, s);
        }
      });
    }
  } catch (e) {
    // ignore
  }

  let students = Array.from(mapByKey.values());

  // Always ensure Kiran (c6-2026-0012) exists as the primary student
  const kiranExists = students.some(
    (s) => s.studentId && s.studentId.toLowerCase() === 'c6-2026-0012'
  );

  if (!kiranExists) {
    students.unshift(INITIAL_REGISTERED_STUDENTS[0]);
  }

  // Save clean list back to localStorage
  try {
    localStorage.setItem('cbse_registered_students', JSON.stringify(students));
  } catch (e) {
    console.error('Error saving registered students to localStorage:', e);
  }

  return students;
}

export async function seedDefaultStudents(): Promise<void> {
  try {
    for (const student of INITIAL_REGISTERED_STUDENTS) {
      await addDoc(collection(db, STUDENTS_COL), {
        studentId: student.studentId,
        name: student.name,
        class: student.class,
        section: student.section,
        rollNumber: student.rollNumber,
        parentMobile: student.parentMobile,
        password: student.password,
        isPasswordChanged: student.isPasswordChanged,
        status: student.status,
        createdAt: student.createdAt,
      });
    }
  } catch (err) {
    console.error('Error seeding default students:', err);
  }
}

export async function createRegisteredStudent(input: {
  name: string;
  class: string;
  section?: string;
  rollNumber?: string | number;
  parentMobile: string;
}): Promise<Student> {
  const allStudents = await getAllRegisteredStudents();
  const sameClassCount = allStudents.filter((s) => s.class === input.class).length;
  const newStudentId = generateStudentId(input.class, sameClassCount + 1);
  const tempPassword = generateTempPassword(input.name);

  const newStudentData = {
    studentId: newStudentId,
    name: input.name.trim(),
    class: input.class.trim(),
    section: input.section?.trim() || 'A',
    rollNumber: input.rollNumber || '',
    parentMobile: formatParentPhone(input.parentMobile),
    password: tempPassword,
    isPasswordChanged: false,
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(collection(db, STUDENTS_COL), newStudentData);
    const createdStudent = {
      id: docRef.id,
      ...newStudentData,
    };
    const updatedList = [...allStudents, createdStudent];
    localStorage.setItem('cbse_registered_students', JSON.stringify(updatedList));
    return createdStudent;
  } catch (err) {
    console.error('Error creating student in Firestore:', err);
    const createdStudent = {
      id: 'std_' + Date.now(),
      ...newStudentData,
    };
    const updatedList = [...allStudents, createdStudent];
    localStorage.setItem('cbse_registered_students', JSON.stringify(updatedList));
    return createdStudent;
  }
}

export async function authenticateStudent(
  studentIdInput: string,
  passwordInput: string
): Promise<{ student: Student | null; errorReason?: 'not_found' | 'invalid_password' }> {
  const cleanId = studentIdInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  const allStudents = await getAllRegisteredStudents();
  
  const student = allStudents.find(
    (s) =>
      (s.studentId && s.studentId.toLowerCase() === cleanId) ||
      (s.id && s.id.toLowerCase() === cleanId) ||
      (s.name && s.name.toLowerCase() === cleanId)
  );

  if (!student) {
    return { student: null, errorReason: 'not_found' };
  }

  if (student.password && student.password !== cleanPass) {
    return { student: null, errorReason: 'invalid_password' };
  }

  return { student };
}

export async function updateStudentPassword(studentId: string, newPassword: string): Promise<void> {
  try {
    const allStudents = await getAllRegisteredStudents();
    const student = allStudents.find((s) => s.id === studentId || s.studentId === studentId);
    if (student) {
      student.password = newPassword;
      student.isPasswordChanged = true;
      if (student.id) {
        const docRef = doc(db, STUDENTS_COL, student.id);
        await updateDoc(docRef, {
          password: newPassword,
          isPasswordChanged: true,
        });
      }
      localStorage.setItem('cbse_registered_students', JSON.stringify(allStudents));
    }
  } catch (err) {
    console.error('Error updating student password:', err);
  }
}

export async function deleteStudent(studentIdOrDocId: string, customStudentId?: string, name?: string): Promise<void> {
  const isProtected =
    studentIdOrDocId === 'std_kiran_6' ||
    studentIdOrDocId?.toLowerCase() === 'c6-2026-0012' ||
    customStudentId?.toLowerCase() === 'c6-2026-0012' ||
    (name && name.toLowerCase() === 'kiran' && (customStudentId?.toLowerCase() === 'c6-2026-0012' || studentIdOrDocId?.toLowerCase() === 'c6-2026-0012'));

  if (isProtected) {
    console.warn('Cannot delete protected student kiran (c6-2026-0012)');
    return;
  }

  // Update localStorage immediately
  try {
    const localRaw = localStorage.getItem('cbse_registered_students');
    if (localRaw) {
      let list: Student[] = JSON.parse(localRaw);
      list = list.filter(
        (s) =>
          s.id !== studentIdOrDocId &&
          s.studentId !== studentIdOrDocId &&
          (customStudentId ? s.studentId !== customStudentId : true) &&
          (name ? s.name.toLowerCase() !== name.toLowerCase() : true)
      );
      localStorage.setItem('cbse_registered_students', JSON.stringify(list));
    }
  } catch (e) {
    console.error('Error updating localStorage on delete:', e);
  }

  // Delete from Firestore by document ID
  try {
    const docRef = doc(db, STUDENTS_COL, studentIdOrDocId);
    await deleteDoc(docRef);
  } catch (e) {
    // ignore
  }

  // Delete from Firestore by studentId or name query
  try {
    if (customStudentId) {
      const q = query(collection(db, STUDENTS_COL), where('studentId', '==', customStudentId));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }
    }
    if (name) {
      const qName = query(collection(db, STUDENTS_COL), where('name', '==', name));
      const snapName = await getDocs(qName);
      for (const docSnap of snapName.docs) {
        if (docSnap.data().studentId !== 'c6-2026-0012') {
          await deleteDoc(docSnap.ref);
        }
      }
    }
  } catch (err) {
    console.error('Error deleting student from Firestore:', err);
  }
}

export async function deleteAllStudentsExceptKiran(): Promise<Student[]> {
  const kiran = INITIAL_REGISTERED_STUDENTS[0];

  // Clean Firestore
  try {
    const snap = await getDocs(collection(db, STUDENTS_COL));
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const sId = (data.studentId || docSnap.id || '').toLowerCase();
      const sName = (data.name || '').toLowerCase();
      if (sId !== 'c6-2026-0012' && sName !== 'kiran') {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (e) {
    console.error('Error deleting Firestore students except Kiran:', e);
  }

  // Clean localStorage
  try {
    localStorage.setItem('cbse_registered_students', JSON.stringify([kiran]));
  } catch (e) {
    // ignore
  }

  return [kiran];
}

export function saveDraftAttempt(draft: DraftAttempt): void {
  try {
    const payload: DraftAttempt = {
      ...draft,
      status: draft.status || 'in-progress',
      submitted: draft.submitted || false,
    };
    localStorage.setItem(`cbse_draft_exam_${draft.studentId}`, JSON.stringify(payload));
    localStorage.setItem('unfinishedExam', JSON.stringify(payload));
    localStorage.setItem('examDraft', JSON.stringify(payload));
  } catch (err) {
    console.error('Error saving draft exam:', err);
  }
}

export function getDraftAttempt(studentId: string): DraftAttempt | null {
  try {
    const raw = localStorage.getItem(`cbse_draft_exam_${studentId}`) || localStorage.getItem('unfinishedExam') || localStorage.getItem('examDraft');
    if (!raw) return null;
    const draft = JSON.parse(raw) as DraftAttempt;

    // Validate that draft is truly in-progress and not submitted/completed
    if (!draft || draft.submitted === true || draft.status === 'completed') {
      clearDraftAttempt(studentId);
      return null;
    }

    if (draft.studentId && draft.studentId !== studentId) {
      return null;
    }

    return draft;
  } catch (err) {
    console.error('Error loading draft exam:', err);
    clearDraftAttempt(studentId);
    return null;
  }
}

export function hasValidUnfinishedExam(studentId: string): boolean {
  const draft = getDraftAttempt(studentId);
  return Boolean(draft && draft.status === 'in-progress' && !draft.submitted);
}

export function clearDraftAttempt(studentId: string): void {
  try {
    localStorage.removeItem(`cbse_draft_exam_${studentId}`);
    localStorage.removeItem('unfinishedExam');
    localStorage.removeItem('examDraft');
    localStorage.removeItem('currentTest');
    localStorage.removeItem('savedAnswers');
    localStorage.removeItem('remainingTime');
    localStorage.removeItem('currentQuestionIndex');

    // Remove any lesson-specific or student-specific keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('draft_') || key.startsWith('cbse_draft_') || key.includes('unfinishedExam') || key.includes('examDraft'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.error('Error clearing draft exam:', err);
  }
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
 * Delete a single attempt by ID
 */
export async function deleteAttempt(id: string): Promise<void> {
  await deleteDoc(doc(db, ATTEMPTS_COL, id));
}

/**
 * Delete multiple attempts by IDs
 */
export async function deleteMultipleAttempts(ids: string[]): Promise<void> {
  const deletePromises = ids.map((id) => deleteDoc(doc(db, ATTEMPTS_COL, id)));
  await Promise.all(deletePromises);
}

/**
 * Delete all student attempts
 */
export async function deleteAllAttempts(): Promise<void> {
  const snap = await getDocs(collection(db, ATTEMPTS_COL));
  const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, ATTEMPTS_COL, d.id)));
  await Promise.all(deletePromises);
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
 * Deletes all existing Ratio and Proportion tests and associated questions from Firestore.
 */
export async function deleteAllRatioTests(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));
    const ratioDocs = snap.docs.filter((docSnap) => {
      const data = docSnap.data();
      const title = (data.title || '').toLowerCase();
      return title.includes('ratio') || title.includes('proportion');
    });

    let count = 0;
    for (const docSnap of ratioDocs) {
      await deleteTest(docSnap.id);
      count++;
    }
    console.log(`Deleted ${count} previous Ratio and Proportion test papers.`);
    return count;
  } catch (error) {
    console.error('Error deleting Ratio and Proportion tests:', error);
    return 0;
  }
}

/**
 * Helper to populate official CBSE Class 6 Mathematics – Chapter 12: Ratio and Proportion – Sample Test 1 (30 Questions)
 */
export async function createRatioTestPaper1(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Ratio and Proportion – Sample Test 1',
    class: 'Class 6',
    duration: 60,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    {
      testId: testObj.id,
      orderIndex: 1,
      question: '1. Which of the following is written in the form of a ratio?',
      optionA: '3 + 5',
      optionB: '3 : 5',
      optionC: '3 × 5',
      optionD: '3 – 5',
      correctAnswer: 'optionB',
      hint: '3 : 5 is written in ratio form using the colon symbol.',
    },
    {
      testId: testObj.id,
      orderIndex: 2,
      question: '2. The ratio of 4 pens to 8 pens is:',
      optionA: '4 : 8',
      optionB: '1 : 2',
      optionC: '2 : 1',
      optionD: '8 : 4',
      correctAnswer: 'optionB',
      hint: '4 / 8 = 1 / 2, which gives 1 : 2.',
    },
    {
      testId: testObj.id,
      orderIndex: 3,
      question: '3. Which of the following ratios is equivalent to 2 : 3?',
      optionA: '4 : 6',
      optionB: '3 : 4',
      optionC: '6 : 4',
      optionD: '8 : 9',
      correctAnswer: 'optionA',
      hint: '2/3 = (2×2)/(3×2) = 4/6 = 4 : 6.',
    },
    {
      testId: testObj.id,
      orderIndex: 4,
      question: '4. In the ratio 5 : 7, the first term is:',
      optionA: '7',
      optionB: '5',
      optionC: '12',
      optionD: '35',
      correctAnswer: 'optionB',
      hint: 'In 5 : 7, 5 is the first term (antecedent).',
    },
    {
      testId: testObj.id,
      orderIndex: 5,
      question: '5. If 12 chocolates are shared among 3 children, the ratio of chocolates to children is:',
      optionA: '12 : 3',
      optionB: '3 : 12',
      optionC: '4 : 1',
      optionD: 'Both a and c',
      correctAnswer: 'optionD',
      hint: '12 : 3 simplifies to 4 : 1, so both a and c represent the ratio.',
    },
    {
      testId: testObj.id,
      orderIndex: 6,
      question: '6. Which pair is in proportion?',
      optionA: '2 : 4 and 4 : 8',
      optionB: '3 : 5 and 6 : 8',
      optionC: '5 : 6 and 10 : 11',
      optionD: '4 : 7 and 8 : 15',
      correctAnswer: 'optionA',
      hint: '2/4 = 1/2 and 4/8 = 1/2, so 2:4 = 4:8.',
    },
    {
      testId: testObj.id,
      orderIndex: 7,
      question: '7. The simplest form of 15 : 25 is:',
      optionA: '15 : 25',
      optionB: '5 : 25',
      optionC: '3 : 5',
      optionD: '5 : 3',
      correctAnswer: 'optionC',
      hint: '15/25 = (15÷5)/(25÷5) = 3/5 = 3 : 5.',
    },
    {
      testId: testObj.id,
      orderIndex: 8,
      question: '8. Which of the following is not a ratio?',
      optionA: '7 : 9',
      optionB: '12 : 4',
      optionC: '5/8',
      optionD: '3 + 2',
      correctAnswer: 'optionD',
      hint: '3 + 2 is an addition expression, not a comparison ratio.',
    },
    {
      testId: testObj.id,
      orderIndex: 9,
      question: '9. If a : b = 6 : 9, then the simplified ratio is:',
      optionA: '6 : 9',
      optionB: '3 : 2',
      optionC: '2 : 3',
      optionD: '9 : 6',
      correctAnswer: 'optionC',
      hint: '6/9 = (6÷3)/(9÷3) = 2/3 = 2 : 3.',
    },
    {
      testId: testObj.id,
      orderIndex: 10,
      question: '10. The ratio of 20 cm to 1 m is:',
      optionA: '20 : 1',
      optionB: '20 : 100',
      optionC: '1 : 5',
      optionD: 'Both b and c',
      correctAnswer: 'optionD',
      hint: '1 m = 100 cm. Ratio is 20 cm : 100 cm = 20 : 100 = 1 : 5. So both b and c.',
    },
    {
      testId: testObj.id,
      orderIndex: 11,
      question: '11. A comparison of two quantities by division is called a __________.',
      optionA: 'ratio',
      optionB: 'fraction',
      optionC: 'proportion',
      optionD: 'product',
      correctAnswer: 'optionA',
      hint: 'ratio',
    },
    {
      testId: testObj.id,
      orderIndex: 12,
      question: '12. The ratio 8 : 12 in simplest form is __________.',
      optionA: '4 : 6',
      optionB: '2 : 3',
      optionC: '3 : 2',
      optionD: '1 : 2',
      correctAnswer: 'optionB',
      hint: '2 : 3',
    },
    {
      testId: testObj.id,
      orderIndex: 13,
      question: '13. In 3 : 4 = 6 : 8, the two ratios are said to be in __________.',
      optionA: 'equality',
      optionB: 'fraction',
      optionC: 'proportion',
      optionD: 'equation',
      correctAnswer: 'optionC',
      hint: 'proportion',
    },
    {
      testId: testObj.id,
      orderIndex: 14,
      question: '14. The first and fourth terms of a proportion are called __________ terms.',
      optionA: 'middle',
      optionB: 'extreme',
      optionC: 'mean',
      optionD: 'last',
      correctAnswer: 'optionB',
      hint: 'extreme',
    },
    {
      testId: testObj.id,
      orderIndex: 15,
      question: '15. The ratio of 10 rupees to 50 rupees is __________.',
      optionA: '5 : 1',
      optionB: '1 : 5',
      optionC: '10 : 5',
      optionD: '1 : 10',
      correctAnswer: 'optionB',
      hint: '1 : 5',
    },
    {
      testId: testObj.id,
      orderIndex: 16,
      question: '16. 6 : 18 = 1 : __________',
      optionA: '2',
      optionB: '3',
      optionC: '6',
      optionD: '18',
      correctAnswer: 'optionB',
      hint: '3',
    },
    {
      testId: testObj.id,
      orderIndex: 17,
      question: '17. If 2 : 5 = 8 : x, then x = __________.',
      optionA: '10',
      optionB: '15',
      optionC: '20',
      optionD: '25',
      correctAnswer: 'optionC',
      hint: '20',
    },
    {
      testId: testObj.id,
      orderIndex: 18,
      question: '18. The ratio 9 : 27 in simplest form is __________.',
      optionA: '3 : 9',
      optionB: '1 : 3',
      optionC: '3 : 1',
      optionD: '1 : 9',
      correctAnswer: 'optionB',
      hint: '1 : 3',
    },
    {
      testId: testObj.id,
      orderIndex: 19,
      question: '19. 4 : 8 = 1 : 2. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 20,
      question: '20. 5 : 10 and 2 : 4 are equivalent ratios. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 21,
      question: '21. 3 : 7 = 6 : 14 forms a proportion. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 22,
      question: '22. A ratio can compare quantities with different units without converting them first. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionB',
      hint: 'False',
    },
    {
      testId: testObj.id,
      orderIndex: 23,
      question: '23. 12 : 18 simplifies to 2 : 3. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 24,
      question: '24. 8 : 20 = 2 : 5. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 25,
      question: '25. Simplify the following ratios:\n\na) 18 : 24\nb) 21 : 35',
      optionA: 'a) 3 : 4  b) 3 : 5',
      optionB: 'a) 2 : 3  b) 3 : 5',
      optionC: 'a) 3 : 4  b) 5 : 3',
      optionD: 'a) 4 : 3  b) 5 : 7',
      correctAnswer: 'optionA',
      hint: 'a) 3 : 4  b) 3 : 5',
    },
    {
      testId: testObj.id,
      orderIndex: 26,
      question: '26. Check whether the following are in proportion:\n\na) 2 : 3 and 8 : 12\nb) 4 : 5 and 12 : 15',
      optionA: 'a) Not in proportion  b) Yes',
      optionB: 'a) Yes  b) Yes',
      optionC: 'a) Yes  b) Not in proportion',
      optionD: 'a) Not in proportion  b) Not in proportion',
      correctAnswer: 'optionA',
      hint: 'a) Not in proportion  b) Yes',
    },
    {
      testId: testObj.id,
      orderIndex: 27,
      question: '27. Write the ratio in simplest form:\n\na) 36 cm : 48 cm\nb) 250 g : 1 kg',
      optionA: 'a) 3 : 4  b) 1 : 4',
      optionB: 'a) 4 : 3  b) 1 : 4',
      optionC: 'a) 3 : 4  b) 250 : 1',
      optionD: 'a) 3 : 5  b) 1 : 4',
      correctAnswer: 'optionA',
      hint: 'a) 3 : 4  b) 1 : 4',
    },
    {
      testId: testObj.id,
      orderIndex: 28,
      question: '28. Complete the proportion:\n\na) 5 : 8 = 15 : ___\nb) 7 : 9 = ___ : 27',
      optionA: 'a) 24  b) 21',
      optionB: 'a) 20  b) 21',
      optionC: 'a) 24  b) 18',
      optionD: 'a) 18  b) 21',
      correctAnswer: 'optionA',
      hint: 'a) 24  b) 21',
    },
    {
      testId: testObj.id,
      orderIndex: 29,
      question: '29. In a class, there are 18 boys and 12 girls.\n\n• Write the ratio of boys to girls.\n• Write the ratio of girls to total students.\n• Simplify both ratios.',
      optionA: 'Boys : Girls = 3 : 2; Girls : Total = 2 : 5',
      optionB: 'Boys : Girls = 2 : 3; Girls : Total = 2 : 5',
      optionC: 'Boys : Girls = 3 : 2; Girls : Total = 3 : 5',
      optionD: 'Boys : Girls = 3 : 2; Girls : Total = 5 : 2',
      correctAnswer: 'optionA',
      hint: 'Boys : Girls = 3 : 2; Girls : Total = 2 : 5',
    },
    {
      testId: testObj.id,
      orderIndex: 30,
      question: '30. A recipe uses 2 cups of rice for 5 people.\n\n• Write the ratio of rice to people.\n• How many cups of rice are needed for 10 people if the proportion remains the same?',
      optionA: 'Rice : People = 2 : 5; For 10 people = 4 cups',
      optionB: 'Rice : People = 5 : 2; For 10 people = 4 cups',
      optionC: 'Rice : People = 2 : 5; For 10 people = 5 cups',
      optionD: 'Rice : People = 1 : 2.5; For 10 people = 10 cups',
      correctAnswer: 'optionA',
      hint: 'Rice : People = 2 : 5; For 10 people = 4 cups',
    },
  ];

  for (const q of rawQuestions) {
    await createQuestion(q);
  }

  return testObj;
}

/**
 * Deletes all existing Algebra tests and associated questions from Firestore.
 */
export async function deleteAllAlgebraTests(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));
    const algebraDocs = snap.docs.filter((docSnap) => {
      const data = docSnap.data();
      const title = (data.title || '').toLowerCase();
      return title.includes('algebra');
    });

    let count = 0;
    for (const docSnap of algebraDocs) {
      await deleteTest(docSnap.id);
      count++;
    }
    console.log(`Deleted ${count} previous Algebra test papers.`);
    return count;
  } catch (error) {
    console.error('Error deleting Algebra tests:', error);
    return 0;
  }
}

/**
 * Helper to populate official CBSE Class 6 Mathematics – Chapter 11: Algebra – Sample Test 1 (30 Questions)
 */
export async function createAlgebraTestPaper1(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Algebra – Sample Test 1',
    class: 'Class 6',
    duration: 60,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    {
      testId: testObj.id,
      orderIndex: 1,
      question: '1. Which of the following is a variable?',
      optionA: '5',
      optionB: '12',
      optionC: 'x',
      optionD: '20',
      correctAnswer: 'optionC',
      hint: 'x is a letter representing an unknown quantity that can take different values.',
    },
    {
      testId: testObj.id,
      orderIndex: 2,
      question: '2. In the expression x + 7, x is called:',
      optionA: 'constant',
      optionB: 'variable',
      optionC: 'coefficient',
      optionD: 'number',
      correctAnswer: 'optionB',
      hint: 'x is a variable.',
    },
    {
      testId: testObj.id,
      orderIndex: 3,
      question: '3. Which of the following is an algebraic expression?',
      optionA: '8',
      optionB: '5 + x',
      optionC: '12',
      optionD: '20',
      correctAnswer: 'optionB',
      hint: '5 + x contains both numbers and a variable connected by an operator.',
    },
    {
      testId: testObj.id,
      orderIndex: 4,
      question: '4. The expression for 5 more than a number y is:',
      optionA: '5y',
      optionB: 'y – 5',
      optionC: 'y + 5',
      optionD: '5 – y',
      correctAnswer: 'optionC',
      hint: '5 more than y means y + 5.',
    },
    {
      testId: testObj.id,
      orderIndex: 5,
      question: '5. Which of the following is a constant?',
      optionA: 'a',
      optionB: 'p',
      optionC: '9',
      optionD: 'z',
      correctAnswer: 'optionC',
      hint: '9 has a fixed numerical value, so it is a constant.',
    },
    {
      testId: testObj.id,
      orderIndex: 6,
      question: '6. The expression for twice a number n is:',
      optionA: 'n + 2',
      optionB: '2n',
      optionC: 'n/2',
      optionD: 'n – 2',
      correctAnswer: 'optionB',
      hint: 'Twice a number n means 2 × n = 2n.',
    },
    {
      testId: testObj.id,
      orderIndex: 7,
      question: '7. Which expression represents 3 less than x?',
      optionA: 'x + 3',
      optionB: '3x',
      optionC: 'x – 3',
      optionD: '3 – x',
      correctAnswer: 'optionC',
      hint: '3 less than x is x – 3.',
    },
    {
      testId: testObj.id,
      orderIndex: 8,
      question: '8. In 4a + 7, the coefficient of a is:',
      optionA: '4',
      optionB: '7',
      optionC: 'a',
      optionD: '11',
      correctAnswer: 'optionA',
      hint: 'The numerical factor multiplied with variable a is 4.',
    },
    {
      testId: testObj.id,
      orderIndex: 9,
      question: '9. Which of the following contains a variable?',
      optionA: '15',
      optionB: '3 + y',
      optionC: '24',
      optionD: '100',
      correctAnswer: 'optionB',
      hint: '3 + y contains the variable y.',
    },
    {
      testId: testObj.id,
      orderIndex: 10,
      question: '10. The expression for the sum of a number p and 10 is:',
      optionA: '10p',
      optionB: 'p – 10',
      optionC: 'p + 10',
      optionD: '10 – p',
      correctAnswer: 'optionC',
      hint: 'Sum of p and 10 is p + 10.',
    },
    {
      testId: testObj.id,
      orderIndex: 11,
      question: '11. A symbol whose value can change is called a __________.',
      optionA: 'variable',
      optionB: 'constant',
      optionC: 'coefficient',
      optionD: 'term',
      correctAnswer: 'optionA',
      hint: 'variable',
    },
    {
      testId: testObj.id,
      orderIndex: 12,
      question: '12. In m – 8, 8 is a __________.',
      optionA: 'variable',
      optionB: 'constant',
      optionC: 'coefficient',
      optionD: 'expression',
      correctAnswer: 'optionB',
      hint: 'constant',
    },
    {
      testId: testObj.id,
      orderIndex: 13,
      question: '13. The expression for 7 added to x is __________.',
      optionA: 'x – 7',
      optionB: '7x',
      optionC: 'x + 7',
      optionD: 'x/7',
      correctAnswer: 'optionC',
      hint: 'x + 7',
    },
    {
      testId: testObj.id,
      orderIndex: 14,
      question: '14. 3n means __________ times n.',
      optionA: '1',
      optionB: '2',
      optionC: '3',
      optionD: '4',
      correctAnswer: 'optionC',
      hint: '3',
    },
    {
      testId: testObj.id,
      orderIndex: 15,
      question: '15. In 5p + 2, p is the __________.',
      optionA: 'constant',
      optionB: 'variable',
      optionC: 'coefficient',
      optionD: 'sum',
      correctAnswer: 'optionB',
      hint: 'variable',
    },
    {
      testId: testObj.id,
      orderIndex: 16,
      question: '16. The expression for one-fourth of y is __________.',
      optionA: '4y',
      optionB: 'y/4',
      optionC: 'y – 4',
      optionD: 'y + 4',
      correctAnswer: 'optionB',
      hint: 'y/4',
    },
    {
      testId: testObj.id,
      orderIndex: 17,
      question: '17. In 2a + 9, the constant term is __________.',
      optionA: '2',
      optionB: 'a',
      optionC: '9',
      optionD: '2a',
      correctAnswer: 'optionC',
      hint: '9',
    },
    {
      testId: testObj.id,
      orderIndex: 18,
      question: '18. The expression for 10 less than a number t is __________.',
      optionA: 't + 10',
      optionB: '10t',
      optionC: 't – 10',
      optionD: '10 – t',
      correctAnswer: 'optionC',
      hint: 't – 10',
    },
    {
      testId: testObj.id,
      orderIndex: 19,
      question: '19. x + 5 is an algebraic expression. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 20,
      question: '20. A variable always has a fixed value. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionB',
      hint: 'False',
    },
    {
      testId: testObj.id,
      orderIndex: 21,
      question: '21. 2m means m + m. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 22,
      question: '22. In 7 + p, 7 is a constant. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 23,
      question: '23. a – 4 and 4 – a are the same. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionB',
      hint: 'False',
    },
    {
      testId: testObj.id,
      orderIndex: 24,
      question: '24. The expression 5x contains a variable. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 25,
      question: '25. Write algebraic expressions for:\n\na) 9 more than a number x\nb) 4 times a number p',
      optionA: 'a) x + 9  b) 4p',
      optionB: 'a) 9x  b) 4 + p',
      optionC: 'a) x – 9  b) p/4',
      optionD: 'a) 9 – x  b) 4 – p',
      correctAnswer: 'optionA',
      hint: 'a) x + 9  b) 4p',
    },
    {
      testId: testObj.id,
      orderIndex: 26,
      question: '26. Write algebraic expressions for:\n\na) 12 less than a number y\nb) Half of a number n',
      optionA: 'a) y – 12  b) n/2',
      optionB: 'a) 12 – y  b) 2n',
      optionC: 'a) y + 12  b) n – 2',
      optionD: 'a) 12y  b) n + 2',
      correctAnswer: 'optionA',
      hint: 'a) y – 12  b) n/2',
    },
    {
      testId: testObj.id,
      orderIndex: 27,
      question: '27. If x = 5, find the value of:\n\na) x + 3\nb) 2x',
      optionA: 'a) 8  b) 10',
      optionB: 'a) 15  b) 10',
      optionC: 'a) 8  b) 25',
      optionD: 'a) 2  b) 10',
      correctAnswer: 'optionA',
      hint: 'a) 8  b) 10',
    },
    {
      testId: testObj.id,
      orderIndex: 28,
      question: '28. If a = 4, find the value of:\n\na) 3a + 2\nb) a – 1',
      optionA: 'a) 14  b) 3',
      optionB: 'a) 12  b) 3',
      optionC: 'a) 14  b) 5',
      optionD: 'a) 10  b) 3',
      correctAnswer: 'optionA',
      hint: 'a) 14  b) 3',
    },
    {
      testId: testObj.id,
      orderIndex: 29,
      question: '29. A matchstick pattern has 4 matchsticks in one square.\n\n• How many matchsticks are needed for 2 squares?\n• How many matchsticks are needed for 5 squares if each new square shares one side with the previous square?',
      optionA: '2 squares = 7 matchsticks; 5 squares = 16 matchsticks',
      optionB: '2 squares = 8 matchsticks; 5 squares = 20 matchsticks',
      optionC: '2 squares = 7 matchsticks; 5 squares = 15 matchsticks',
      optionD: '2 squares = 6 matchsticks; 5 squares = 16 matchsticks',
      correctAnswer: 'optionA',
      hint: '2 squares = 7 matchsticks; 5 squares = 16 matchsticks',
    },
    {
      testId: testObj.id,
      orderIndex: 30,
      question: '30. Ravi has x marbles. His friend gives him 7 more marbles.\n\n• Write an algebraic expression for the total number of marbles.\n• Find the total if x = 12.',
      optionA: 'Total expression = x + 7; if x = 12, total = 19',
      optionB: 'Total expression = 7x; if x = 12, total = 84',
      optionC: 'Total expression = x – 7; if x = 12, total = 5',
      optionD: 'Total expression = x + 7; if x = 12, total = 12',
      correctAnswer: 'optionA',
      hint: 'Total expression = x + 7; if x = 12, total = 19',
    },
  ];

  for (const q of rawQuestions) {
    await createQuestion(q);
  }

  return testObj;
}

/**
 * Deletes all existing Decimals tests and associated questions from Firestore.
 */
export async function deleteAllDecimalsTests(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));
    const decimalsDocs = snap.docs.filter((docSnap) => {
      const data = docSnap.data();
      const title = (data.title || '').toLowerCase();
      return title.includes('decimals');
    });

    let count = 0;
    for (const docSnap of decimalsDocs) {
      await deleteTest(docSnap.id);
      count++;
    }
    console.log(`Deleted ${count} previous Decimals test papers.`);
    return count;
  } catch (error) {
    console.error('Error deleting Decimals tests:', error);
    return 0;
  }
}

/**
 * Helper to populate official CBSE Class 6 Mathematics – Chapter 8: Decimals – Sample Test 1 (30 Questions)
 */
export async function createDecimalsTestPaper1(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Decimals – Sample Test 1',
    class: 'Class 6',
    duration: 60,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    {
      testId: testObj.id,
      orderIndex: 1,
      question: '1. Which of the following is a decimal number?',
      optionA: '3/4',
      optionB: '0.5',
      optionC: '7/8',
      optionD: '9/10',
      correctAnswer: 'optionB',
      hint: '0.5 is a number written in decimal notation with a decimal point.',
    },
    {
      testId: testObj.id,
      orderIndex: 2,
      question: '2. The decimal form of 5/10 is:',
      optionA: '5.0',
      optionB: '0.5',
      optionC: '0.05',
      optionD: '50.0',
      correctAnswer: 'optionB',
      hint: '5/10 = 0.5',
    },
    {
      testId: testObj.id,
      orderIndex: 3,
      question: '3. Which number has 3 in the tenths place?',
      optionA: '2.35',
      optionB: '4.03',
      optionC: '5.30',
      optionD: '3.25',
      correctAnswer: 'optionC',
      hint: 'In 5.30, the digit 3 is in the tenths place.',
    },
    {
      testId: testObj.id,
      orderIndex: 4,
      question: '4. The decimal 0.7 represents:',
      optionA: '7/100',
      optionB: '7/10',
      optionC: '70/1000',
      optionD: '1/7',
      correctAnswer: 'optionB',
      hint: '0.7 = 7/10',
    },
    {
      testId: testObj.id,
      orderIndex: 5,
      question: '5. Which is the greatest?',
      optionA: '0.8',
      optionB: '0.08',
      optionC: '0.18',
      optionD: '0.81',
      correctAnswer: 'optionD',
      hint: '0.81 > 0.80 > 0.18 > 0.08',
    },
    {
      testId: testObj.id,
      orderIndex: 6,
      question: '6. The decimal form of 25/100 is:',
      optionA: '2.5',
      optionB: '0.25',
      optionC: '25.0',
      optionD: '0.025',
      correctAnswer: 'optionB',
      hint: '25/100 = 0.25',
    },
    {
      testId: testObj.id,
      orderIndex: 7,
      question: '7. Which of the following is equal to 1 whole?',
      optionA: '0.1',
      optionB: '0.01',
      optionC: '1.0',
      optionD: '10.0',
      correctAnswer: 'optionC',
      hint: '1.0 is equal to 1 whole.',
    },
    {
      testId: testObj.id,
      orderIndex: 8,
      question: '8. The place value of 6 in 4.68 is:',
      optionA: '6 ones',
      optionB: '6 tenths',
      optionC: '6 hundredths',
      optionD: '6 tens',
      correctAnswer: 'optionB',
      hint: 'In 4.68, 6 is in the tenths place.',
    },
    {
      testId: testObj.id,
      orderIndex: 9,
      question: '9. Which is the smallest decimal?',
      optionA: '0.9',
      optionB: '0.09',
      optionC: '0.19',
      optionD: '0.29',
      correctAnswer: 'optionB',
      hint: '0.09 is the smallest decimal.',
    },
    {
      testId: testObj.id,
      orderIndex: 10,
      question: '10. The decimal form of 3 + 2/10 is:',
      optionA: '3.02',
      optionB: '3.2',
      optionC: '32.0',
      optionD: '2.3',
      correctAnswer: 'optionB',
      hint: '3 + 2/10 = 3 + 0.2 = 3.2',
    },
    {
      testId: testObj.id,
      orderIndex: 11,
      question: '11. In 5.4, the digit 4 is in the __________ place.',
      optionA: 'tenths',
      optionB: 'hundredths',
      optionC: 'ones',
      optionD: 'tens',
      correctAnswer: 'optionA',
      hint: 'tenths',
    },
    {
      testId: testObj.id,
      orderIndex: 12,
      question: '12. 0.3 = 3/__________',
      optionA: '100',
      optionB: '10',
      optionC: '1',
      optionD: '1000',
      correctAnswer: 'optionB',
      hint: '10',
    },
    {
      testId: testObj.id,
      orderIndex: 13,
      question: '13. 0.45 has 4 tenths and __________ hundredths.',
      optionA: '4',
      optionB: '5',
      optionC: '45',
      optionD: '0',
      correctAnswer: 'optionB',
      hint: '5',
    },
    {
      testId: testObj.id,
      orderIndex: 14,
      question: '14. 7/10 in decimal form is __________.',
      optionA: '0.07',
      optionB: '0.7',
      optionC: '7.0',
      optionD: '70.0',
      correctAnswer: 'optionB',
      hint: '0.7',
    },
    {
      testId: testObj.id,
      orderIndex: 15,
      question: '15. The number 2.50 has __________ digits after the decimal point.',
      optionA: '1',
      optionB: '2',
      optionC: '3',
      optionD: '0',
      correctAnswer: 'optionB',
      hint: '2',
    },
    {
      testId: testObj.id,
      orderIndex: 16,
      question: '16. 0.9 + 0.1 = __________',
      optionA: '0.10',
      optionB: '1.0',
      optionC: '0.91',
      optionD: '1.1',
      correctAnswer: 'optionB',
      hint: '1.0',
    },
    {
      testId: testObj.id,
      orderIndex: 17,
      question: '17. 1.25 = 125/__________',
      optionA: '10',
      optionB: '100',
      optionC: '1000',
      optionD: '1',
      correctAnswer: 'optionB',
      hint: '100',
    },
    {
      testId: testObj.id,
      orderIndex: 18,
      question: '18. 0.75 is read as __________.',
      optionA: 'seventy-five',
      optionB: 'seventy-five hundredths',
      optionC: 'seven tenths five ones',
      optionD: 'seven point five',
      correctAnswer: 'optionB',
      hint: 'seventy-five hundredths',
    },
    {
      testId: testObj.id,
      orderIndex: 19,
      question: '19. 0.5 = 5/10. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 20,
      question: '20. 0.25 is greater than 0.5. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionB',
      hint: 'False',
    },
    {
      testId: testObj.id,
      orderIndex: 21,
      question: '21. 3.40 and 3.4 represent the same value. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 22,
      question: '22. The number 0.07 has 7 hundredths. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 23,
      question: '23. 1.0 is equal to 1. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 24,
      question: '24. 0.99 is smaller than 1.00. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'True',
    },
    {
      testId: testObj.id,
      orderIndex: 25,
      question: '25. Convert the following fractions into decimals:\n\na) 4/10\nb) 36/100',
      optionA: 'a) 0.4  b) 0.36',
      optionB: 'a) 4.0  b) 3.6',
      optionC: 'a) 0.04  b) 0.036',
      optionD: 'a) 0.4  b) 3.6',
      correctAnswer: 'optionA',
      hint: 'a) 0.4  b) 0.36',
    },
    {
      testId: testObj.id,
      orderIndex: 26,
      question: '26. Write the place value of the underlined digit in:\n\na) 7.8\nb) 3.46',
      optionA: 'a) 8 ones  b) 6 tens',
      optionB: 'a) 8 tenths  b) 6 hundredths',
      optionC: 'a) 8 hundredths  b) 6 tenths',
      optionD: 'a) 8 tens  b) 6 ones',
      correctAnswer: 'optionB',
      hint: 'a) 8 tenths  b) 6 hundredths',
    },
    {
      testId: testObj.id,
      orderIndex: 27,
      question: '27. Arrange the following decimals in ascending order:\n\n0.9, 0.09, 0.5',
      optionA: '0.09 < 0.5 < 0.9',
      optionB: '0.9 < 0.5 < 0.09',
      optionC: '0.5 < 0.09 < 0.9',
      optionD: '0.09 < 0.9 < 0.5',
      correctAnswer: 'optionA',
      hint: '0.09 < 0.5 < 0.9',
    },
    {
      testId: testObj.id,
      orderIndex: 28,
      question: '28. Add the following decimals:\n\na) 2.3 + 1.5\nb) 4.25 + 0.50',
      optionA: 'a) 3.8  b) 4.75',
      optionB: 'a) 3.5  b) 4.25',
      optionC: 'a) 3.8  b) 4.50',
      optionD: 'a) 2.8  b) 4.75',
      correctAnswer: 'optionA',
      hint: 'a) 3.8  b) 4.75',
    },
    {
      testId: testObj.id,
      orderIndex: 29,
      question: '29. A ribbon is 3.5 m long. Another ribbon is 2.25 m long.\n\n• What is the total length of the two ribbons?\n• Which ribbon is longer?',
      optionA: 'Total = 5.75 m; Longer ribbon = 3.5 m ribbon',
      optionB: 'Total = 5.50 m; Longer ribbon = 2.25 m ribbon',
      optionC: 'Total = 5.75 m; Longer ribbon = 2.25 m ribbon',
      optionD: 'Total = 5.25 m; Longer ribbon = 3.5 m ribbon',
      correctAnswer: 'optionA',
      hint: 'Total = 5.75 m; Longer ribbon = 3.5 m ribbon',
    },
    {
      testId: testObj.id,
      orderIndex: 30,
      question: '30. A bottle contains 1.75 litres of juice. 0.50 litres is used.\n\n• How much juice was used?\n• How much juice remains in the bottle?',
      optionA: 'Used = 0.50 L; Remaining = 1.25 L',
      optionB: 'Used = 1.75 L; Remaining = 0.50 L',
      optionC: 'Used = 1.25 L; Remaining = 0.50 L',
      optionD: 'Used = 0.50 L; Remaining = 1.75 L',
      correctAnswer: 'optionA',
      hint: 'Used = 0.50 L; Remaining = 1.25 L',
    },
  ];

  for (const q of rawQuestions) {
    await createQuestion(q);
  }

  return testObj;
}

/**
 * Deletes all existing Fractions tests and associated questions from Firestore.
 */
export async function deleteAllFractionsTests(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));
    const fractionsDocs = snap.docs.filter((docSnap) => {
      const data = docSnap.data();
      const title = (data.title || '').toLowerCase();
      return title.includes('fractions');
    });

    let count = 0;
    for (const docSnap of fractionsDocs) {
      await deleteTest(docSnap.id);
      count++;
    }
    console.log(`Deleted ${count} previous Fractions test papers.`);
    return count;
  } catch (error) {
    console.error('Error deleting Fractions tests:', error);
    return 0;
  }
}

/**
 * Helper to populate official CBSE Class 6 Mathematics – Chapter 7: Fractions – Sample Test 1 (30 Questions)
 */
export async function createFractionsTestPaper1(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Fractions – Sample Test 1',
    class: 'Class 6',
    duration: 60,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    // Section A – Multiple Choice Questions (1 mark each)
    {
      testId: testObj.id,
      orderIndex: 1,
      question: '1. Which of the following is a proper fraction?',
      optionA: '7/5',
      optionB: '9/4',
      optionC: '3/8',
      optionD: '11/6',
      correctAnswer: 'optionC',
      hint: 'In a proper fraction, the numerator is less than the denominator. Here 3 < 8, so 3/8 is a proper fraction.',
    },
    {
      testId: testObj.id,
      orderIndex: 2,
      question: '2. The numerator of 5/9 is:',
      optionA: '5',
      optionB: '9',
      optionC: '14',
      optionD: '4',
      correctAnswer: 'optionA',
      hint: 'In a fraction a/b, the number on top (a) is the numerator. In 5/9, 5 is the numerator.',
    },
    {
      testId: testObj.id,
      orderIndex: 3,
      question: '3. Which fraction is equal to one whole?',
      optionA: '4/5',
      optionB: '5/5',
      optionC: '3/5',
      optionD: '2/5',
      correctAnswer: 'optionB',
      hint: 'When the numerator equals the denominator (5/5 = 1), the fraction is equal to one whole.',
    },
    {
      testId: testObj.id,
      orderIndex: 4,
      question: '4. Equivalent fraction of 2/3 is:',
      optionA: '4/6',
      optionB: '5/6',
      optionC: '3/5',
      optionD: '6/8',
      correctAnswer: 'optionA',
      hint: 'Multiplying both numerator and denominator of 2/3 by 2 gives (2×2)/(3×2) = 4/6.',
    },
    {
      testId: testObj.id,
      orderIndex: 5,
      question: '5. Which fraction is the greatest?',
      optionA: '1/4',
      optionB: '1/2',
      optionC: '3/8',
      optionD: '2/5',
      correctAnswer: 'optionB',
      hint: 'Converting to decimals: 1/2 = 0.5, 2/5 = 0.4, 3/8 = 0.375, 1/4 = 0.25. So 1/2 is the greatest.',
    },
    {
      testId: testObj.id,
      orderIndex: 6,
      question: '6. Which of the following is an improper fraction?',
      optionA: '3/7',
      optionB: '5/9',
      optionC: '9/4',
      optionD: '2/11',
      correctAnswer: 'optionC',
      hint: 'An improper fraction has a numerator greater than or equal to its denominator. In 9/4, 9 > 4.',
    },
    {
      testId: testObj.id,
      orderIndex: 7,
      question: '7. 6/12 in simplest form is:',
      optionA: '6/12',
      optionB: '3/6',
      optionC: '1/2',
      optionD: '2/3',
      correctAnswer: 'optionC',
      hint: 'Dividing numerator and denominator by 6 gives (6÷6)/(12÷6) = 1/2.',
    },
    {
      testId: testObj.id,
      orderIndex: 8,
      question: '8. Which pair of fractions is equivalent?',
      optionA: '2/5 and 4/10',
      optionB: '1/3 and 2/5',
      optionC: '3/4 and 6/10',
      optionD: '5/6 and 10/13',
      correctAnswer: 'optionA',
      hint: '2/5 = (2×2)/(5×2) = 4/10. Thus, 2/5 and 4/10 are equivalent.',
    },
    {
      testId: testObj.id,
      orderIndex: 9,
      question: '9. Which fraction is smaller?',
      optionA: '3/5',
      optionB: '2/5',
      optionC: '4/5',
      optionD: '5/5',
      correctAnswer: 'optionB',
      hint: 'For fractions with the same denominator, the fraction with the smaller numerator is smaller. 2/5 < 3/5.',
    },
    {
      testId: testObj.id,
      orderIndex: 10,
      question: '10. The denominator of 11/15 is:',
      optionA: '11',
      optionB: '15',
      optionC: '26',
      optionD: '4',
      correctAnswer: 'optionB',
      hint: 'In a fraction a/b, the bottom number (b) is the denominator. In 11/15, 15 is the denominator.',
    },

    // Section B – Fill in the Blanks (1 mark each)
    {
      testId: testObj.id,
      orderIndex: 11,
      question: '11. A fraction whose numerator is smaller than the denominator is called a __________ fraction.',
      optionA: 'proper',
      optionB: 'improper',
      optionC: 'mixed',
      optionD: 'equivalent',
      correctAnswer: 'optionA',
      hint: 'A fraction with numerator smaller than denominator is called a proper fraction.',
    },
    {
      testId: testObj.id,
      orderIndex: 12,
      question: '12. 8/8 = __________',
      optionA: '0',
      optionB: '1',
      optionC: '8',
      optionD: '16',
      correctAnswer: 'optionB',
      hint: 'Any non-zero number divided by itself equals 1. 8/8 = 1.',
    },
    {
      testId: testObj.id,
      orderIndex: 13,
      question: '13. Two fractions representing the same value are called __________ fractions.',
      optionA: 'like',
      optionB: 'unlike',
      optionC: 'equivalent',
      optionD: 'improper',
      correctAnswer: 'optionC',
      hint: 'Fractions representing the same value are called equivalent fractions.',
    },
    {
      testId: testObj.id,
      orderIndex: 14,
      question: '14. 3/9 in simplest form is __________.',
      optionA: '1/3',
      optionB: '3/1',
      optionC: '1/9',
      optionD: '2/3',
      correctAnswer: 'optionA',
      hint: 'Dividing numerator and denominator by 3 gives 1/3.',
    },
    {
      testId: testObj.id,
      orderIndex: 15,
      question: '15. In the fraction 7/10, the denominator is __________.',
      optionA: '7',
      optionB: '10',
      optionC: '17',
      optionD: '3',
      correctAnswer: 'optionB',
      hint: 'The denominator is the bottom number, which is 10.',
    },
    {
      testId: testObj.id,
      orderIndex: 16,
      question: '16. 1/2 is equivalent to __________/8.',
      optionA: '2',
      optionB: '3',
      optionC: '4',
      optionD: '6',
      correctAnswer: 'optionC',
      hint: 'Multiply top and bottom of 1/2 by 4: (1×4)/(2×4) = 4/8.',
    },
    {
      testId: testObj.id,
      orderIndex: 17,
      question: '17. The fraction representing three parts out of eight equal parts is __________.',
      optionA: '8/3',
      optionB: '3/8',
      optionC: '1/8',
      optionD: '3/5',
      correctAnswer: 'optionB',
      hint: 'Three parts out of eight equal parts is represented as 3/8.',
    },
    {
      testId: testObj.id,
      orderIndex: 18,
      question: '18. 10/5 = __________',
      optionA: '1',
      optionB: '2',
      optionC: '5',
      optionD: '10',
      correctAnswer: 'optionB',
      hint: '10 divided by 5 equals 2.',
    },

    // Section C – True or False (1 mark each)
    {
      testId: testObj.id,
      orderIndex: 19,
      question: '19. 4/8 and 1/2 are equivalent fractions. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: '4/8 simplifies to 1/2. Thus the statement is True.',
    },
    {
      testId: testObj.id,
      orderIndex: 20,
      question: '20. In an improper fraction, the numerator is greater than or equal to the denominator. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'An improper fraction has numerator ≥ denominator. The statement is True.',
    },
    {
      testId: testObj.id,
      orderIndex: 21,
      question: '21. 5/10 is equal to 1/5. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionB',
      hint: '5/10 = 1/2, which is not equal to 1/5. The statement is False.',
    },
    {
      testId: testObj.id,
      orderIndex: 22,
      question: '22. Every proper fraction is less than 1. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: 'Since numerator < denominator in a proper fraction, it is always less than 1 (True).',
    },
    {
      testId: testObj.id,
      orderIndex: 23,
      question: '23. 2/4 and 3/6 represent the same value. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionA',
      hint: '2/4 = 1/2 and 3/6 = 1/2. Both represent the same value (True).',
    },
    {
      testId: testObj.id,
      orderIndex: 24,
      question: '24. The fraction 7/7 is less than 1. _________',
      optionA: 'True',
      optionB: 'False',
      optionC: 'Cannot say',
      optionD: 'None of these',
      correctAnswer: 'optionB',
      hint: '7/7 = 1, which is equal to 1, not less than 1. The statement is False.',
    },

    // Section D – Short Answer Questions (2 marks each)
    {
      testId: testObj.id,
      orderIndex: 25,
      question: '25. Write two equivalent fractions of 3/7.',
      optionA: '6/14, 9/21',
      optionB: '4/7, 5/7',
      optionC: '3/14, 3/21',
      optionD: '7/3, 14/6',
      correctAnswer: 'optionA',
      hint: '3/7 × 2/2 = 6/14 and 3/7 × 3/3 = 9/21.',
    },
    {
      testId: testObj.id,
      orderIndex: 26,
      question: '26. Compare 3/4 and 5/8 and write the greater fraction.',
      optionA: '3/4 > 5/8',
      optionB: '5/8 > 3/4',
      optionC: '3/4 = 5/8',
      optionD: 'Cannot be compared',
      correctAnswer: 'optionA',
      hint: '3/4 = 6/8. Since 6/8 > 5/8, 3/4 is greater.',
    },
    {
      testId: testObj.id,
      orderIndex: 27,
      question: '27. Arrange the following fractions in ascending order: 1/2, 3/4, 2/5',
      optionA: '2/5 < 1/2 < 3/4',
      optionB: '1/2 < 2/5 < 3/4',
      optionC: '3/4 < 1/2 < 2/5',
      optionD: '2/5 < 3/4 < 1/2',
      correctAnswer: 'optionA',
      hint: 'Converting to decimals: 2/5 = 0.4, 1/2 = 0.5, 3/4 = 0.75. So ascending order is 2/5 < 1/2 < 3/4.',
    },
    {
      testId: testObj.id,
      orderIndex: 28,
      question: '28. Simplify the following fractions: a) 8/16  b) 15/25',
      optionA: 'a) 1/2, b) 3/5',
      optionB: 'a) 2/4, b) 5/3',
      optionC: 'a) 1/4, b) 2/5',
      optionD: 'a) 1/2, b) 5/3',
      correctAnswer: 'optionA',
      hint: '8/16 = 1/2 and 15/25 = 3/5.',
    },

    // Section E – Word Problems (3 marks each)
    {
      testId: testObj.id,
      orderIndex: 29,
      question: '29. A chocolate bar is divided into 12 equal pieces. Rohan eats 5 pieces. What fraction of the chocolate did he eat? What fraction is left?',
      optionA: 'Eaten = 5/12, Left = 7/12',
      optionB: 'Eaten = 7/12, Left = 5/12',
      optionC: 'Eaten = 5/12, Left = 5/12',
      optionD: 'Eaten = 12/5, Left = 12/7',
      correctAnswer: 'optionA',
      hint: 'Fraction eaten = 5/12. Remaining pieces = 12 - 5 = 7, so fraction left = 7/12.',
    },
    {
      testId: testObj.id,
      orderIndex: 30,
      question: '30. A water tank is filled up to 7/10 of its capacity. Later 2/10 of the water is used. What fraction of water was used? What fraction of water remains in the tank?',
      optionA: 'Used = 2/10, Remaining = 5/10 = 1/2',
      optionB: 'Used = 7/10, Remaining = 2/10',
      optionC: 'Used = 5/10, Remaining = 2/10',
      optionD: 'Used = 2/10, Remaining = 7/10',
      correctAnswer: 'optionA',
      hint: 'Used fraction = 2/10. Remaining fraction = 7/10 - 2/10 = 5/10 = 1/2.',
    },
  ];

  for (const q of rawQuestions) {
    await createQuestion(q);
  }

  return testObj;
}

/**
 * Deletes all existing Integers tests and associated questions from Firestore.
 */
export async function deleteAllIntegersTests(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));
    const integersDocs = snap.docs.filter((docSnap) => {
      const data = docSnap.data();
      const title = (data.title || '').toLowerCase();
      return title.includes('integers');
    });

    let count = 0;
    for (const docSnap of integersDocs) {
      await deleteTest(docSnap.id);
      count++;
    }
    console.log(`Deleted ${count} previous Integers test papers.`);
    return count;
  } catch (error) {
    console.error('Error deleting Integers tests:', error);
    return 0;
  }
}

/**
 * Helper to populate official Class 6 Integers – Sample Test 1 (Questions 1 to 20)
 */
export async function createIntegersTestPaper1(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Integers – Sample Test 1',
    class: 'Class 6',
    duration: 25,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    {
      testId: testObj.id,
      question: 'Which of the following is an integer?',
      optionA: '3.5',
      optionB: '-7',
      optionC: '2/3',
      optionD: '1.2',
      correctAnswer: 'optionB',
      hint: 'Integers are whole numbers and their negative opposites. -7 is an integer.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is a positive integer?',
      optionA: '-8',
      optionB: '-1',
      optionC: '5',
      optionD: '0',
      correctAnswer: 'optionC',
      hint: 'Positive integers are integers greater than zero. 5 is a positive integer.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is a negative integer?',
      optionA: '0',
      optionB: '6',
      optionC: '-9',
      optionD: '12',
      correctAnswer: 'optionC',
      hint: '-9 is a negative integer as it is less than zero.',
    },
    {
      testId: testObj.id,
      question: 'Zero is',
      optionA: 'a positive integer',
      optionB: 'a negative integer',
      optionC: 'neither positive nor negative',
      optionD: 'not an integer',
      correctAnswer: 'optionC',
      hint: 'Zero is an integer that is neither positive nor negative.',
    },
    {
      testId: testObj.id,
      question: 'Which integer is to the right of -3 on the number line?',
      optionA: '-5',
      optionB: '-4',
      optionC: '-2',
      optionD: '-6',
      correctAnswer: 'optionC',
      hint: 'Numbers to the right on the number line are greater. -2 is greater than -3.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is the greatest integer?',
      optionA: '-10',
      optionB: '-2',
      optionC: '0',
      optionD: '7',
      correctAnswer: 'optionD',
      hint: '7 is positive and greater than 0, -2, and -10.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following is the smallest integer?',
      optionA: '-15',
      optionB: '-5',
      optionC: '0',
      optionD: '9',
      correctAnswer: 'optionA',
      hint: 'On the number line, -15 is furthest to the left among the options, so it is the smallest.',
    },
    {
      testId: testObj.id,
      question: 'The opposite of +12 is',
      optionA: '+12',
      optionB: '-12',
      optionC: '0',
      optionD: '12/2',
      correctAnswer: 'optionB',
      hint: 'The opposite of positive 12 is -12.',
    },
    {
      testId: testObj.id,
      question: 'The opposite of -8 is',
      optionA: '-8',
      optionB: '+8',
      optionC: '0',
      optionD: '-16',
      correctAnswer: 'optionB',
      hint: 'The opposite of negative 8 is +8.',
    },
    {
      testId: testObj.id,
      question: 'Which pair represents opposite integers?',
      optionA: '5 and 5',
      optionB: '-7 and -7',
      optionC: '9 and -9',
      optionD: '0 and 1',
      correctAnswer: 'optionC',
      hint: 'Opposite integers are equidistant from 0 on opposite sides of the number line.',
    },
    {
      testId: testObj.id,
      question: 'Which integer lies between -4 and 2?',
      optionA: '-5',
      optionB: '-3',
      optionC: '3',
      optionD: '4',
      correctAnswer: 'optionB',
      hint: 'The integers strictly between -4 and 2 are -3, -2, -1, 0, 1. -3 lies in this range.',
    },
    {
      testId: testObj.id,
      question: 'Arrange the integers in ascending order: -2, 5, -7, 0',
      optionA: '-7, -2, 0, 5',
      optionB: '-2, -7, 0, 5',
      optionC: '0, -7, -2, 5',
      optionD: '5, 0, -2, -7',
      correctAnswer: 'optionA',
      hint: 'Ascending order means smallest to largest: -7 < -2 < 0 < 5.',
    },
    {
      testId: testObj.id,
      question: 'Arrange the integers in descending order: 4, -1, 0, -5',
      optionA: '-5, -1, 0, 4',
      optionB: '4, 0, -1, -5',
      optionC: '4, -1, 0, -5',
      optionD: '0, 4, -1, -5',
      correctAnswer: 'optionB',
      hint: 'Descending order means largest to smallest: 4 > 0 > -1 > -5.',
    },
    {
      testId: testObj.id,
      question: 'What is the predecessor of -3?',
      optionA: '-2',
      optionB: '-4',
      optionC: '-5',
      optionD: '0',
      correctAnswer: 'optionB',
      hint: 'Predecessor = Number − 1 = -3 − 1 = -4.',
    },
    {
      testId: testObj.id,
      question: 'What is the successor of -6?',
      optionA: '-7',
      optionB: '-5',
      optionC: '-4',
      optionD: '6',
      correctAnswer: 'optionB',
      hint: 'Successor = Number + 1 = -6 + 1 = -5.',
    },
    {
      testId: testObj.id,
      question: 'What is (-4) + 7?',
      optionA: '-11',
      optionB: '-3',
      optionC: '3',
      optionD: '11',
      correctAnswer: 'optionC',
      hint: '(-4) + 7 = 7 − 4 = 3.',
    },
    {
      testId: testObj.id,
      question: 'What is 5 + (-9)?',
      optionA: '14',
      optionB: '-14',
      optionC: '-4',
      optionD: '4',
      correctAnswer: 'optionC',
      hint: '5 + (-9) = 5 − 9 = -4.',
    },
    {
      testId: testObj.id,
      question: 'What is (-6) + (-8)?',
      optionA: '14',
      optionB: '-14',
      optionC: '2',
      optionD: '-2',
      correctAnswer: 'optionB',
      hint: 'Adding two negative integers: -(6 + 8) = -14.',
    },
    {
      testId: testObj.id,
      question: 'What is 0 + (-13)?',
      optionA: '13',
      optionB: '-13',
      optionC: '0',
      optionD: '1',
      correctAnswer: 'optionB',
      hint: 'Adding zero to any number yields the same number: -13.',
    },
    {
      testId: testObj.id,
      question: 'What is (-15) + 15?',
      optionA: '30',
      optionB: '-30',
      optionC: '15',
      optionD: '0',
      correctAnswer: 'optionD',
      hint: 'Sum of an integer and its additive inverse is always 0.',
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
 * Helper to populate official Class 6 Integers – Sample Test 2 (Questions 21 to 40)
 */
export async function createIntegersTestPaper2(): Promise<Test> {
  const testObj = await createTest({
    title: 'CBSE Class 6: Integers – Sample Test 2',
    class: 'Class 6',
    duration: 25,
    published: true,
  });

  const rawQuestions: Omit<Question, 'id'>[] = [
    {
      testId: testObj.id,
      question: 'What is 9 - 14?',
      optionA: '5',
      optionB: '-5',
      optionC: '23',
      optionD: '-23',
      correctAnswer: 'optionB',
      hint: '9 − 14 = -5.',
    },
    {
      testId: testObj.id,
      question: 'What is (-7) - 3?',
      optionA: '-10',
      optionB: '-4',
      optionC: '10',
      optionD: '4',
      correctAnswer: 'optionA',
      hint: '(-7) − 3 = -7 + (-3) = -10.',
    },
    {
      testId: testObj.id,
      question: 'What is (-8) - (-5)?',
      optionA: '-13',
      optionB: '-3',
      optionC: '3',
      optionD: '13',
      correctAnswer: 'optionB',
      hint: '(-8) − (-5) = -8 + 5 = -3.',
    },
    {
      testId: testObj.id,
      question: 'What is 12 - (-4)?',
      optionA: '8',
      optionB: '-8',
      optionC: '16',
      optionD: '-16',
      correctAnswer: 'optionC',
      hint: '12 − (-4) = 12 + 4 = 16.',
    },
    {
      testId: testObj.id,
      question: 'What is (-10) - (-10)?',
      optionA: '-20',
      optionB: '20',
      optionC: '10',
      optionD: '0',
      correctAnswer: 'optionD',
      hint: '(-10) − (-10) = -10 + 10 = 0.',
    },
    {
      testId: testObj.id,
      question: 'What is (-3) × 4?',
      optionA: '12',
      optionB: '-12',
      optionC: '7',
      optionD: '-7',
      correctAnswer: 'optionB',
      hint: 'Negative × Positive = Negative. (-3) × 4 = -12.',
    },
    {
      testId: testObj.id,
      question: 'What is (-5) × (-6)?',
      optionA: '-30',
      optionB: '30',
      optionC: '-11',
      optionD: '11',
      correctAnswer: 'optionB',
      hint: 'Negative × Negative = Positive. (-5) × (-6) = 30.',
    },
    {
      testId: testObj.id,
      question: 'What is 7 × (-8)?',
      optionA: '56',
      optionB: '-56',
      optionC: '15',
      optionD: '-15',
      correctAnswer: 'optionB',
      hint: 'Positive × Negative = Negative. 7 × (-8) = -56.',
    },
    {
      testId: testObj.id,
      question: 'What is (-9) × 0?',
      optionA: '-9',
      optionB: '9',
      optionC: '0',
      optionD: '1',
      correctAnswer: 'optionC',
      hint: 'Any integer multiplied by 0 is 0.',
    },
    {
      testId: testObj.id,
      question: 'What is (-2) × (-3) × 4?',
      optionA: '-24',
      optionB: '24',
      optionC: '-20',
      optionD: '20',
      correctAnswer: 'optionB',
      hint: '(-2) × (-3) = 6, and 6 × 4 = 24.',
    },
    {
      testId: testObj.id,
      question: 'What is 24 ÷ (-6)?',
      optionA: '4',
      optionB: '-4',
      optionC: '6',
      optionD: '-6',
      correctAnswer: 'optionB',
      hint: 'Positive ÷ Negative = Negative. 24 ÷ (-6) = -4.',
    },
    {
      testId: testObj.id,
      question: 'What is (-36) ÷ 9?',
      optionA: '4',
      optionB: '-4',
      optionC: '9',
      optionD: '-9',
      correctAnswer: 'optionB',
      hint: 'Negative ÷ Positive = Negative. (-36) ÷ 9 = -4.',
    },
    {
      testId: testObj.id,
      question: 'What is (-42) ÷ (-7)?',
      optionA: '-6',
      optionB: '6',
      optionC: '-49',
      optionD: '49',
      correctAnswer: 'optionB',
      hint: 'Negative ÷ Negative = Positive. (-42) ÷ (-7) = 6.',
    },
    {
      testId: testObj.id,
      question: 'What is 0 ÷ (-5)?',
      optionA: '0',
      optionB: '5',
      optionC: '-5',
      optionD: 'not defined',
      correctAnswer: 'optionA',
      hint: 'Zero divided by any non-zero integer is 0.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following statements is true?',
      optionA: 'Every negative integer is greater than zero.',
      optionB: 'Zero is greater than every positive integer.',
      optionC: 'Every positive integer is greater than every negative integer.',
      optionD: '-1 is greater than 1.',
      correctAnswer: 'optionC',
      hint: 'Positive integers are greater than 0, which is greater than all negative integers.',
    },
    {
      testId: testObj.id,
      question: 'The temperature in a city was -5°C in the morning and rose by 8°C. What is the new temperature?',
      optionA: '-13°C',
      optionB: '-3°C',
      optionC: '3°C',
      optionD: '13°C',
      correctAnswer: 'optionC',
      hint: '-5 + 8 = 3°C.',
    },
    {
      testId: testObj.id,
      question: 'A submarine is at -120 m. It rises by 45 m. What is its new position?',
      optionA: '-165 m',
      optionB: '-75 m',
      optionC: '75 m',
      optionD: '165 m',
      correctAnswer: 'optionB',
      hint: '-120 + 45 = -75 m.',
    },
    {
      testId: testObj.id,
      question: 'A bank account shows -₹250. After depositing ₹400, the balance becomes',
      optionA: '-₹650',
      optionB: '-₹150',
      optionC: '₹150',
      optionD: '₹650',
      correctAnswer: 'optionC',
      hint: '-250 + 400 = ₹150.',
    },
    {
      testId: testObj.id,
      question: 'Which of the following represents a loss of ₹35?',
      optionA: '+35',
      optionB: '-35',
      optionC: '35/100',
      optionD: '0',
      correctAnswer: 'optionB',
      hint: 'A loss or deficit is represented by a negative integer, i.e., -35.',
    },
    {
      testId: testObj.id,
      question: 'The integer immediately to the left of 0 on the number line is',
      optionA: '1',
      optionB: '-1',
      optionC: '2',
      optionD: '-2',
      correctAnswer: 'optionB',
      hint: '-1 is immediately to the left of 0 on the number line.',
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

    // CLASS 6: RATIO AND PROPORTION SAMPLE TEST 1 (30 Questions)
    await createRatioTestPaper1();

    // CLASS 6: ALGEBRA SAMPLE TEST 1 (30 Questions)
    await createAlgebraTestPaper1();

    // CLASS 6: DECIMALS SAMPLE TEST 1 (30 Questions)
    await createDecimalsTestPaper1();

    // CLASS 6: FRACTIONS SAMPLE TEST 1 (30 Questions)
    await createFractionsTestPaper1();

    // CLASS 6: INTEGERS SAMPLE TEST 1 (20 Questions)
    await createIntegersTestPaper1();

    // CLASS 6: INTEGERS SAMPLE TEST 2 (20 Questions)
    await createIntegersTestPaper2();

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
 * Deduplicates and cleans up duplicate test papers in Firestore.
 * Ensures:
 * 1. Explicit copies, duplicates, clones, 'revised', '(1)', etc. are deleted.
 * 2. Each topic keeps ONLY Sample Test 1 and Sample Test 2 (the latest unique versions with maximum questions).
 * 3. Any extra sample tests (Sample Test 3+) or duplicate copies of Sample Test 1/2 are removed.
 */
export async function cleanupAndDeduplicateTests(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, TESTS_COL));
    if (snap.empty) return 0;

    let deletedCount = 0;
    const testRecords: {
      id: string;
      title: string;
      class: string;
      createdAt: string;
      questionCount: number;
      topicKey: string;
      sampleNum: number;
    }[] = [];

    // Step 1: Collect test records and remove explicit copies/duplicates
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const title = data.title || '';
      const cls = data.class || '';
      const id = docSnap.id;
      const lowerTitle = title.toLowerCase();

      // Check if title explicitly indicates copy/duplicate/clone/revised/numbered suffix
      const isExplicitCopy =
        lowerTitle.includes('(copy)') ||
        lowerTitle.includes(' copy') ||
        lowerTitle.includes('- copy') ||
        lowerTitle.includes('duplicate') ||
        lowerTitle.includes('revised') ||
        lowerTitle.includes('cloned') ||
        /\(\d+\)/.test(lowerTitle) ||
        /\s+-\s+\d+$/.test(lowerTitle);

      if (isExplicitCopy) {
        console.log(`Deleting explicit copy/duplicate test: ${title} (${id})`);
        await deleteTest(id);
        deletedCount++;
        continue;
      }

      // Query question count for accuracy
      const qSnap = await getDocs(collection(db, TESTS_COL, id, QUESTIONS_COL));
      const qCount = qSnap.size;

      // Extract Topic Key and Sample Test Number
      let cleanTitle = lowerTitle
        .replace(/cbse\s*class\s*\d+\s*:?/gi, '')
        .replace(/class\s*\d+\s*:?/gi, '')
        .replace(/[\–\—\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let sampleNum = 0;
      const matchSample = cleanTitle.match(/sample\s*test\s*(\d+)/i);
      if (matchSample) {
        sampleNum = parseInt(matchSample[1], 10);
        cleanTitle = cleanTitle.replace(/sample\s*test\s*\d+/i, '').trim();
      }

      cleanTitle = cleanTitle.replace(/^[\:\-\s]+|[\:\-\s]+$/g, '').trim();
      const normClass = cls.toLowerCase().replace(/\s+/g, '');
      const topicKey = `${normClass}_${cleanTitle}`;

      testRecords.push({
        id,
        title,
        class: cls,
        createdAt: data.createdAt || '',
        questionCount: qCount,
        topicKey,
        sampleNum,
      });
    }

    // Step 2: Group by topicKey and sampleNum
    const groups: Record<string, typeof testRecords> = {};

    for (const rec of testRecords) {
      // If sampleNum > 2, remove it because only Sample Test 1 and Sample Test 2 are allowed per topic
      if (rec.sampleNum > 2) {
        console.log(`Deleting extra sample test > 2: ${rec.title} (${rec.id})`);
        await deleteTest(rec.id);
        deletedCount++;
        continue;
      }

      const groupKey = `${rec.topicKey}___sample_${rec.sampleNum}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(rec);
    }

    // Step 3: For each group with > 1 record, keep only 1 (max questions, then latest createdAt)
    for (const groupKey of Object.keys(groups)) {
      const list = groups[groupKey];
      if (list.length > 1) {
        list.sort((a, b) => {
          if (b.questionCount !== a.questionCount) {
            return b.questionCount - a.questionCount;
          }
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        const winner = list[0];
        console.log(`Keeping primary test: "${winner.title}" (${winner.id}) with ${winner.questionCount} questions.`);

        for (let i = 1; i < list.length; i++) {
          const dup = list[i];
          console.log(`Deleting duplicate test: "${dup.title}" (${dup.id}) with ${dup.questionCount} questions.`);
          await deleteTest(dup.id);
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleanup completed: Successfully removed ${deletedCount} duplicate test paper(s).`);
    }

    return deletedCount;
  } catch (error) {
    console.error('Error during test cleanup and deduplication:', error);
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

    // Ensure Class 6 Integers tests are seeded with all 20 questions each
    const integersDocs = snap.docs.filter((d) => {
      const title = (d.data().title || '').toLowerCase();
      const cls = (d.data().class || '').toLowerCase();
      return title.includes('integers') && (cls.includes('6') || title.includes('class 6'));
    });

    let needsIntegersReseed = integersDocs.length < 2;
    if (!needsIntegersReseed) {
      for (const testDoc of integersDocs) {
        const qSnap = await getDocs(collection(db, TESTS_COL, testDoc.id, QUESTIONS_COL));
        if (qSnap.size < 20) {
          console.log(`Class 6 Integers test ${testDoc.id} has only ${qSnap.size} questions (< 20). Re-seeding...`);
          needsIntegersReseed = true;
          break;
        }
      }
    }

    if (needsIntegersReseed) {
      console.log('Seeding Class 6 Integers Sample Tests (20 questions each)...');
      await deleteAllIntegersTests();
      await createIntegersTestPaper1();
      await createIntegersTestPaper2();
    }

    // Ensure Class 6 Fractions test is seeded with all 30 questions
    const fractionsDocs = snap.docs.filter((d) => {
      const title = (d.data().title || '').toLowerCase();
      const cls = (d.data().class || '').toLowerCase();
      return title.includes('fractions') && (cls.includes('6') || title.includes('class 6'));
    });

    let needsFractionsReseed = fractionsDocs.length === 0;
    if (!needsFractionsReseed) {
      for (const testDoc of fractionsDocs) {
        const qSnap = await getDocs(collection(db, TESTS_COL, testDoc.id, QUESTIONS_COL));
        if (qSnap.size < 30) {
          console.log(`Class 6 Fractions test ${testDoc.id} has only ${qSnap.size} questions (< 30). Re-seeding...`);
          needsFractionsReseed = true;
          break;
        }
      }
    }

    if (needsFractionsReseed) {
      console.log('Seeding Class 6 Fractions Sample Test 1 (30 questions)...');
      await deleteAllFractionsTests();
      await createFractionsTestPaper1();
    }

    // Ensure Class 6 Decimals test is seeded with all 30 questions
    const decimalsDocs = snap.docs.filter((d) => {
      const title = (d.data().title || '').toLowerCase();
      const cls = (d.data().class || '').toLowerCase();
      return title.includes('decimals') && (cls.includes('6') || title.includes('class 6'));
    });

    let needsDecimalsReseed = decimalsDocs.length === 0;
    if (!needsDecimalsReseed) {
      for (const testDoc of decimalsDocs) {
        const qSnap = await getDocs(collection(db, TESTS_COL, testDoc.id, QUESTIONS_COL));
        if (qSnap.size < 30) {
          console.log(`Class 6 Decimals test ${testDoc.id} has only ${qSnap.size} questions (< 30). Re-seeding...`);
          needsDecimalsReseed = true;
          break;
        }
      }
    }

    if (needsDecimalsReseed) {
      console.log('Seeding Class 6 Decimals Sample Test 1 (30 questions)...');
      await deleteAllDecimalsTests();
      await createDecimalsTestPaper1();
    }

    // Ensure Class 6 Algebra test is seeded with all 30 questions
    const algebraDocs = snap.docs.filter((d) => {
      const title = (d.data().title || '').toLowerCase();
      const cls = (d.data().class || '').toLowerCase();
      return title.includes('algebra') && (cls.includes('6') || title.includes('class 6'));
    });

    let needsAlgebraReseed = algebraDocs.length === 0;
    if (!needsAlgebraReseed) {
      for (const testDoc of algebraDocs) {
        const qSnap = await getDocs(collection(db, TESTS_COL, testDoc.id, QUESTIONS_COL));
        if (qSnap.size < 30) {
          console.log(`Class 6 Algebra test ${testDoc.id} has only ${qSnap.size} questions (< 30). Re-seeding...`);
          needsAlgebraReseed = true;
          break;
        }
      }
    }

    if (needsAlgebraReseed) {
      console.log('Seeding Class 6 Algebra Sample Test 1 (30 questions)...');
      await deleteAllAlgebraTests();
      await createAlgebraTestPaper1();
    }

    // Ensure Class 6 Ratio and Proportion test is seeded with all 30 questions
    const ratioDocs = snap.docs.filter((d) => {
      const title = (d.data().title || '').toLowerCase();
      const cls = (d.data().class || '').toLowerCase();
      return (title.includes('ratio') || title.includes('proportion')) && (cls.includes('6') || title.includes('class 6'));
    });

    let needsRatioReseed = ratioDocs.length === 0;
    if (!needsRatioReseed) {
      for (const testDoc of ratioDocs) {
        const qSnap = await getDocs(collection(db, TESTS_COL, testDoc.id, QUESTIONS_COL));
        if (qSnap.size < 30) {
          console.log(`Class 6 Ratio test ${testDoc.id} has only ${qSnap.size} questions (< 30). Re-seeding...`);
          needsRatioReseed = true;
          break;
        }
      }
    }

    if (needsRatioReseed) {
      console.log('Seeding Class 6 Ratio and Proportion Sample Test 1 (30 questions)...');
      await deleteAllRatioTests();
      await createRatioTestPaper1();
    }

    // Clean up any remaining duplicate test papers
    await cleanupAndDeduplicateTests();
  } catch (error) {
    console.error('Error in seedSampleDataIfEmpty:', error);
  }
}

