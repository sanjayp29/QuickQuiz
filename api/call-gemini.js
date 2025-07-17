// This is the Node.js function snippet that will run on Vercel's servers.
export default async function handler(request, response) {
  // Only allow POST requests for security.
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, expectJson } = request.body;

    if (!prompt) {
      return response.status(400).json({ error: 'Prompt is required' });
    }

    // Securely get the API key from Vercel's environment variables.
    // It is NEVER exposed to the public.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return response.status(500).json({ error: 'API key is not configured on the server' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    if (expectJson) {
      payload.generationConfig = { responseMimeType: "application/json" };
    }

    // Securely call the Google Gemini API from the backend
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API Error:", errorText);
      return response.status(geminiResponse.status).json({ error: `Gemini API call failed` });
    }

    const result = await geminiResponse.json();
    const text = result.candidates[0].content.parts[0].text;
    
    // Send the result back to the client
    return response.status(200).json({ data: expectJson ? JSON.parse(text) : text });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return response.status(500).json({ error: 'An internal server error occurred.' });
  }
}
