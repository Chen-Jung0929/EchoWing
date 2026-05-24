import { MdOpenInNew } from 'react-icons/md';
import { resolveSpeciesWikiUrl } from './speciesWiki';

export default function SpeciesWikiLink({ species, lang, dict }) {
  const url = resolveSpeciesWikiUrl(species, lang);

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--c-primary)] underline-offset-2 hover:underline"
      >
        {dict.wikiLink}
        <MdOpenInNew className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </a>
    );
  }

  return (
    <p className="mt-1 text-xs text-[var(--c-text)]/40" title={dict.wikiUnavailable}>
      {dict.wikiUnavailable}
    </p>
  );
}
