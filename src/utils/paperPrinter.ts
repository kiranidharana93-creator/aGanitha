import { Test, Question } from '../types';
import { getQuestionsByTestId } from '../services/db';

/**
 * Generates and prints/downloads a clean, professional CBSE Question Paper in A4 Portrait layout.
 * Includes Section headings, clear numbering, option formatting, and a separate Answer Key page.
 */
export async function printCBSEQuestionPaper(test: Test, existingQuestions?: Question[]): Promise<void> {
  let questions = existingQuestions;
  if (!questions || questions.length === 0) {
    try {
      questions = await getQuestionsByTestId(test.id);
    } catch (err) {
      console.error('Failed to load questions for printing:', err);
      alert('Could not load test paper questions. Please check connection and try again.');
      return;
    }
  }

  if (!questions || questions.length === 0) {
    alert('No questions found for this test paper.');
    return;
  }

  const sortedQuestions = [...questions].sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to view, print, or download the CBSE Question Paper.');
    return;
  }

  // Define section bounds for standard 30-question test or generic papers
  const is30Q = sortedQuestions.length === 30;

  let sectionA: Question[] = [];
  let sectionB: Question[] = [];
  let sectionC: Question[] = [];
  let sectionD: Question[] = [];
  let sectionE: Question[] = [];

  if (is30Q) {
    sectionA = sortedQuestions.slice(0, 10);
    sectionB = sortedQuestions.slice(10, 18);
    sectionC = sortedQuestions.slice(18, 24);
    sectionD = sortedQuestions.slice(24, 28);
    sectionE = sortedQuestions.slice(28, 30);
  } else {
    // Standard division if not 30 questions
    sectionA = sortedQuestions;
  }

  const isAlgebra = test.title.toLowerCase().includes('algebra');
  const isDecimals = test.title.toLowerCase().includes('decimals');
  const isFractions = test.title.toLowerCase().includes('fractions');
  const isRatio = test.title.toLowerCase().includes('ratio') || test.title.toLowerCase().includes('proportion');
  const isTest2 = test.title.toLowerCase().includes('test 2') || test.title.toLowerCase().includes('test-2') || test.title.toLowerCase().includes('test–2');

  let subTitle = 'Mathematics Test Paper';
  let sampleTestTitle = isTest2 ? 'Test – 2' : 'Test – 1';

  if (isRatio) {
    subTitle = 'Chapter 12 – Ratio and Proportion';
  } else if (isAlgebra) {
    subTitle = 'Chapter 11 – Algebra';
  } else if (isDecimals) {
    subTitle = 'Chapter 8 – Decimals';
  } else if (isFractions) {
    subTitle = 'Chapter 7 – Fractions';
  } else {
    subTitle = test.title.replace(/sample\s*/gi, '');
  }

  const renderQuestionBlock = (q: Question, idx: number, markLabel: string) => {
    // Strip leading numbers if present in question string to avoid double numbering
    const cleanQ = q.question.replace(/^\d+[\.\)]\s*/, '').replace(/\n/g, '<br/>');
    const num = idx + 1;
    const isMcq = Boolean(q.optionA || q.optionB);

    if (isMcq) {
      const optsHtml = [
        q.optionA ? `<div class="option-item"><span class="opt-label">a)</span> ${q.optionA}</div>` : '',
        q.optionB ? `<div class="option-item"><span class="opt-label">b)</span> ${q.optionB}</div>` : '',
        q.optionC ? `<div class="option-item"><span class="opt-label">c)</span> ${q.optionC}</div>` : '',
        q.optionD ? `<div class="option-item"><span class="opt-label">d)</span> ${q.optionD}</div>` : '',
      ].filter(Boolean).join('');

      return `
        <div class="question-item">
          <div class="question-header">
            <span class="q-num">${num}.</span>
            <span class="q-text">${cleanQ}</span>
          </div>
          <div class="options-grid">
            ${optsHtml}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="question-item">
          <div class="question-header">
            <span class="q-num">${num}.</span>
            <span class="q-text">${cleanQ}</span>
          </div>
          <div style="margin-top: 10px; margin-left: 24px; font-weight: bold; color: #1e293b; font-size: 13px;">
            Answer: __________________________________________________
          </div>
        </div>
      `;
    }
  };

  const getAnswerLetter = (correct: string): string => {
    const val = correct.toLowerCase();
    if (val === 'optiona' || val === 'a') return 'a';
    if (val === 'optionb' || val === 'b') return 'b';
    if (val === 'optionc' || val === 'c') return 'c';
    if (val === 'optiond' || val === 'd') return 'd';
    return correct;
  };

  const getAnswerText = (q: Question): string => {
    const letter = getAnswerLetter(q.correctAnswer);
    if (letter === 'a') return q.optionA;
    if (letter === 'b') return q.optionB;
    if (letter === 'c') return q.optionC;
    if (letter === 'd') return q.optionD;
    return '';
  };

  const renderAnswerKeyRow = (q: Question, idx: number) => {
    const num = idx + 1;
    const isMcq = Boolean(q.optionA || q.optionB);
    let ansDisplay = '';

    if (isMcq) {
      const letter = getAnswerLetter(q.correctAnswer);
      const text = getAnswerText(q);
      ansDisplay = `<strong>(${letter})</strong> ${text ? text : ''}`;
    } else {
      ansDisplay = `<strong>${q.correctAnswer}</strong>`;
    }

    return `
      <tr>
        <td class="ak-num">${num}</td>
        <td class="ak-ans">${ansDisplay}</td>
        <td class="ak-hint">${q.hint || 'No additional explanation.'}</td>
      </tr>
    `;
  };

  const paperTitle = `CBSE ${test.class || 'Class 6'} Mathematics – ${subTitle} – ${sampleTestTitle}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${paperTitle} - CBSE Question Paper</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', Times, 'Georgia', serif;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 20px;
            font-size: 13.5pt;
            line-height: 1.45;
          }
          .cbse-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .board-title {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .sub-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .paper-title {
            font-size: 13pt;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 11pt;
            font-weight: bold;
            border-top: 1px solid #333;
            padding-top: 6px;
            margin-top: 6px;
          }
          .section-banner {
            margin-top: 20px;
            margin-bottom: 12px;
            font-weight: bold;
            font-size: 12pt;
            border-bottom: 1.5px solid #000;
            padding-bottom: 4px;
          }
          .section-subtext {
            font-style: italic;
            font-size: 10.5pt;
            font-weight: normal;
            margin-top: 2px;
          }
          .question-item {
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .question-header {
            display: flex;
            gap: 6px;
            align-items: flex-start;
          }
          .q-num {
            font-weight: bold;
            min-width: 24px;
          }
          .q-text {
            flex: 1;
          }
          .options-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px 16px;
            margin-left: 28px;
            margin-top: 6px;
            font-size: 11.5pt;
          }
          .option-item {
            display: flex;
            gap: 6px;
          }
          .opt-label {
            font-weight: bold;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          .answer-key-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 16px;
          }
          .ak-title {
            font-size: 15pt;
            font-weight: bold;
            text-transform: uppercase;
          }
          table.answer-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 11pt;
          }
          table.answer-table th, table.answer-table td {
            border: 1px solid #444;
            padding: 7px 10px;
            text-align: left;
            vertical-align: top;
          }
          table.answer-table th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10pt;
          }
          .ak-num {
            width: 8%;
            text-align: center;
            font-weight: bold;
          }
          .ak-ans {
            width: 32%;
          }
          .ak-hint {
            width: 60%;
            color: #222;
          }
          .no-print-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #0f172a;
            color: #fff;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: system-ui, -apple-system, sans-serif;
            z-index: 9999;
          }
          .btn-print {
            background: #16449B;
            color: white;
            border: none;
            padding: 8px 18px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            font-size: 14px;
          }
          .btn-close {
            background: #475569;
            color: white;
            border: none;
            padding: 8px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
          }
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              padding: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div>
            <strong style="font-size: 15px;">CBSE Question Paper Ready for Print & PDF Export</strong>
            <div style="font-size: 12px; color: #94a3b8;">Formatted for A4 Portrait Worksheet / Examination Upload</div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
            <button class="btn-close" onclick="window.close()">Close</button>
          </div>
        </div>

        <div style="margin-top: 50px;" class="print-container">
          <div class="cbse-header">
            <div class="board-title">CBSE ${test.class || 'Class 6'} Mathematics</div>
            <div class="sub-title">${subTitle}</div>
            ${sampleTestTitle ? `<div class="paper-title">${sampleTestTitle}</div>` : ''}
            <div class="meta-row">
              <span>Time: ${test.duration || 60} Minutes</span>
              <span>Marks: ${sortedQuestions.length}</span>
            </div>
          </div>

          ${
            (isRatio || isAlgebra || isDecimals)
              ? sortedQuestions.map((q, i) => renderQuestionBlock(q, i, '1 mark')).join('')
              : `
                ${
                  sectionA.length > 0
                    ? `
                    <div class="section-banner">
                      Section A – Multiple Choice Questions (1 mark each)
                      <div class="section-subtext">Choose the correct answer.</div>
                    </div>
                    ${sectionA.map((q, i) => renderQuestionBlock(q, i, '1 mark')).join('')}
                  `
                    : ''
                }

                ${
                  sectionB.length > 0
                    ? `
                    <div class="section-banner">
                      Section B – Fill in the Blanks (1 mark each)
                    </div>
                    ${sectionB.map((q, i) => renderQuestionBlock(q, 10 + i, '1 mark')).join('')}
                  `
                    : ''
                }

                ${
                  sectionC.length > 0
                    ? `
                    <div class="section-banner">
                      Section C – True or False (1 mark each)
                    </div>
                    ${sectionC.map((q, i) => renderQuestionBlock(q, 18 + i, '1 mark')).join('')}
                  `
                    : ''
                }

                ${
                  sectionD.length > 0
                    ? `
                    <div class="section-banner">
                      Section D – Short Answer Questions (2 marks each)
                    </div>
                    ${sectionD.map((q, i) => renderQuestionBlock(q, 24 + i, '2 marks')).join('')}
                  `
                    : ''
                }

                ${
                  sectionE.length > 0
                    ? `
                    <div class="section-banner">
                      Section E – Word Problems (3 marks each)
                    </div>
                    ${sectionE.map((q, i) => renderQuestionBlock(q, 28 + i, '3 marks')).join('')}
                  `
                    : ''
                }
              `
          }

          <!-- SEPARATE ANSWER KEY PAGE -->
          <div class="page-break"></div>

          <div class="answer-key-header">
            <div class="ak-title">Answer Key & Solutions</div>
            <div style="font-size: 12pt; font-weight: bold; margin-top: 4px;">
              CBSE ${test.class || 'Class 6'} Mathematics – ${subTitle} (${sampleTestTitle})
            </div>
          </div>

          <table class="answer-table">
            <thead>
              <tr>
                <th style="width: 8%;">Q.No.</th>
                <th style="width: 32%;">Correct Answer</th>
                <th style="width: 60%;">Step-by-step Solution / Hint</th>
              </tr>
            </thead>
            <tbody>
              ${sortedQuestions.map((q, i) => renderAnswerKeyRow(q, i)).join('')}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Helper function to download Admin Answer Key as DOCX document.
 */
export async function downloadAdminAnswerKeyDOCX(test: Test, existingQuestions?: Question[]): Promise<void> {
  const sortedQuestions = existingQuestions && existingQuestions.length > 0
    ? [...existingQuestions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    : await getQuestionsByTestId(test.id);

  const cleanTitle = (test.title || 'Mathematics_Test').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${cleanTitle}_Admin_Answer_Key.doc`;

  const getOptionText = (q: Question, optKey: string) => {
    switch (optKey) {
      case 'optionA': return q.optionA;
      case 'optionB': return q.optionB;
      case 'optionC': return q.optionC;
      case 'optionD': return q.optionD;
      default: return optKey;
    }
  };

  const rows = sortedQuestions.map((q, idx) => {
    const isMcq = Boolean(q.optionA || q.optionB);
    let ansText = '';
    if (isMcq) {
      const optLabel = q.correctAnswer.replace('option', 'Option ');
      const optValue = getOptionText(q, q.correctAnswer) || '';
      ansText = `${optLabel}: ${optValue}`;
    } else {
      ansText = q.correctAnswer;
    }

    return `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 8px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1;">Q${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">${q.question}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #15803d;">${ansText}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; color: #334155; font-style: italic;">${q.hint || 'Standard NCERT Solution'}</td>
      </tr>
    `;
  }).join('');

  const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${test.title} - Admin Answer Key</title>
      <style>
        body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #0f172a; margin: 20pt; }
        .header { text-align: center; border-bottom: 2pt solid #16449B; padding-bottom: 8pt; margin-bottom: 16pt; }
        .title { font-size: 16pt; font-weight: bold; color: #16449B; text-transform: uppercase; }
        .subtitle { font-size: 13pt; font-weight: bold; color: #334155; margin-top: 4pt; }
        .meta { font-size: 10.5pt; color: #475569; margin-top: 6pt; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 16pt; font-size: 10.5pt; }
        th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left; text-transform: uppercase; }
        .footer { margin-top: 30pt; border-top: 1pt solid #cbd5e1; padding-top: 8pt; text-align: center; font-size: 9.5pt; font-weight: bold; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">CBSE ${test.class || 'Class 6'} Mathematics</div>
        <div class="subtitle">${test.title}</div>
        <div class="subtitle" style="font-size: 11pt; color: #166534;">ADMIN OFFICIAL ANSWER KEY & SOLUTIONS</div>
        <div class="meta">Total Questions: ${sortedQuestions.length} | Total Marks: ${sortedQuestions.length} | Duration: ${test.duration || 60} Minutes</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 8%; text-align: center;">Q.No</th>
            <th style="width: 38%;">Question Text</th>
            <th style="width: 24%;">Correct Answer</th>
            <th style="width: 30%;">Explanation / Working</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="footer">
        CBSE Maths Portal – Admin Use Only
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens Admin Answer Key formatted view for PDF download or Printing.
 */
export async function downloadAdminAnswerKeyPDF(test: Test, existingQuestions?: Question[]): Promise<void> {
  const sortedQuestions = existingQuestions && existingQuestions.length > 0
    ? [...existingQuestions].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    : await getQuestionsByTestId(test.id);

  const cleanTitle = (test.title || 'Mathematics_Test').replace(/[^a-zA-Z0-9]/g, '_');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download or print the Admin Answer Key PDF.');
    return;
  }

  const getOptionText = (q: Question, optKey: string) => {
    switch (optKey) {
      case 'optionA': return q.optionA;
      case 'optionB': return q.optionB;
      case 'optionC': return q.optionC;
      case 'optionD': return q.optionD;
      default: return optKey;
    }
  };

  const rows = sortedQuestions.map((q, idx) => {
    const isMcq = Boolean(q.optionA || q.optionB);
    let ansText = '';
    if (isMcq) {
      const optLabel = q.correctAnswer.replace('option', 'Option ');
      const optValue = getOptionText(q, q.correctAnswer) || '';
      ansText = `${optLabel}: ${optValue}`;
    } else {
      ansText = q.correctAnswer;
    }

    return `
      <tr>
        <td style="text-align: center; font-weight: bold;">Q${idx + 1}</td>
        <td>${q.question}</td>
        <td style="font-weight: bold; color: #166534;">${ansText}</td>
        <td style="color: #334155;">${q.hint || 'Standard NCERT Solution'}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${cleanTitle}_Admin_Answer_Key</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #0f172a; margin: 0; padding: 20px; }
          .no-print-bar { position: fixed; top: 0; left: 0; right: 0; background: #0f172a; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; font-family: system-ui; }
          .btn-action { background: #16449B; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
          .btn-close { background: #475569; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
          .header { text-align: center; border-bottom: 2px solid #16449B; padding-bottom: 10px; margin-top: 40px; margin-bottom: 16px; }
          .title { font-size: 16pt; font-weight: bold; color: #16449B; text-transform: uppercase; }
          .subtitle { font-size: 13pt; font-weight: bold; color: #334155; margin-top: 4px; }
          .admin-tag { font-size: 11pt; font-weight: bold; color: #15803d; margin-top: 4px; }
          .meta { font-size: 10.5pt; font-weight: bold; color: #475569; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10pt; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; }
          .footer { margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 8px; text-align: center; font-size: 9.5pt; font-weight: bold; color: #64748b; }
          @media print {
            .no-print-bar { display: none !important; }
            body { padding: 0 !important; }
            .header { margin-top: 0 !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div>
            <strong>Admin Answer Key & Solutions PDF</strong>
            <div style="font-size: 12px; color: #94a3b8;">Title: ${cleanTitle}_Admin_Answer_Key</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-action" onclick="window.print()">🖨️ Save as PDF / Print</button>
            <button class="btn-close" onclick="window.close()">Close</button>
          </div>
        </div>

        <div class="header">
          <div class="title">CBSE ${test.class || 'Class 6'} Mathematics</div>
          <div class="subtitle">${test.title}</div>
          <div class="admin-tag">ADMIN ANSWER KEY & STEP-BY-STEP EXPLANATIONS</div>
          <div class="meta">Total Questions: ${sortedQuestions.length} | Marks: ${sortedQuestions.length} | Duration: ${test.duration || 60} Mins</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 8%; text-align: center;">Q.No</th>
              <th style="width: 38%;">Question Text</th>
              <th style="width: 24%;">Correct Answer</th>
              <th style="width: 30%;">Short Explanation / Working</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="footer">
          CBSE Maths Portal – Admin Use Only
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
