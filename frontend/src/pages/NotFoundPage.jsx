import { Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';

export default function NotFoundPage({ dict }) {
  usePageMeta('404 - Page Not Found');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center pt-20">
      <h1 className="text-6xl font-black text-[var(--c-primary)] mb-4">404</h1>
      <p className="text-xl text-[var(--c-text)]/70 mb-8">
        {dict.notFound || 'The page you are looking for does not exist.'}
      </p>
      <Link
        to="/"
        className="px-6 py-3 rounded-xl bg-[var(--c-primary)] text-white font-bold hover:opacity-90 transition-opacity no-underline"
      >
        {dict.xaiEducation?.backToHome || 'Back to Home'}
      </Link>
    </main>
  );
}
