export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

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
}
