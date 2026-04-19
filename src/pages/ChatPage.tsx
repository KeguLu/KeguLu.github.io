import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { SITE } from '@/lib/site';
import {
  loadKnowledgeBase,
  isKnowledgeBaseLoaded,
  rankChunks,
  type ScoredChunk,
} from '@/lib/retrieval';
import { embedQuery, streamChat, buildSystemPrompt, type ChatMessage } from '@/lib/agent';

type Turn = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: ScoredChunk[];
  pending?: boolean;
  error?: string;
};

const SUGGESTED_QUERIES = [
  'What is the core methodological novelty of your CP-RVE study?',
  '几何旋转是怎么实现的？代码在哪里？',
  'Your method vs Zhang et al. 2016 — what\'s the key difference?',
  'If I want to run virtual tensile tests at a non-standard angle like 22.5°, how would I modify the code?',
];

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [kbReady, setKbReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const turnIdRef = useRef(0);

  useEffect(() => {
    if (isKnowledgeBaseLoaded()) { setKbReady(true); return; }
    loadKnowledgeBase()
      .then(() => setKbReady(true))
      .catch(err => setKbError(String(err)));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  async function submit(text: string) {
    const query = text.trim();
    if (!query || busy) return;

    const userTurn: Turn = { id: ++turnIdRef.current, role: 'user', content: query };
    const asstTurn: Turn = { id: ++turnIdRef.current, role: 'assistant', content: '', pending: true };
    setTurns(prev => [...prev, userTurn, asstTurn]);
    setInput('');
    setBusy(true);

    try {
      // 1. embed → retrieve
      const queryVec = await embedQuery(query);
      const retrieved = rankChunks(queryVec, { topK: 8, minSim: 0.25 });

      // Attach sources to the assistant turn immediately so the sidebar shows them
      setTurns(prev => prev.map(t =>
        t.id === asstTurn.id ? { ...t, sources: retrieved } : t,
      ));

      // 2. stream chat completion
      const system = buildSystemPrompt(retrieved);
      const history: ChatMessage[] = [
        ...turns.filter(t => !t.pending && !t.error).map(t => ({ role: t.role, content: t.content })),
        { role: 'user', content: query },
      ];

      let accumulated = '';
      for await (const delta of streamChat(system, history)) {
        accumulated += delta;
        setTurns(prev => prev.map(t =>
          t.id === asstTurn.id ? { ...t, content: accumulated } : t,
        ));
      }
      setTurns(prev => prev.map(t =>
        t.id === asstTurn.id ? { ...t, pending: false } : t,
      ));
    } catch (err) {
      setTurns(prev => prev.map(t =>
        t.id === asstTurn.id ? { ...t, pending: false, error: String(err) } : t,
      ));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10">
      <header className="mb-8">
        <Link
          to="/"
          className="font-mono text-xs uppercase tracking-ultra-wide text-ink-muted no-underline hover:text-accent"
        >
          ← Back to work
        </Link>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl tracking-tight">
          Chat with the <em className="italic text-accent">research agent</em>
        </h1>
        <p className="mt-3 max-w-prose text-ink-muted">{SITE.agentDescription}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main conversation */}
        <div className="lg:col-span-8 flex flex-col">
          {turns.length === 0 && (
            <EmptyState
              kbReady={kbReady}
              kbError={kbError}
              onSuggest={submit}
            />
          )}

          <ol className="space-y-8">
            {turns.map(t => (
              <TurnBubble key={t.id} turn={t} />
            ))}
          </ol>
          <div ref={bottomRef} />

          <form
            onSubmit={e => { e.preventDefault(); submit(input); }}
            className="mt-8 sticky bottom-6"
          >
            <div className="relative flex items-end gap-2 bg-surface rounded-sm hairline-top hairline-bottom shadow-sm p-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
                placeholder={kbReady ? 'Ask about the research, methods, or code…' : 'Loading knowledge base…'}
                disabled={!kbReady || busy}
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none px-3 py-2.5 text-base placeholder:text-ink-faint disabled:opacity-50"
                style={{ maxHeight: '8rem' }}
              />
              <button
                type="submit"
                disabled={!kbReady || busy || !input.trim()}
                className="px-4 py-2 bg-ink text-paper rounded-sm font-sans text-sm font-medium disabled:opacity-30 hover:bg-accent transition-colors"
              >
                {busy ? '…' : 'Send'}
              </button>
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-ultra-wide text-ink-faint">
              Shift+Enter for newline. Answers may cite specific passages, which appear in the sidebar.
            </p>
          </form>
        </div>

        {/* Sources sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          <SourcesPanel turns={turns} />
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function EmptyState({
  kbReady, kbError, onSuggest,
}: {
  kbReady: boolean;
  kbError: string | null;
  onSuggest: (q: string) => void;
}) {
  if (kbError) {
    return (
      <div className="py-10 hairline-top hairline-bottom">
        <div className="font-display text-xl text-accent mb-3">Knowledge base failed to load</div>
        <p className="font-mono text-xs text-ink-muted">{kbError}</p>
        <p className="mt-4 text-sm text-ink-muted">
          Make sure you have run <code className="font-mono text-xs bg-surface-warm px-1.5 py-0.5 rounded-sm">npm run build:kb</code> and
          that <code className="font-mono text-xs bg-surface-warm px-1.5 py-0.5 rounded-sm">public/kb/</code> contains the generated files.
        </p>
      </div>
    );
  }
  return (
    <div className="py-8">
      <p className="font-mono text-xs uppercase tracking-ultra-wide text-ink-faint mb-4">
        Try one of these
      </p>
      <ul className="space-y-2">
        {SUGGESTED_QUERIES.map(q => (
          <li key={q}>
            <button
              type="button"
              onClick={() => kbReady && onSuggest(q)}
              disabled={!kbReady}
              className="w-full text-left px-4 py-3 hairline-top hairline-bottom font-display italic text-lg text-ink-muted hover:text-accent hover:bg-surface-warm/50 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function TurnBubble({ turn }: { turn: Turn }) {
  if (turn.role === 'user') {
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] bg-ink text-paper px-5 py-3 rounded-sm">
          <p className="whitespace-pre-wrap">{turn.content}</p>
        </div>
      </li>
    );
  }
  // assistant
  return (
    <li>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-ultra-wide text-ink-faint">
        Agent
      </div>
      {turn.error ? (
        <div className="prose-academic text-accent">
          <p><strong>Error:</strong> {turn.error}</p>
        </div>
      ) : (
        <div className="prose-academic max-w-none">
          {turn.content === '' && turn.pending ? (
            <p className="text-ink-faint italic animate-pulse">Retrieving & thinking…</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
            >
              {linkifyCitations(turn.content)}
            </ReactMarkdown>
          )}
        </div>
      )}
    </li>
  );
}

// Turn [source: id1, id2] into subtle footnote-style markers. We don't
// hyperlink them to in-page anchors (those chunks live in the sidebar),
// but we style them so they're visually distinct from the prose.
function linkifyCitations(md: string): string {
  return md.replace(/\[source:\s*([^\]]+)\]/g, (_m, ids) => {
    const list = ids.split(',').map((s: string) => s.trim()).filter(Boolean);
    return list.map((id: string) => `<sup class="citation" data-id="${id}">[${shortId(id)}]</sup>`).join('');
  });
}

function shortId(id: string): string {
  // "01-CP-Simulation::Approach_(part_2)" → "Approach"
  const parts = id.split('::');
  const last = parts[parts.length - 1] ?? id;
  return last.split('_')[0].replace(/\(.*$/, '').slice(0, 14);
}

/* ------------------------------------------------------------------ */
function SourcesPanel({ turns }: { turns: Turn[] }) {
  // Show sources from the last assistant turn that has them.
  const lastWithSources = [...turns].reverse().find(t => t.sources && t.sources.length > 0);

  return (
    <div className="text-sm">
      <h3 className="font-mono text-xs uppercase tracking-ultra-wide text-ink-faint mb-4">
        Sources
      </h3>
      {!lastWithSources ? (
        <p className="text-ink-faint text-xs">
          Sources cited by the agent will appear here once you send a message.
        </p>
      ) : (
        <ol className="space-y-3">
          {lastWithSources.sources!.map(c => (
            <li key={c.id} className="hairline-bottom pb-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] text-ink-faint">
                  {(c.score * 100).toFixed(0)}%
                </span>
                <span className="font-mono text-[10px] text-ink-faint uppercase tracking-ultra-wide">
                  {c.source_type}
                </span>
              </div>
              <div className="mt-1 font-display italic text-ink leading-snug">
                {displayTitle(c)}
              </div>
              <div className="mt-1 font-mono text-[10px] text-ink-muted break-all">
                {c.source_path}
                {c.line_start && c.line_end ? ` : ${c.line_start}–${c.line_end}` : ''}
                {c.cell_index ? ` : cell ${c.cell_index}` : ''}
              </div>
              <p className="mt-2 text-xs text-ink-muted leading-relaxed line-clamp-3">
                {previewText(c.text)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function displayTitle(c: ScoredChunk): string {
  if (c.section) return c.section;
  if (c.name) return c.name;
  if (c.area_title) return c.area_title;
  return c.id;
}

function previewText(text: string): string {
  // Strip leading markdown headers and code fences for preview
  return text
    .replace(/^#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/^\[.*?\]\s*/gm, '')
    .trim()
    .slice(0, 200);
}
