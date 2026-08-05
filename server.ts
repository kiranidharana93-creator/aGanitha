import express from "express";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Temporary Test WhatsApp API endpoint (Meta Graph API v25.0 with template payload)
  app.post("/api/test-whatsapp", async (req, res) => {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiUrl = `https://graph.facebook.com/v25.0/${phoneId || 'MISSING_PHONE_NUMBER_ID'}/messages`;

    console.log('==================================================');
    console.log('[TEST WHATSAPP API] Dispatching Meta Graph API Test Request...');
    console.log('Final API URL:', apiUrl);
    console.log('Phone Number ID:', phoneId ? `${phoneId.substring(0, 6)}...` : 'NOT SET');
    console.log('Token Present:', Boolean(token));

    if (!token || !phoneId) {
      const missingError = {
        error: 'WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID environment variables are missing on the server.',
      };
      console.error('❌ Server Config Error:', missingError.error);
      return res.status(400).json({
        success: false,
        statusCode: 400,
        apiUrl,
        metaResponse: missingError,
        error: missingError.error,
      });
    }

    const testPayload = {
      messaging_product: 'whatsapp',
      to: '919353913218',
      type: 'template',
      template: {
        name: 'jaspers_market_order_confirmation_v1',
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Kiran' },
              { type: 'text', text: 'CBSE-TEST-001' },
              { type: 'text', text: 'Today' }
            ]
          }
        ]
      }
    };

    console.log('Request Payload:', JSON.stringify(testPayload, null, 2));

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      const statusCode = response.status;
      let responseBody: any = null;

      try {
        responseBody = await response.json();
      } catch (jsonErr) {
        responseBody = { rawText: await response.text() };
      }

      console.log('HTTP Status Code:', statusCode);
      console.log('Full Meta Response Body:', JSON.stringify(responseBody, null, 2));
      console.log('==================================================');

      return res.status(statusCode).json({
        success: response.ok,
        statusCode,
        apiUrl,
        metaResponse: responseBody,
      });
    } catch (networkError: any) {
      console.error('❌ Fetch / Network Error:', networkError);
      console.log('==================================================');
      return res.status(500).json({
        success: false,
        statusCode: 500,
        apiUrl,
        error: networkError.message || String(networkError),
        metaResponse: { fetchError: networkError.message || String(networkError) },
      });
    }
  });

  // Background Parent WhatsApp API handler
  app.post("/api/send-parent-whatsapp", async (req, res) => {
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
        // Fallbacks if passed directly
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
      } = req.body;

      // Determine target mobile phone number from student object or fallbacks
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

      const sName = (student && student.name) || studentName || "Student";
      const sClass = (student && student.class) || studentClass || className || "Class 6";
      const period = reportingPeriod || "August 2026";
      const overallPct = overallPercentage !== undefined ? overallPercentage : (percentage || 0);
      const studentGrade = grade || (overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B' : overallPct >= 50 ? 'C' : 'D');
      const testsCount = testsAttempted !== undefined ? testsAttempted : 1;
      
      const topicsText = topicSummary || (topic ? `• ${topic}: ${percentage || score || 0}% (${status || 'Completed'})` : "• General Mathematics: Performance recorded");
      const remarksText = teacherRemarks || `${sName} shows steady effort (${overallPct}% average), but requires targeted practice to build speed and conceptual accuracy.`;
      const actionsText = actionItems || (improvementArea ? improvementArea : "• Review fundamental concepts and practice solved textbook examples.");

      const sScore = score !== undefined ? score : (req.body.result && req.body.result.score) !== undefined ? req.body.result.score : 0;
      const sTotalMarks = totalMarks || total || totalQuestions || (req.body.result && req.body.result.totalMarks) || 0;
      const sTopic = topic || (req.body.result && req.body.result.topic) || "Mathematics";
      const sPercentage = percentage !== undefined ? percentage : overallPct;

      const payload = {
        messaging_product: 'whatsapp',
        to: formattedMobile,
        type: 'template',
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
      };

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
  });

  // Vite middleware for development vs production static serving
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
