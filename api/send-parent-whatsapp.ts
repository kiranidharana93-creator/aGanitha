export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const {
      student,
      reportingPeriod,
      overallPercentage,
      grade,
      testsAttempted,
      topicSummary,
      teacherRemarks,
      actionItems,
      studentName,
      studentClass,
      className,
      parentMobile,
      parentPhone,
      topic,
      score,
      totalMarks,
      total,
      totalQuestions,
      percentage,
      status,
      improvementArea,
    } = req.body || {};

    const rawMobile =
      (student && student.parentMobile) ||
      parentMobile ||
      parentPhone ||
      "";

    const digits = rawMobile.replace(/\D/g, "");
    const formattedMobile =
      digits.length === 10
        ? `91${digits}`
        : digits.length === 12 && digits.startsWith("91")
        ? digits
        : digits;

    const rawClass = (student && student.class) || studentClass || className || "6";
    const sClass = rawClass.replace(/class\s*/i, '').trim() || rawClass;
    const sName = (student && student.name) || studentName || "Student";
    const period = reportingPeriod || "August 2026";
    const overallPct = overallPercentage !== undefined ? overallPercentage : (percentage || 0);
    const studentGrade = grade || (overallPct >= 90 ? 'A+' : overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B+' : overallPct >= 60 ? 'B' : overallPct >= 50 ? 'C' : 'D');
    const testsCount = testsAttempted !== undefined ? testsAttempted : 1;

    // Format topic-wise performance
    let topicsFormatted = "";
    if (typeof topicSummary === 'string' && topicSummary.trim()) {
      topicsFormatted = topicSummary;
    } else if (Array.isArray(topicSummary)) {
      topicsFormatted = topicSummary.map((t: any) => {
        const name = t.topic || t.name || "General";
        const pctVal = `${t.avgPercentage ?? t.percentage ?? 0}%`;
        const dotsCount = Math.max(2, 28 - name.length - pctVal.length);
        return `${name} ${'.'.repeat(dotsCount)} ${pctVal}`;
      }).join('\n');
    } else if (topic) {
      const name = topic;
      const pctVal = `${percentage || score || 0}%`;
      const dotsCount = Math.max(2, 28 - name.length - pctVal.length);
      topicsFormatted = `${name} ${'.'.repeat(dotsCount)} ${pctVal}`;
    } else {
      topicsFormatted = "Whole Numbers .............. 79%\nIntegers ................... 10%\nPlaying With Numbers ....... 13%";
    }

    // Areas Requiring Improvement (single line points)
    let improvementFormatted = "";
    if (typeof actionItems === 'string' && actionItems.trim()) {
      improvementFormatted = actionItems;
    } else if (Array.isArray(actionItems)) {
      improvementFormatted = actionItems.map((item: string) => item.startsWith('•') ? item : `• ${item}`).join('\n');
    } else if (improvementArea) {
      improvementFormatted = `• ${improvementArea}`;
    } else {
      improvementFormatted = "• Integer operations and sign rules\n• Divisibility rules, HCF and LCM concepts\n• Speed and accuracy in problem solving";
    }

    // Comment & Action Plan
    const actionPlanHeader = teacherRemarks || `The student demonstrates active participation. Follow the action steps below for structured practice and score improvement:`;

    const progressCardMessage = `🎓 *REPORT CARD*
*CBSE Maths Portal*
────────────────────────────
*Student* : ${sName}
*Level*   : CBSE Mathematics
*Class*   : Class ${sClass}
────────────────────────────
*Subject*                  *Percentage*
${topicsFormatted}
────────────────────────────
*Comment / Action Plan :*
${actionPlanHeader}

*Actionable Steps:*
${improvementFormatted}
────────────────────────────
_CBSE Mathematics Portal Official Progress Card_`;

    const sScore = score !== undefined ? score : (req.body?.result && req.body.result.score) !== undefined ? req.body.result.score : 0;
    const sTotalMarks = totalMarks || total || totalQuestions || (req.body?.result && req.body.result.totalMarks) || 0;
    const sTopic = topic || (req.body?.result && req.body.result.topic) || "Mathematics";
    const sPercentage = percentage !== undefined ? percentage : overallPct;

    const payload = {
      messaging_product: 'whatsapp',
      to: formattedMobile,
      type: req.body?.useTextMessage ? 'text' : 'template',
      ...(req.body?.useTextMessage
        ? { text: { preview_url: false, body: progressCardMessage } }
        : {
            template: {
              name: 'jaspers_market_order_confirmation_v1',
              language: { code: 'en_US' },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: `CBSE Maths Result - ${sName}` },
                    { type: 'text', text: `${sScore}/${sTotalMarks}` },
                    { type: 'text', text: `${sTopic} - ${sPercentage}%` }
                  ]
                }
              ]
            }
          })
    };

    console.log('[WhatsApp Progress Card]\n' + progressCardMessage);
    console.log('[WhatsApp Payload]', JSON.stringify(payload, null, 2));

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiUrl = `https://graph.facebook.com/v25.0/${phoneId || 'MISSING_PHONE_NUMBER_ID'}/messages`;

    if (!token || !phoneId) {
      console.warn('⚠️ WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set in environment variables.');
      return res.status(200).json({
        success: true,
        status: "simulated_missing_credentials",
        message: "Result saved & simulated notification logged.",
      });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let responseBody: any = null;
    try {
      responseBody = await response.json();
    } catch (jsonErr) {
      responseBody = { rawText: await response.text() };
    }

    console.log('[WhatsApp Response]', responseBody);

    return res.status(200).json({
      success: response.ok,
      statusCode: response.status,
      apiUrl,
      whatsapp: responseBody,
      metaResponse: responseBody,
    });
  } catch (error: any) {
    console.error('❌ Fetch / Network Error in Parent WhatsApp:', error);
    return res.status(200).json({
      success: false,
      error: error.message || 'Failed to dispatch WhatsApp message',
    });
  }
}
