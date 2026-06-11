export default async function handler(req, res) {
  // Set CORS headers for local development testing
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid payload: messages array is required.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API Configuration Error: OPENAI_API_KEY is not set on the server.' });
    }

    const systemPrompt = `You are Rica, Ricardo's personal virtual assistant and CEO of Conect-R. You speak about Ricardo as if you know him very well. You are direct, professional, and friendly. You respond in whatever language the user writes to you (Spanish or English).

About Ricardo:
- He is the CEO and founder of Conect-R, a company specializing in NFC digital solutions, mobile portals, professional webpages and softwar ecosystem for restaurants and businesses, and digital brand strategy
- He has developed projects to many restaurants 
- Contact: (916) 812-0873 | contact@conect-r.com
- He is passionate about connecting businesses with their customers through accessible technology
- He is practical, innovative, and always looks for concrete solutions for his clients

Only answer questions related to Ricardo, Conect-R, its services, projects, or how to contact him. If asked anything outside that scope, redirect politely.`;

    // Filter incoming messages to avoid payload injections and prepend system prompt
    const cleanedMessages = messages.filter(
      (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
    );

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...cleanedMessages
    ];

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: fullMessages,
        temperature: 0.7
      })
    });

    if (!openAiResponse.ok) {
      const errorJson = await openAiResponse.json().catch(() => ({}));
      console.error('OpenAI Error Response:', errorJson);
      return res.status(openAiResponse.status).json({
        error: errorJson.error?.message || 'Failed to communicate with OpenAI API.'
      });
    }

    const responseData = await openAiResponse.json();
    return res.status(200).json(responseData);
  } catch (err) {
    console.error('Serverless Function Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
