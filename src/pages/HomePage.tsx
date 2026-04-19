import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '@/lib/site';

type AreaManifestEntry = {
  id: string;
  title: string;
  status: string;
  period: string;
  file: string;
};

export default function HomePage() {
  const [areas, setAreas] = useState<AreaManifestEntry[] | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}kb/manifest.json`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((m: { areas: AreaManifestEntry[] }) => setAreas(m.areas))
      .catch(() => setAreas([])); // graceful degrade when no KB built yet
  }, []);

  return (
    <>
      <Hero />
      <About />
      <ResearchAreas areas={areas} />
      <Contact />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 lg:px-10 pt-16 sm:pt-24 pb-20 sm:pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-8 animate-fade-up">
          <p className="font-mono text-xs uppercase tracking-ultra-wide text-ink-faint mb-6">
            {SITE.role} · {SITE.institution}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[4.75rem] leading-[1.02] tracking-tightest text-balance">
            Computational <em className="italic text-accent">materials</em> science for multiphase steels.
          </h1>
          <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-muted text-pretty">
            I build crystal-plasticity simulations that connect microstructure — grain
            orientation, carbide distribution, phase geometry — to the macroscale
            mechanical behavior engineers actually care about in sheet-metal forming.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 no-underline bg-ink text-paper px-5 py-2.5 rounded-sm font-sans font-medium hover:bg-accent transition-colors"
            >
              Chat with the research agent <span aria-hidden>→</span>
            </Link>
            {SITE.cvUrl && (
              <a
                href={SITE.cvUrl}
                className="font-mono text-xs uppercase tracking-ultra-wide text-ink-muted no-underline hover:text-accent"
                download
              >
                Download CV ↓
              </a>
            )}
            <a
              href={`mailto:${SITE.email}`}
              className="font-mono text-xs uppercase tracking-ultra-wide text-ink-muted no-underline hover:text-accent"
            >
              {SITE.email}
            </a>
          </div>
        </div>

        <aside className="lg:col-span-4 lg:pt-4">
          <PortraitOrMonogram />
        </aside>
      </div>
    </section>
  );
}

function PortraitOrMonogram() {
  if (SITE.photoUrl) {
    return (
      <div className="relative">
        <img
          src={SITE.photoUrl}
          alt={SITE.name}
          className="w-full max-w-xs aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-700 rounded-sm"
        />
        <div className="absolute -bottom-4 -right-4 font-mono text-xs uppercase tracking-ultra-wide text-ink-faint">
          {SITE.location}
        </div>
      </div>
    );
  }
  // Fallback: typographic monogram. Looks intentional, not like a missing image.
  return (
    <div className="relative max-w-xs aspect-[4/5] flex items-center justify-center bg-surface-warm rounded-sm overflow-hidden">
      <span className="font-display italic text-[12rem] leading-none text-ink/10 select-none">
        K
      </span>
      <span className="font-display italic text-[12rem] leading-none text-ink/10 select-none -ml-12">
        L
      </span>
      <span className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-ultra-wide text-ink-faint">
        {SITE.location}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */
function About() {
  return (
    <section id="about" className="hairline-top">
      <div className="mx-auto max-w-6xl px-6 lg:px-10 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <h2 className="lg:col-span-3 font-mono text-xs uppercase tracking-ultra-wide text-ink-muted">
            About
          </h2>
          <div className="lg:col-span-9 max-w-prose-wide">
            <p className="font-display text-2xl sm:text-3xl leading-snug text-balance">
              {SITE.bio}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Research Areas                                                      */
/* ------------------------------------------------------------------ */
function ResearchAreas({ areas }: { areas: AreaManifestEntry[] | null }) {
  return (
    <section id="research" className="hairline-top">
      <div className="mx-auto max-w-6xl px-6 lg:px-10 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-10">
          <h2 className="lg:col-span-3 font-mono text-xs uppercase tracking-ultra-wide text-ink-muted">
            Research
          </h2>
          <p className="lg:col-span-9 max-w-prose text-ink-muted">
            Four connected threads from my PhD. Each one has its own page with
            problem framing, methods (with equations), results, and the public
            code that implements it.
          </p>
        </div>

        <ol className="space-y-0">
          {areas === null && (
            <li className="py-10 text-ink-faint font-mono text-sm">Loading…</li>
          )}

          {areas?.map((a, i) => (
            <AreaRow key={a.id} area={a} index={i + 1} />
          ))}

          {/* Placeholders for the other three upcoming areas */}
          {Array.from({ length: Math.max(0, 4 - (areas?.length ?? 0)) }).map((_, i) => (
            <PlaceholderRow key={`ph-${i}`} index={(areas?.length ?? 0) + i + 1} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function AreaRow({ area, index }: { area: AreaManifestEntry; index: number }) {
  return (
    <li className="group hairline-top">
      <Link
        to={`/area/${area.id}`}
        className="no-underline block py-8 grid grid-cols-12 gap-4 items-baseline transition-colors hover:bg-surface-warm/40 -mx-4 px-4"
      >
        <span className="col-span-2 lg:col-span-1 font-mono text-xs text-ink-faint">
          {String(index).padStart(2, '0')}
        </span>
        <div className="col-span-10 lg:col-span-9">
          <h3 className="font-display text-2xl sm:text-3xl leading-snug tracking-tight text-balance group-hover:text-accent transition-colors">
            {area.title}
          </h3>
          <p className="mt-2 font-mono text-xs uppercase tracking-ultra-wide text-ink-faint">
            {area.period} · {area.status}
          </p>
        </div>
        <span className="hidden lg:flex col-span-2 justify-end font-mono text-xs uppercase tracking-ultra-wide text-ink-muted group-hover:text-accent transition-colors">
          Read →
        </span>
      </Link>
    </li>
  );
}

function PlaceholderRow({ index }: { index: number }) {
  return (
    <li className="hairline-top">
      <div className="py-8 grid grid-cols-12 gap-4 items-baseline opacity-40">
        <span className="col-span-2 lg:col-span-1 font-mono text-xs text-ink-faint">
          {String(index).padStart(2, '0')}
        </span>
        <div className="col-span-10 lg:col-span-9">
          <h3 className="font-display text-2xl sm:text-3xl leading-snug tracking-tight text-ink-faint italic">
            Coming soon
          </h3>
          <p className="mt-2 font-mono text-xs uppercase tracking-ultra-wide text-ink-faint">
            In preparation
          </p>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */
function Contact() {
  const links: { label: string; href: string }[] = [
    { label: 'Email', href: `mailto:${SITE.email}` },
    { label: 'ORCID', href: SITE.orcid },
    { label: 'LinkedIn', href: SITE.linkedin },
    { label: 'GitHub', href: SITE.github },
  ];
  if (SITE.scholar) links.splice(3, 0, { label: 'Google Scholar', href: SITE.scholar });

  return (
    <section id="contact" className="hairline-top">
      <div className="mx-auto max-w-6xl px-6 lg:px-10 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <h2 className="lg:col-span-3 font-mono text-xs uppercase tracking-ultra-wide text-ink-muted">
            Elsewhere
          </h2>
          <ul className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-10">
            {links.map(l => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className="no-underline flex items-baseline justify-between gap-4 py-3 hairline-bottom group"
                >
                  <span className="font-display text-xl group-hover:text-accent transition-colors">
                    {l.label}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-ultra-wide text-ink-faint group-hover:text-accent transition-colors">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
