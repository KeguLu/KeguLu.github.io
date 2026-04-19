import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { parseFrontmatter, type AreaFrontmatter, type Paper, type Repo } from '@/lib/frontmatter';

export default function AreaPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; frontmatter: AreaFrontmatter; body: string }
  >({ status: 'loading' });

  useEffect(() => {
    if (!id) return;
    setState({ status: 'loading' });

    // Find the .md file for this area via the manifest
    fetch(`${import.meta.env.BASE_URL}kb/manifest.json`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((m: { areas: { id: string; file: string }[] }) => {
        const area = m.areas.find(a => a.id === id);
        if (!area) throw new Error(`Area "${id}" not found in manifest`);
        return fetch(`${import.meta.env.BASE_URL}kb/areas/${area.file}`);
      })
      .then(r => r.ok ? r.text() : Promise.reject(r.statusText))
      .then(raw => {
        const { frontmatter, body } = parseFrontmatter(raw);
        setState({ status: 'ready', frontmatter, body });
      })
      .catch(err => setState({ status: 'error', message: String(err) }));
  }, [id]);

  if (state.status === 'loading') {
    return (
      <div className="mx-auto max-w-6xl px-6 lg:px-10 py-24">
        <div className="font-mono text-sm text-ink-faint uppercase tracking-ultra-wide">Loading…</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-6xl px-6 lg:px-10 py-24">
        <div className="font-display text-2xl text-accent mb-4">Could not load this research area</div>
        <p className="font-mono text-sm text-ink-muted">{state.message}</p>
        <Link to="/" className="mt-6 inline-block font-mono text-xs uppercase tracking-ultra-wide">← Back to home</Link>
      </div>
    );
  }

  const { frontmatter, body } = state;

  return (
    <article className="mx-auto max-w-6xl px-6 lg:px-10 pt-12 pb-20">
      <AreaHeader fm={frontmatter} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-6 mt-14">
        <aside className="lg:col-span-3 lg:sticky lg:top-24 lg:self-start order-2 lg:order-1">
          <AreaSidebar fm={frontmatter} body={body} />
        </aside>
        <div className="lg:col-span-9 order-1 lg:order-2">
          <div className="prose-academic max-w-prose-wide">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
            >
              {body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
function AreaHeader({ fm }: { fm: AreaFrontmatter }) {
  return (
    <header className="animate-fade-up">
      <Link
        to="/"
        className="font-mono text-xs uppercase tracking-ultra-wide text-ink-muted no-underline hover:text-accent"
      >
        ← All research
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs uppercase tracking-ultra-wide text-ink-faint">
        {fm.period && <span>{fm.period}</span>}
        {fm.status && (
          <>
            <span className="text-ink-faint/50">·</span>
            <StatusPill status={fm.status} />
          </>
        )}
      </div>
      <h1 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tightest text-balance max-w-[20ch]">
        {fm.title}
      </h1>
      {fm.keywords && fm.keywords.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-2 text-xs font-mono">
          {fm.keywords.map(k => (
            <li key={k} className="px-2.5 py-1 bg-surface-warm text-ink-muted rounded-sm">
              {k}
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

function StatusPill({ status }: { status: string }) {
  const palette: Record<string, string> = {
    published: 'text-accent',
    'in-progress': 'text-ink-muted',
    unpublished: 'text-ink-faint',
  };
  return <span className={palette[status] ?? 'text-ink-muted'}>{status}</span>;
}

/* ------------------------------------------------------------------ */
function AreaSidebar({ fm, body }: { fm: AreaFrontmatter; body: string }) {
  const outline = useMemo(() => extractOutline(body), [body]);

  return (
    <div className="space-y-8 text-sm">
      {fm.papers && fm.papers.length > 0 && (
        <SidebarBlock label="Paper">
          {fm.papers.map(p => <PaperCard key={p.id} paper={p} />)}
        </SidebarBlock>
      )}

      {fm.repos && fm.repos.length > 0 && (
        <SidebarBlock label="Code">
          {fm.repos.map(r => <RepoCard key={r.name} repo={r} />)}
        </SidebarBlock>
      )}

      {outline.length > 0 && (
        <SidebarBlock label="On this page">
          <ul className="space-y-2">
            {outline.map(h => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  className="no-underline text-ink-muted hover:text-accent transition-colors"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </SidebarBlock>
      )}

      <Link
        to="/chat"
        className="block mt-6 no-underline px-4 py-3 hairline-top hairline-bottom font-mono text-xs uppercase tracking-ultra-wide hover:bg-surface-warm transition-colors"
      >
        Ask the agent about this ↓
      </Link>
    </div>
  );
}

function SidebarBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-ultra-wide text-ink-faint mb-3">
        {label}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PaperCard({ paper }: { paper: Paper }) {
  const href = paper.url || (paper.doi ? `https://doi.org/${paper.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}` : undefined);
  return (
    <div>
      <div className="font-display italic leading-snug text-ink text-balance">
        {paper.title || paper.id}
      </div>
      {paper.venue && (
        <div className="mt-1 text-xs text-ink-muted">{paper.venue}</div>
      )}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block font-mono text-[11px] uppercase tracking-ultra-wide no-underline text-ink-muted hover:text-accent"
        >
          DOI ↗
        </a>
      )}
    </div>
  );
}

function RepoCard({ repo }: { repo: Repo }) {
  return (
    <div>
      <a
        href={repo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-sm no-underline text-ink hover:text-accent"
      >
        {repo.name}
      </a>
      {repo.scope && (
        <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">{repo.scope}</p>
      )}
      {repo.not_in_repo && (
        <p className="mt-1.5 text-xs text-ink-faint italic leading-relaxed">Not in repo: {repo.not_in_repo}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Extract top-level H2 headings and add anchors to the rendered output.
// react-markdown's default heading renderer doesn't give us ids, so we
// match section titles and use a kebab-case id.
function extractOutline(body: string): { id: string; text: string }[] {
  const lines = body.split('\n');
  const out: { id: string; text: string }[] = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      const text = m[1].trim();
      out.push({ id: slugify(text), text });
    }
  }
  return out;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
