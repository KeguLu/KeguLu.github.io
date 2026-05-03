import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-32 text-center">
      <div className="font-mono text-xs uppercase tracking-ultra-wide text-ink-faint">404</div>
      <h1 className="mt-4 font-display text-4xl tracking-tight">Page not found</h1>
      <p className="mt-4 text-ink-muted">This page does not exist, or it hasn't been written yet.</p>
      <Link
        to="/"
        className="mt-8 inline-block no-underline bg-ink text-paper px-5 py-2.5 rounded-sm font-sans text-sm font-medium hover:bg-accent transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
