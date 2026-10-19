import express from 'express';
import cors from 'cors';
import { checkGitHubProxyRequest, isOriginAllowed } from './server/githubProxyPolicy.mjs';

const app = express();

// Only pages we serve may call this backend from a browser.
app.use(cors({
  origin(origin, callback) {
    callback(null, isOriginAllowed(origin));
  },
}));
app.use((req, res, next) => {
  if (!isOriginAllowed(req.headers.origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  next();
});
app.use(express.json({ limit: '2mb' }));

// Credentials come only from the environment. There are no per-project
// fallbacks and no placeholder keys: a missing key is reported as 503.
const credentials = {
  openai_api_key: process.env.OPENAI_API_KEY || '',
  anthropic_api_key: process.env.ANTHROPIC_API_KEY || '',
};

app.post('/api/github/proxy', async (req, res) => {
  const { endpoint, options } = req.body || {};
  const check = checkGitHubProxyRequest(endpoint, options);
  if (!check.ok) {
    return res.status(check.status).json({ error: check.error });
  }

  try {
    const ghRes = await fetch(check.url, {
      method: check.method,
      headers: check.headers,
      body: check.body,
    });

    // Proxy headers back for Rate Limit info
    for (const [key, val] of ghRes.headers.entries()) {
      if (key.toLowerCase().startsWith('x-ratelimit-')) {
        res.setHeader(key, val);
      }
    }

    if (ghRes.status === 204) {
      return res.status(204).send();
    }

    const text = await ghRes.text();
    res.status(ghRes.status).type(ghRes.headers.get('content-type') || 'application/json').send(text);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ message: 'Internal Proxy Error' });
  }
});

// AI Inference Endpoint
app.post('/api/ai/chat', async (req, res) => {
  const { messages, modelId } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages array' });
  }

  const provider = modelId?.includes('claude') ? 'anthropic' : 'openai';
  const key = provider === 'anthropic' ? credentials.anthropic_api_key : credentials.openai_api_key;
  if (!key) {
    const envName = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    return res.status(503).json({ error: `AI provider not configured on the server (set ${envName})` });
  }

  try {
    let aiResponseText = '';

    // Route to Anthropic (Claude)
    if (provider === 'anthropic') {
      const url = 'https://api.anthropic.com/v1/messages';
      const systemMessage = messages.find(m => m.role === 'system');
      const userMessages = messages.filter(m => m.role !== 'system');
      
      const payload = {
        model: modelId || 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        system: systemMessage ? systemMessage.content : "You are an intelligent architecture assistant.",
        messages: userMessages.map(m => ({ role: m.role, content: m.content }))
      };

      const anthropicRes = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': credentials.anthropic_api_key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!anthropicRes.ok) {
        throw new Error(`Anthropic Error: ${await anthropicRes.text()}`);
      }
      const data = await anthropicRes.json();
      aiResponseText = data.content?.[0]?.text || '';
    } 
    // Default route to OpenAI (GPT/DeepSeek simulated)
    else {
      const url = 'https://api.openai.com/v1/chat/completions';
      
      // Convert internal roles to OpenAI expected roles (e.g. tool -> user/assistant depending)
      const openaiMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const payload = {
        model: modelId || 'gpt-4o',
        messages: openaiMessages
      };

      const openaiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.openai_api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!openaiRes.ok) {
        throw new Error(`OpenAI Error: ${await openaiRes.text()}`);
      }
      const data = await openaiRes.json();
      aiResponseText = data.choices?.[0]?.message?.content || '';
    }

    res.status(200).json({ reply: aiResponseText });
  } catch (error) {
    console.error('AI Proxy Error:', error);
    res.status(500).json({ error: 'AI inference failed' });
  }
});

const PORT = Number(process.env.PORT) || 3001;
// Bind to localhost by default so the backend is not reachable from other machines.
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Orchestrator Backend running on http://${HOST}:${PORT}`);
  if (!process.env.GITHUB_TOKEN && !process.env.GITHUB_PAT) console.warn('GITHUB_TOKEN not set: /api/github/proxy will return 503.');
  if (!credentials.openai_api_key) console.warn('OPENAI_API_KEY not set: OpenAI chat will return 503.');
  if (!credentials.anthropic_api_key) console.warn('ANTHROPIC_API_KEY not set: Claude chat will return 503.');
});
