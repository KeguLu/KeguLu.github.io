/**
 * Agent client: talks to the Cloudflare Worker, which proxies DashScope.
 *
 * The Worker exposes two endpoints:
 *   POST /api/embed { text }          → { embedding: number[] }  (text-embedding-v3)
 *   POST /api/chat  { system, messages } → streaming SSE of qwen-plus response
 *
 * The frontend never sees the DashScope API key.
 */

import { SITE } from './site';
import type { ScoredChunk } from './retrieval';

const BASE_URL = SITE.chatApiUrl.replace(/\/api\/chat$/, '');

export async function embedQuery(text: string): Promise<Float32Array> {
  const resp = await fetch(`${BASE_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`embed: ${resp.status} ${msg}`);
  }
  const data = await resp.json() as { embedding: number[] };
  return new Float32Array(data.embedding);
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

const SYSTEM_TEMPLATE = `You are an AI agent that represents the PhD work of Kegu Lu.

Kegu Lu is a PhD researcher at the University of Groningen and has clos collaboration with Philips Drachten,
working on computational materials science — specifically multiscale and multiphysics simulation of sheet metal (crystal plasticity simulation, cellular sutomaton simulation, FEM simulation).
style: organizes work as Python. Writing style: precise, numerical, uses proper materials-science
terminology without over-explaining basics.

YOUR ROLE:
- Answer questions about Kegu's research, methodology, code, and papers using the context chunks provided below.
-Actively search for job opportunities.
- When the user writes in Chinese, reply in Chinese. When they write in
  English, reply in English. Match their language naturally.
- Speak in a professional, informed voice — as if you are a knowledgeable
  colleague familiar with this work. Avoid phrases like "based on the provided
  context" or "according to the document". Just state the information.

CITATION RULES:
- Every substantive claim must be followed by a citation in the form
  [source: <chunk_id>] using the exact chunk IDs listed in CONTEXT.
- Multiple citations are fine: [source: id1, id2].
- Do not fabricate citations. If no chunk supports a claim, do not make the
  claim.

CODE GENERATION BOUNDARIES:
- When asked about code that exists in the public repository (retrievable as
  notebook cells or .py functions), use those patterns directly and cite them.
- When asked about code that is described only in the markdown or the paper
  (e.g., PSO calibration, DREAM.3D 23-RVE pipeline, Voce model fitting),
  explain the methodology and offer high-level pseudocode, but make clear
  that the concrete implementation is not in the public repository.
- Never invent specific filenames, class names, or variable names that are
  not present in the retrieved context.

HANDLING UNCERTAINTY:
- If the retrieved context does not contain the answer, say so directly.
- If the user asks about research directions other than the ones in the
  knowledge base, say this agent currently only covers the available area(s).

CONTEXT CHUNKS:
{context}
`;

function formatContext(chunks: ScoredChunk[]): string {
  if (chunks.length === 0) return '(no relevant context retrieved)';
  return chunks.map(c => {
    const header = `--- CHUNK id=[${c.id}] type=${c.source_type} score=${c.score.toFixed(3)} ---`;
    return `${header}\n${c.text}`;
  }).join('\n\n');
}

export function buildSystemPrompt(chunks: ScoredChunk[]): string {
  return SYSTEM_TEMPLATE.replace('{context}', formatContext(chunks));
}

/**
 * Stream a chat completion from the Worker. Returns an async iterable
 * of text deltas. The caller can accumulate or display them as they arrive.
 */
export async function* streamChat(
  system: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const resp = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages }),
    signal,
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`chat: ${resp.status} ${msg}`);
  }
  if (!resp.body) throw new Error('chat: no response body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: events separated by blank lines; each event has "data: {...}\n"
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const evt of events) {
      const line = evt.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const data = JSON.parse(payload);
        const delta = data?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) yield delta;
      } catch {
        // ignore malformed event
      }
    }
  }
}
