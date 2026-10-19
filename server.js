import express from 'express';
import 'dotenv/config';
import {
  ProxyError,
  authenticate,
  corsHeaders,
  loadAuthConfig,
  loadProjectCredentials,
  prepareAiRequest,
  prepareGitHubRequest,
} from './server/proxySecurity.js';

// Refuse to start with missing or incomplete credentials. There are no
// placeholder keys and no cross-project fallback.
const auth = loadAuthConfig();
const { projects, errors } = loadProjectCredentials();
const startupErrors = [...auth.errors, ...errors];
if (startupErrors.length > 0) {
  console.error('Proxy not started. Fix these settings (see .env.example):');
  for (const e of startupErrors) console.error(`  - ${e}`);
  process.exit(1);
}
for (const p of projects.values()) {
  const ai = [p.openaiApiKey && 'openai', p.anthropicApiKey && 'anthropic'].filter(Boolean);
  console.log(`Project ${p.id}: ${p.repos.size} repo(s), AI providers: ${ai.join(', ') || 'none'}`);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

// CORS allowlist (PROXY_ALLOWED_ORIGINS); same-origin requests carry no Origin.
app.use((req, res, next) => {
  try {
    res.set(corsHeaders(auth, req.headers.origin));
  } catch (err) {
    return res.status(err.status).json({ error: err.message });
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Every /api route requires a signed-in caller.
app.use('/api', async (req, res, next) => {
  try {
    req.user = await authenticate(auth, req.headers, req.socket.remoteAddress);
    next();
  } catch (err) {
    next(err);
  }
});

app.post('/api/github/proxy', async (req, res, next) => {
  try {
    const upstream = prepareGitHubRequest(projects, req.body || {});
    const ghRes = await fetch(upstream.url, {
      method: upstream.method,
      headers: upstream.headers,
      body: upstream.body,
    });

    for (const [key, val] of ghRes.headers.entries()) {
      if (key.toLowerCase().startsWith('x-ratelimit-')) res.setHeader(key, val);
    }
    if (ghRes.status === 204) return res.status(204).send();
    res.status(ghRes.status).type(ghRes.headers.get('content-type') || 'application/json').send(await ghRes.text());
  } catch (err) {
    next(err);
  }
});

app.post('/api/ai/chat', async (req, res, next) => {
  try {
    const ai = prepareAiRequest(projects, req.body || {});
    let reply = '';

    if (ai.provider === 'anthropic') {
      const system = ai.messages.find((m) => m.role === 'system');
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': ai.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: ai.model,
          max_tokens: 4096,
          system: system ? system.content : 'You are an intelligent architecture assistant.',
          messages: ai.messages.filter((m) => m.role !== 'system'),
        }),
      });
      if (!r.ok) throw new ProxyError(502, `Anthropic returned HTTP ${r.status}`);
      const data = await r.json();
      reply = data.content?.[0]?.text || '';
    } else {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ai.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ai.model, messages: ai.messages }),
      });
      if (!r.ok) throw new ProxyError(502, `OpenAI returned HTTP ${r.status}`);
      const data = await r.json();
      reply = data.choices?.[0]?.message?.content || '';
    }

    res.status(200).json({ reply });
  } catch (err) {
    next(err);
  }
});

// Upstream error bodies and stack traces stay in the server log.
app.use((err, req, res, _next) => {
  if (err instanceof ProxyError) return res.status(err.status).json({ error: err.message });
  if (err instanceof SyntaxError) return res.status(400).json({ error: 'Invalid JSON' });
  console.error(`${req.method} ${req.path} failed:`, err);
  res.status(500).json({ error: 'Internal proxy error' });
});

const PORT = Number(process.env.PROXY_PORT || 3001);
const HOST = process.env.PROXY_HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Orchestrator backend running on http://${HOST}:${PORT}`);
});
