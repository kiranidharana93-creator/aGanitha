import { Attempt, Student, Test } from '../types';

export interface TopicPerformance {
  topic: string;
  attemptsCount: number;
  totalScore: number;
  totalQuestions: number;
  avgPercentage: number;
  status: 'Critical Improvement Required' | 'Needs Practice' | 'Good' | 'Excellent';
  recommendedActions: string[];
}

export interface StudentAnalytics {
  studentName: string;
  studentClass: string;
  totalTestsAttempted: number;
  avgPercentage: number;
  lastTestScorePercentage: number;
  lastTestTitle: string;
  highestScorePercentage: number;
  lowestScorePercentage: number;
  grade: string;
  performanceGradeTitle: string;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  correctPercentage: number;
  wrongPercentage: number;
  unansweredPercentage: number;
  topicPerformances: TopicPerformance[];
  lessonBarChartData: Array<{
    lesson: string;
    score: number;
    color: string;
    status: 'Excellent' | 'Good' | 'Needs Practice' | 'Critical Improvement Required';
    attemptsCount: number;
  }>;
  improvementTrend: Array<{
    attemptLabel: string;
    testTitle: string;
    topic: string;
    scorePercentage: number;
    dateStr: string;
  }>;
  weakTopics: TopicPerformance[];
  teacherRemarks: string;
}

export function getBarColor(pct: number): string {
  if (pct >= 70) return '#0052CC'; // Primary Blue
  return '#D32F2F';                  // Accent Red
}

export function cleanStudentTestTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^cbse\s*class\s*\d+\s*:?\s*/gi, '')
    .replace(/^cbse\s*:?\s*/gi, '')
    .replace(/^class\s*\d+\s*:?\s*/gi, '')
    .replace(/\s*\(\s*class\s*\d+\s*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function extractTopicFromTitle(title: string): string {
  if (!title) return 'General Mathematics';

  const clean = cleanStudentTestTitle(title)
    .replace(/sample\s*test\s*\d+/gi, '')
    .replace(/sample\s*test/gi, '')
    .replace(/test\s*paper\s*\d+/gi, '')
    .replace(/chapter\s*\d+\s*:?/gi, '')
    .replace(/[\–\—\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length > 0) {
    // Capitalize properly
    return clean
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return 'General Mathematics';
}

export function getStatusFromPercentage(
  pct: number
): 'Critical Improvement Required' | 'Needs Practice' | 'Good' | 'Excellent' {
  if (pct >= 85) return 'Excellent';
  if (pct >= 70) return 'Good';
  if (pct >= 50) return 'Needs Practice';
  return 'Critical Improvement Required';
}

export function getGradeFromPercentage(pct: number): { grade: string; title: string } {
  if (pct >= 90) return { grade: 'A+', title: 'Outstanding' };
  if (pct >= 80) return { grade: 'A', title: 'Excellent' };
  if (pct >= 70) return { grade: 'B+', title: 'Good' };
  if (pct >= 60) return { grade: 'B', title: 'Above Average' };
  if (pct >= 50) return { grade: 'C', title: 'Needs Practice' };
  return { grade: 'D', title: 'Critical Attention Needed' };
}

export function getRecommendationsForTopic(topic: string, status: string, scorePct: number = 70): string[] {
  const lower = topic.toLowerCase();
  const actions: string[] = [];

  if (lower.includes('playing with numbers') || lower.includes('playing numbers')) {
    actions.push('Revise divisibility rules for 2, 3, 4, 5, 6, 8, 9, 10, and 11.');
    actions.push('Practice HCF and LCM word problems.');
    actions.push('Improve speed in prime factorisation questions.');
    actions.push('Attempt Test 2 for additional practice.');
  } else if (lower.includes('whole number')) {
    actions.push('Revise commutative, associative, and distributive properties.');
    actions.push('Practice mental math calculations using distributive property patterns.');
    actions.push('Solve word problems on predecessor, successor, and pattern recognition.');
  } else if (lower.includes('integer')) {
    actions.push('Practice number line operations and sign rules for integers.');
    actions.push('Revise addition and subtraction of negative and positive numbers.');
    actions.push('Solve real-life word problems involving temperature and elevation changes.');
  } else if (lower.includes('fraction')) {
    actions.push('Practice converting between mixed fractions and improper fractions.');
    actions.push('Revise finding equivalent fractions and simplifying to lowest terms.');
    actions.push('Master unlike fraction addition and subtraction using the LCM method.');
  } else if (lower.includes('decimal')) {
    actions.push('Practice place value representation (tenths, hundredths, thousandths).');
    actions.push('Revise alignment of decimal points during addition and subtraction.');
    actions.push('Convert decimals to fractions and solve practical word problems on money and measurement.');
  } else if (lower.includes('algebra')) {
    actions.push('Practice forming algebraic expressions from daily life statements.');
    actions.push('Revise identifying terms, factors, and coefficients in algebraic equations.');
    actions.push('Solve linear equations using trial & error and systematic balancing methods.');
  } else if (lower.includes('geometry') || lower.includes('geometrical') || lower.includes('shape')) {
    actions.push('Revise geometric definitions: Points, Line Segments, Rays, Parallel and Intersecting Lines.');
    actions.push('Practice measuring and classifying angles (Acute, Right, Obtuse, Reflex).');
    actions.push('Practice identifying properties of polygons, triangles, and 3D shapes.');
  } else if (lower.includes('mensuration') || lower.includes('perimeter') || lower.includes('area')) {
    actions.push('Memorize formulas for Perimeter (Square = 4a, Rectangle = 2(l+b)) and Area.');
    actions.push('Solve word problems involving fencing boundaries and room flooring.');
    actions.push('Practice unit conversions (e.g. cm² to m²).');
  } else if (lower.includes('data handling') || lower.includes('data')) {
    actions.push('Practice constructing and reading tally charts and pictographs.');
    actions.push('Practice drawing and interpreting bar graphs with uniform scales.');
  } else if (lower.includes('ratio') || lower.includes('proportion')) {
    actions.push('Practice simplifying ratios to simplest form and checking proportions.');
    actions.push('Solve real-world word problems using the Unitary Method.');
  } else {
    actions.push('Re-read NCERT textbook theory and solve key solved examples.');
    actions.push('Review recorded test answers to rectify conceptual mistakes.');
    actions.push('Attempt additional chapter tests to build speed and accuracy.');
  }

  if (scorePct < 50 || status === 'Critical Improvement Required') {
    actions.unshift('Immediate review required for basic definitions and fundamental rules.');
    actions.push('Seek guided 1-on-1 clarification from subject teacher.');
  } else if (scorePct < 70 || status === 'Needs Practice') {
    actions.unshift('Focus on step-by-step problem solving to eliminate calculation oversights.');
  } else if (scorePct >= 85 || status === 'Excellent') {
    actions.push('Challenge yourself with Higher Order Thinking Skills (HOTS) and Mathematics Olympiad questions.');
  }

  return actions;
}

export function generateTeacherRemarks(
  studentName: string,
  avgPct: number,
  topicPerformances: TopicPerformance[]
): string {
  const strong = topicPerformances.filter((t) => t.avgPercentage >= 70).map((t) => t.topic);
  const weak = topicPerformances.filter((t) => t.avgPercentage < 70).map((t) => t.topic);

  if (avgPct >= 85) {
    if (weak.length === 0) {
      return `${studentName} demonstrates outstanding mathematical grasp and consistent top-tier accuracy across all CBSE chapters. Keep up the brilliant work!`;
    }
    return `${studentName} exhibits excellent overall performance (${avgPct}% average). Slight focus on ${weak.join(', ')} will help achieve perfect scores.`;
  }

  if (avgPct >= 70) {
    if (weak.length > 0) {
      return `${studentName} has shown strong performance in ${strong.join(', ')}. Additional practice in ${weak.join(', ')} is recommended to improve consistency.`;
    }
    return `${studentName} maintains a good understanding of core CBSE concepts with an average score of ${avgPct}%. Continued revision will lead to top grades.`;
  }

  if (avgPct >= 50) {
    return `${studentName} shows steady effort (${avgPct}% average), but requires targeted revision in ${
      weak.length > 0 ? weak.join(', ') : 'core topics'
    } to build speed and conceptual accuracy.`;
  }

  return `${studentName} requires urgent attention and guided practice in ${
    weak.length > 0 ? weak.join(', ') : 'CBSE Mathematics chapters'
  }. Regular daily practice of chapter tests and formula revision is strongly advised.`;
}

export function calculateStudentAnalytics(
  studentOrName: Student | string,
  classOrAttempts: string | Attempt[],
  optionalAttempts?: Attempt[]
): StudentAnalytics {
  let studentName = typeof studentOrName === 'string' ? studentOrName : studentOrName.name;
  let studentClass = typeof studentOrName === 'string' ? (classOrAttempts as string) : studentOrName.class;
  let attempts: Attempt[] = Array.isArray(classOrAttempts) ? classOrAttempts : (optionalAttempts || []);

  const totalTestsAttempted = attempts.length;

  const defaultStandardLessons = [
    'Whole Numbers',
    'Playing With Numbers',
    'Integers',
    'Fractions',
    'Decimals',
    'Data Handling',
    'Mensuration',
  ];

  if (totalTestsAttempted === 0) {
    const emptyLessonData = defaultStandardLessons.map((lesson) => ({
      lesson,
      score: 0,
      color: '#D32F2F',
      status: 'Critical Improvement Required' as const,
      attemptsCount: 0,
    }));

    return {
      studentName,
      studentClass,
      totalTestsAttempted: 0,
      avgPercentage: 0,
      lastTestScorePercentage: 0,
      lastTestTitle: 'No Tests Taken',
      highestScorePercentage: 0,
      lowestScorePercentage: 0,
      grade: 'N/A',
      performanceGradeTitle: 'No Attempts Recorded',
      totalCorrect: 0,
      totalWrong: 0,
      totalUnanswered: 0,
      correctPercentage: 0,
      wrongPercentage: 0,
      unansweredPercentage: 0,
      topicPerformances: [],
      lessonBarChartData: emptyLessonData,
      improvementTrend: [],
      weakTopics: [],
      teacherRemarks: 'No test attempts recorded yet. Please complete a test to generate analytics.',
    };
  }

  let totalCorrect = 0;
  let totalWrong = 0;
  let totalUnanswered = 0;
  let sumPercentage = 0;
  let maxPct = 0;
  let minPct = 100;

  const topicMap: Record<
    string,
    { attemptsCount: number; totalScore: number; totalQuestions: number }
  > = {};

  // Sort attempts chronologically
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );

  const lastAttempt = sortedAttempts[sortedAttempts.length - 1];
  const lastTestScorePercentage = Math.round(
    ((lastAttempt?.score || 0) / (lastAttempt?.totalQuestions || 1)) * 100
  );
  const lastTestTitle = lastAttempt?.testTitle || 'Test 1';

  const improvementTrend = sortedAttempts.map((att, index) => {
    const totalQ = att.totalQuestions || 1;
    const scorePct = Math.round((att.score / totalQ) * 100);
    const topic = extractTopicFromTitle(att.testTitle || 'CBSE Test');

    sumPercentage += scorePct;
    if (scorePct > maxPct) maxPct = scorePct;
    if (scorePct < minPct) minPct = scorePct;

    // Approximate correct vs wrong vs unanswered from answers map if available
    const answeredCount = att.answers ? Object.keys(att.answers).length : att.score;
    const correct = att.score;
    const wrong = Math.max(0, answeredCount - correct);
    const unanswered = Math.max(0, totalQ - answeredCount);

    totalCorrect += correct;
    totalWrong += wrong;
    totalUnanswered += unanswered;

    if (!topicMap[topic]) {
      topicMap[topic] = { attemptsCount: 0, totalScore: 0, totalQuestions: 0 };
    }
    topicMap[topic].attemptsCount += 1;
    topicMap[topic].totalScore += att.score;
    topicMap[topic].totalQuestions += totalQ;

    const dateObj = att.submittedAt ? new Date(att.submittedAt) : new Date();
    const dateStr = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

    return {
      attemptLabel: `Test ${index + 1}`,
      testTitle: att.testTitle || 'CBSE Test',
      topic,
      scorePercentage: scorePct,
      dateStr,
    };
  });

  const avgPercentage = Math.round(sumPercentage / totalTestsAttempted);
  const { grade, title: performanceGradeTitle } = getGradeFromPercentage(avgPercentage);

  const totalQuestionsAll = totalCorrect + totalWrong + totalUnanswered || 1;
  const correctPercentage = Math.round((totalCorrect / totalQuestionsAll) * 100);
  const wrongPercentage = Math.round((totalWrong / totalQuestionsAll) * 100);
  const unansweredPercentage = Math.max(0, 100 - (correctPercentage + wrongPercentage));

  const topicPerformances: TopicPerformance[] = Object.entries(topicMap).map(([topic, data]) => {
    const avgPct = Math.round((data.totalScore / (data.totalQuestions || 1)) * 100);
    const status = getStatusFromPercentage(avgPct);
    const recommendedActions = getRecommendationsForTopic(topic, status, avgPct);

    return {
      topic,
      attemptsCount: data.attemptsCount,
      totalScore: data.totalScore,
      totalQuestions: data.totalQuestions,
      avgPercentage: avgPct,
      status,
      recommendedActions,
    };
  });

  // Build Lesson Bar Chart Data covering standard CBSE lessons + any extra attempted lessons
  const existingTopicNames = new Set(Object.keys(topicMap));
  const allLessonNames = Array.from(new Set([...defaultStandardLessons, ...Array.from(existingTopicNames)]));

  const lessonBarChartData = allLessonNames.map((lesson) => {
    // Find matching topic in topicMap if available
    const matchedKey = Object.keys(topicMap).find(
      (k) => k.toLowerCase().includes(lesson.toLowerCase()) || lesson.toLowerCase().includes(k.toLowerCase())
    );

    let score = 0;
    let attemptsCount = 0;

    if (matchedKey && topicMap[matchedKey]) {
      const data = topicMap[matchedKey];
      score = Math.round((data.totalScore / (data.totalQuestions || 1)) * 100);
      attemptsCount = data.attemptsCount;
    } else if (existingTopicNames.size > 0) {
      // If student has taken tests but this specific lesson hasn't been tested yet
      score = 0;
    }

    const color = getBarColor(score);
    const status = getStatusFromPercentage(score);

    return {
      lesson,
      score,
      color,
      status,
      attemptsCount,
    };
  });

  // Weak topics are below 70%
  const weakTopics = topicPerformances.filter((t) => t.avgPercentage < 70);

  const teacherRemarks = generateTeacherRemarks(studentName, avgPercentage, topicPerformances);

  return {
    studentName,
    studentClass,
    totalTestsAttempted,
    avgPercentage,
    lastTestScorePercentage,
    lastTestTitle,
    highestScorePercentage: maxPct,
    lowestScorePercentage: minPct === 100 && totalTestsAttempted === 0 ? 0 : minPct,
    grade,
    performanceGradeTitle,
    totalCorrect,
    totalWrong,
    totalUnanswered,
    correctPercentage,
    wrongPercentage,
    unansweredPercentage,
    topicPerformances,
    lessonBarChartData,
    improvementTrend,
    weakTopics,
    teacherRemarks,
  };
}
