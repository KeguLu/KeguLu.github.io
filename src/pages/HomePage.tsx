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
        <div className="lg:col-span-7 animate-fade-up">
          <p className="font-mono text-xs font-medium uppercase tracking-ultra-wide text-ink-muted mb-6">
            {SITE.role} · {SITE.institution} · Industrial partner: {SITE.industryPartner}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[4.75rem] leading-[1.02] tracking-tightest text-balance">
            {SITE.home.heroTitleStart}{' '}
            {SITE.home.heroTitleAccent}{' '}
            {SITE.home.heroTitleEnd}
          </h1>
          <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-muted text-pretty">
            {SITE.home.heroIntro}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 no-underline bg-accent text-paper px-6 py-3 rounded-sm font-sans text-base font-semibold shadow-sm hover:bg-ink transition-colors"
            >
              {SITE.home.primaryAction} <span aria-hidden>→</span>
            </Link>
            {SITE.cvUrl && (
              <a
                href={SITE.cvUrl}
                className="font-mono text-xs uppercase tracking-ultra-wide text-ink-muted no-underline hover:text-accent"
                download
              >
                {SITE.home.cvAction} ↓
              </a>
            )}
          </div>
        </div>

        <aside className="lg:col-span-5 lg:pt-4">
          <HeroImagePreview />
        </aside>
      </div>
    </section>
  );
}

function HeroImagePreview() {
  if (!SITE.roadmapImageUrl) return <PortraitOrMonogram />;

  return (
    <figure className="w-full max-w-2xl lg:max-w-none">
      <a
        href={SITE.roadmapImageUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open the full hero image"
        className="group block no-underline"
      >
        <img
          src={SITE.roadmapImageUrl}
          alt="Research profile image."
          className="w-full aspect-[4/3] object-cover bg-surface rounded-sm border border-rule shadow-sm transition-transform duration-500 group-hover:scale-[1.01]"
        />
      </a>
    </figure>
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
            {SITE.home.aboutLabel}
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
  const rows = areas ? arrangeAreasByNumber(areas, 4) : [];

  return (
    <section id="research" className="hairline-top">
      <div className="mx-auto max-w-6xl px-6 lg:px-10 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-10">
          <h2 className="lg:col-span-3 font-mono text-xs uppercase tracking-ultra-wide text-ink-muted">
            {SITE.home.researchLabel}
          </h2>
          <p className="lg:col-span-9 max-w-prose text-ink-muted">
            {SITE.home.researchIntro}
          </p>
        </div>

        <ol className="space-y-0">
          {areas === null && (
            <li className="py-10 text-ink-faint font-mono text-sm">{SITE.home.loadingLabel}</li>
          )}

          {areas && rows.map((area, i) => (
            area
              ? <AreaRow key={area.id} area={area} index={i + 1} />
              : <PlaceholderRow key={`ph-${i}`} index={i + 1} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function arrangeAreasByNumber(areas: AreaManifestEntry[], minRows: number): (AreaManifestEntry | null)[] {
  const rows: (AreaManifestEntry | null)[] = Array.from({ length: minRows }, () => null);
  const overflow: AreaManifestEntry[] = [];

  for (const area of areas) {
    const slot = leadingNumber(area.id) ?? leadingNumber(area.file);
    if (slot && slot >= 1 && slot <= rows.length && rows[slot - 1] === null) {
      rows[slot - 1] = area;
    } else {
      overflow.push(area);
    }
  }

  return rows.concat(overflow);
}

function leadingNumber(value: string): number | null {
  const match = value.match(/^(\d+)/);
  return match ? Number(match[1]) : null;
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
          {SITE.home.areaReadAction} →
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
            {SITE.home.placeholderTitle}
          </h3>
          <p className="mt-2 font-mono text-xs uppercase tracking-ultra-wide text-ink-faint">
            {SITE.home.placeholderSubtitle}
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
            {SITE.home.contactLabel}
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
