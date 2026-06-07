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
    <figure className="math-block overflow-hidden" aria-label={label || children}>
      <div className="overflow-x-auto pb-2 -mb-2">
        <BlockMath math={children} />
      </div>
      {label ? <figcaption className="mt-4 text-sm text-[var(--c-text)]/70 text-center">{label}</figcaption> : null}
    </figure>
  );
}
