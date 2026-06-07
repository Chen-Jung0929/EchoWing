import React from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export function MathBlock({ children, inline = false, label }) {
  if (inline) {
    return (
      <span className="math-inline" aria-label={label || children}>
        <InlineMath math={children} />
      </span>
    );
  }

  return (
    <figure className="math-block" aria-label={label || children}>
      <BlockMath math={children} />
      {label ? <figcaption className="mt-2 text-sm text-[var(--c-text)]/70 text-center">{label}</figcaption> : null}
    </figure>
  );
}
