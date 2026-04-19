import { Outlet, NavLink, Link } from 'react-router-dom';
import { SITE } from '@/lib/site';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="hairline-bottom sticky top-0 z-40 bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-10">
        <Link to="/" className="no-underline group" aria-label="Home">
          <span className="font-display text-xl tracking-tight text-ink group-hover:text-accent transition-colors">
            {SITE.name}
          </span>
          <span className="ml-3 text-[11px] font-mono uppercase tracking-ultra-wide text-ink-faint hidden sm:inline">
            {SITE.institutionShort}
          </span>
        </Link>

        <nav className="flex items-center gap-8 text-sm font-sans">
          <NavItem to="/" exact>Work</NavItem>
          <NavItem to="/chat">Chat</NavItem>
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-muted hover:text-accent no-underline font-mono text-xs uppercase tracking-ultra-wide"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

function NavItem({ to, children, exact }: { to: string; children: React.ReactNode; exact?: boolean }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        [
          'no-underline font-sans text-sm transition-colors',
          isActive ? 'text-ink font-medium' : 'text-ink-muted hover:text-ink',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  );
}

function Footer() {
  return (
    <footer className="hairline-top mt-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-10 py-10 flex flex-col sm:flex-row justify-between gap-4 text-xs font-mono uppercase tracking-ultra-wide text-ink-faint">
        <span>© {new Date().getFullYear()} {SITE.name}</span>
        <span>Built with an AI agent — ask it anything on the <Link to="/chat" className="text-ink-muted hover:text-accent">Chat</Link> page</span>
      </div>
    </footer>
  );
}
