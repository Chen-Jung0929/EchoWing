import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { MathText } from './MathText.jsx';

function renderMath(formula, displayMode) {
  if (typeof formula !== 'string' || !formula.trim()) {
    return { html: null, error: new Error('Missing formula') };
  }

  try {
    return {
      html: katex.renderToString(formula, {
        displayMode,
        throwOnError: true,
        strict: 'ignore',
        trust: false,
      }),
      error: null,
    };
  } catch (error) {
    return { html: null, error };
  }
}

export function MathBlock({ math, inline = false, label }) {
  const { html, error } = useMemo(
    () => renderMath(math, !inline),
    [math, inline],
  );

  if (error) {
    console.warn('KaTeX render failed:', error.message, math);
    return (
      <figure className="math-block" aria-label={label || math}>
        <pre className="text-sm text-red-500/90 overflow-x-auto whitespace-pre-wrap font-mono">{math}</pre>
        {label ? (
          <figcaption className="mt-4 text-sm text-[var(--c-text)]/70 text-center">{label}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (inline) {
    return (
      <span
        className="math-inline"
        aria-label={label || math}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <figure className="math-block" aria-label={label || math}>
      <div className="overflow-x-auto pb-2 -mb-2">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {label ? (
        <figcaption className="mt-4 text-sm text-[var(--c-text)]/70 text-center">
          <MathText text={label} />
        </figcaption>
      ) : null}
    </figure>
  );
}
