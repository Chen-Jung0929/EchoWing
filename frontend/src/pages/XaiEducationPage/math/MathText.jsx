import { Fragment, useMemo } from 'react';
import katex from 'katex';

const INLINE_MATH_RE = /\$([^$]+)\$/g;

const LEGACY_MATH_TOKENS = [
  String.raw`\hat{z}_t^{(c)}`,
  'p_i^{(c)}',
  'x_{w_i}',
  'S(f,t)',
  'x(t)',
];

function wrapLegacyInlineMath(text) {
  let wrapped = text;
  for (const token of LEGACY_MATH_TOKENS) {
    if (!wrapped.includes(token)) continue;
    wrapped = wrapped.split(token).join(`$${token}$`);
  }

  return wrapped
    .split(/(\$[^$]+\$)/)
    .map((segment) => {
      if (segment.startsWith('$') && segment.endsWith('$')) return segment;
      return segment
        .replace(/(^|[\s(（])([fict])(?=$|[\s，。；、：:,\-)]|的|個|時)/g, '$1$$$2$$')
        .replace(/(^|[\s(（])i(?=-)/g, '$1$$i$$');
    })
    .join('');
}

function splitInlineMath(text) {
  const source = text.includes('$') ? text : wrapLegacyInlineMath(text);
  const parts = [];
  let lastIndex = 0;

  for (const match of source.matchAll(INLINE_MATH_RE)) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: source.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'math', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    parts.push({ type: 'text', value: source.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', value: source }];
}

function renderInlineMath(formula) {
  return katex.renderToString(formula, {
    displayMode: false,
    throwOnError: true,
    strict: 'ignore',
    trust: false,
  });
}

export function MathText({ text, className }) {
  const parts = useMemo(() => splitInlineMath(text), [text]);

  if (!text) return null;

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <Fragment key={index}>{part.value}</Fragment>;
        }

        try {
          const html = renderInlineMath(part.value);
          return (
            <span
              key={index}
              className="math-inline"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (error) {
          console.warn('KaTeX inline render failed:', error.message, part.value);
          return <Fragment key={index}>{part.value}</Fragment>;
        }
      })}
    </span>
  );
}
