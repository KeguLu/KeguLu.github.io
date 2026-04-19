/**
 * Cloudflare Worker — proxy to DashScope (Alibaba Cloud / Qwen).
 *
 * Endpoints:
 *   POST /api/embed  { text }              → { embedding: number[] }
 *   POST /api/chat   { system, messages }  → SSE stream
 *
 * Protections:
 *   1. CORS whitelist  — only requests from ALLOWED_ORIGINS get through.
 *   2. Per-IP rate limit — 30 requests/day + 5 requests/minute, KV-backed.
 *   3. Monthly token circuit breaker — hard stop when a configurable budget
 *      is reached. Count is bumped from streaming chat + embed responses.
 *   4. Secrets are held in Worker env vars, never exposed to the browser.
 *
 * Required bindings (wrangler.toml):
 *   - DASHSCOPE_API_KEY  (secret)    — your DashScope Singapore key
 *   - KV                 (KV ns)     — for rate limit + token counters
 *   - Vars: MAX_MONTHLY_TOKENS, IP_LIMIT_PER_DAY, IP_LIMIT_PER_MINUTE,
 *           ALLOWED_ORIGINS, MODEL_CHAT, MODEL_EMBED, DASHSCOPE_BASE_URL
 */

export interface Env {
  DASHSCOPE_API_KEY: string;
  KV: KVNamespace;
  MAX_MONTHLY_TOKENS: string;
  IP_LIMIT_PER_DAY: string;
  IP_LIMIT_PER_MINUTE: string;
  ALLOWED_ORIGINS: string; // comma-separated
  MODEL_CHAT: string;
  MODEL_EMBED: string;
  EMBED_DIMENSIONS?: string;
  DASHSCOPE_BASE_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get('origin') ?? '';
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(corsOrigin),
      });
    }

    // Origin whitelist check (block non-preflight requests from unknown origins)
    if (origin && !allowedOrigins.includes(origin)) {
      return json({ error: 'origin not allowed' }, 403, corsHeaders(corsOrigin));
    }

    // Health check
    if (url.pathname === '/' && request.method === 'GET') {
      return json({ ok: true, service: 'phd-agent-proxy' }, 200, corsHeaders(corsOrigin));
    }

    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405, corsHeaders(corsOrigin));
    }

    // Rate limit per client IP
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const rateCheck = await checkRateLimit(ip, env);
    if (!rateCheck.allowed) {
      return json({ error: rateCheck.reason, retry_after_seconds: rateCheck.retryAfter }, 429, {
        ...corsHeaders(corsOrigin),
        'Retry-After': String(rateCheck.retryAfter),
      });
    }

    // Circuit breaker: monthly token budget
    const month = monthKey();
    const spent = Number((await env.KV.get(`tokens:${month}`)) ?? '0');
    const max = Number(env.MAX_MONTHLY_TOKENS);
    if (spent >= max) {
      return json(
        { error: 'monthly token budget exhausted; try again next month' },
        503,
        corsHeaders(corsOrigin),
      );
    }

    try {
      if (url.pathname === '/api/embed') {
        return await handleEmbed(request, env, corsOrigin, ctx);
      }
      if (url.pathname === '/api/chat') {
        return await handleChat(request, env, corsOrigin, ctx);
      }
      return json({ error: 'not found' }, 404, corsHeaders(corsOrigin));
    } catch (err) {
      return json({ error: String(err) }, 500, corsHeaders(corsOrigin));
    }
  },
};

/* --------------------------------------------------------------- */
/* CORS                                                             */
/* --------------------------------------------------------------- */
function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/* --------------------------------------------------------------- */
/* Rate limiting                                                    */
/* --------------------------------------------------------------- */
async function checkRateLimit(
  ip: string,
  env: Env,
): Promise<{ allowed: true } | { allowed: false; reason: string; retryAfter: number }> {
  const perDay = Number(env.IP_LIMIT_PER_DAY);
  const perMin = Number(env.IP_LIMIT_PER_MINUTE);

  const day = new Date().toISOString().slice(0, 10);          // YYYY-MM-DD
  const min = new Date().toISOString().slice(0, 16);          // YYYY-MM-DDTHH:MM

  const dayKey = `rate:${ip}:${day}`;
  const minKey = `rate:${ip}:${min}`;

  const [dayStr, minStr] = await Promise.all([env.KV.get(dayKey), env.KV.get(minKey)]);
  const dayCount = Number(dayStr ?? '0');
  const minCount = Number(minStr ?? '0');

  if (dayCount >= perDay) {
    return { allowed: false, reason: 'daily rate limit exceeded', retryAfter: 3600 };
  }
  if (minCount >= perMin) {
    return { allowed: false, reason: 'per-minute rate limit exceeded', retryAfter: 60 };
  }

  // Increment. expirationTtl lets the KV entry auto-expire.
  await Promise.all([
    env.KV.put(dayKey, String(dayCount + 1), { expirationTtl: 86400 * 2 }),
    env.KV.put(minKey, String(minCount + 1), { expirationTtl: 120 }),
  ]);

  return { allowed: true };
}

function monthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function bumpTokens(env: Env, delta: number): Promise<void> {
  if (delta <= 0) return;
  const k = `tokens:${monthKey()}`;
  const cur = Number((await env.KV.get(k)) ?? '0');
  // Keep counter for ~40 days so it survives month rollovers gracefully.
  await env.KV.put(k, String(cur + delta), { expirationTtl: 86400 * 40 });
}

/* --------------------------------------------------------------- */
/* /api/embed                                                       */
/* --------------------------------------------------------------- */
async function handleEmbed(
  request: Request,
  env: Env,
  corsOrigin: string,
  ctx: ExecutionContext,
): Promise<Response> {
  const body = await request.json<{ text?: string }>().catch(() => ({}));
  const text = (body.text ?? '').trim();
  if (!text) return json({ error: 'text required' }, 400, corsHeaders(corsOrigin));
  if (text.length > 8000) {
    return json({ error: 'text too long' }, 400, corsHeaders(corsOrigin));
  }

  const payload: Record<string, unknown> = {
    model: env.MODEL_EMBED,
    input: [text],
    encoding_format: 'float',
  };
  if (env.EMBED_DIMENSIONS) {
    payload.dimensions = Number(env.EMBED_DIMENSIONS);
  }

  const upstream = await fetch(`${env.DASHSCOPE_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return json({ error: `dashscope embed: ${upstream.status}`, detail: errText }, upstream.status, corsHeaders(corsOrigin));
  }

  const data = await upstream.json<{
    data: { embedding: number[] }[];
    usage?: { total_tokens?: number };
  }>();

  // Bookkeeping (async, doesn't block response)
  if (data.usage?.total_tokens) {
    ctx.waitUntil(bumpTokens(env, data.usage.total_tokens));
  }

  return json(
    { embedding: data.data[0].embedding },
    200,
    corsHeaders(corsOrigin),
  );
}

/* --------------------------------------------------------------- */
/* /api/chat — streaming SSE                                        */
/* --------------------------------------------------------------- */
async function handleChat(
  request: Request,
  env: Env,
  corsOrigin: string,
  ctx: ExecutionContext,
): Promise<Response> {
  const body = await request.json<{
    system?: string;
    messages?: { role: 'user' | 'assistant'; content: string }[];
  }>().catch(() => ({}));

  const system = (body.system ?? '').slice(0, 40000); // sane cap
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return json({ error: 'messages required' }, 400, corsHeaders(corsOrigin));
  }
  // Cap message count & per-message length
  const truncMessages = messages.slice(-20).map(m => ({
    role: m.role,
    content: String(m.content ?? '').slice(0, 8000),
  }));

  const upstream = await fetch(`${env.DASHSCOPE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.MODEL_CHAT,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...truncMessages,
      ],
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => upstream.statusText);
    return json({ error: `dashscope chat: ${upstream.status}`, detail: errText }, upstream.status, corsHeaders(corsOrigin));
  }

  // Pipe upstream SSE through, while parsing out usage data at the end
  // so we can bump the monthly token counter.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const reader = upstream.body.getReader();
  const writer = writable.getWriter();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  let totalTokens = 0;

  const pump = async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        await writer.write(value);

        buffer += decoder.decode(value, { stream: true });
        let eventEnd: number;
        while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
          const evt = buffer.slice(0, eventEnd).trim();
          buffer = buffer.slice(eventEnd + 2);
          if (!evt.startsWith('data:')) continue;
          const payload = evt.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed?.usage?.total_tokens) {
              totalTokens = parsed.usage.total_tokens;
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      // best-effort: propagate error as a final SSE event
      try {
        await writer.write(encoder.encode(`data: {"error":${JSON.stringify(String(e))}}\n\n`));
      } catch { /* give up */ }
    } finally {
      try { await writer.close(); } catch { /* noop */ }
      if (totalTokens > 0) {
        ctx.waitUntil(bumpTokens(env, totalTokens));
      }
    }
  };
  ctx.waitUntil(pump());

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      ...corsHeaders(corsOrigin),
    },
  });
}
