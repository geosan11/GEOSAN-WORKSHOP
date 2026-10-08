import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Fake Vault for the proxy
const VAULT = {
  "proj-ehi-001": {
    github_token: process.env.GITHUB_TOKEN || "ghp_fake_token_for_ehi_123",
    openai_api_key: process.env.OPENAI_API_KEY || "sk-fake-openai-token",
    anthropic_api_key: process.env.ANTHROPIC_API_KEY || "sk-ant-fake-anthropic-token",
  },
  "proj-iya-001": {
    github_token: process.env.GITHUB_TOKEN || "ghp_fake_token_for_iya_456",
  }
};

app.post('/api/github/proxy', async (req, res) => {
  const { endpoint, options, project_id } = req.body;
  const credentials = VAULT[project_id] || VAULT["proj-ehi-001"];

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint' });
  }

  const url = `https://api.github.com${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = { ...options?.headers, 'User-Agent': 'AetherOrch-Proxy' };
  
  // Inject the server-side token securely
  if (credentials && credentials.github_token) {
    headers['Authorization'] = `token ${credentials.github_token}`;
  }

  try {
    const ghRes = await fetch(url, {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined
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
    res.status(ghRes.status).send(text);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ message: 'Internal Proxy Error', details: error.message });
  }
});

// AI Inference Endpoint
app.post('/api/ai/chat', async (req, res) => {
  const { messages, project_id, modelId } = req.body;
  const credentials = VAULT[project_id] || VAULT["proj-ehi-001"];

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages array' });
  }

  try {
    let aiResponseText = '';

    // Route to Anthropic (Claude)
    if (modelId?.includes('claude')) {
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
    res.status(500).json({ error: 'AI inference failed', details: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Orchestrator Backend running on http://localhost:${PORT}`);
});
