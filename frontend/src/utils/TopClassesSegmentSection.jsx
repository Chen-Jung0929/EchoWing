/**
 * GitHub「Languages」風格：橫向比例條 + 雙欄圖例（色點、名稱、百分比）。
 */
const SEGMENT_COLORS = [
  '#3b82f6',
  '#a855f7',
  '#f97316',
  '#eab308',
  '#14b8a6',
  '#ec4899',
  '#22c55e',
  '#6366f1',
  '#0ea5e9',
  '#d946ef',
];

export default function TopClassesSegmentSection({
  items,
  getLocalizedText,
  lang,
  dict,
}) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return null;

  const sumP =
    list.reduce((s, item) => s + Math.max(item.probability ?? 0, 0), 0) || 1e-9;

  const rows = list.map((item, i) => {
    const label = getLocalizedText(item.class_name, lang);
    const p = Math.max(item.probability ?? 0, 0) / sumP;
    const pct = Math.round(p * 1000) / 10;
    return {
      key: `${label}-${i}`,
      label,
      pct,
      widthPct: p * 100,
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    };
  });

  return (
    <section className="bg-[var(--c-bg)]/72 rounded-2xl p-6">
      <h3 className="text-xl font-black text-[var(--c-text)] mb-4">
        {dict.topClasses}
      </h3>

      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--c-text)]/10"
        role="img"
        aria-label={dict.topClasses}
      >
        {rows.map((row) => (
          <div
            key={row.key}
            className="min-w-[2px] shrink-0 transition-[width] duration-300"
            style={{
              width: `${Math.max(row.widthPct, 0.35)}%`,
              backgroundColor: row.color,
            }}
            title={`${row.label} ${row.pct}%`}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={`legend-${row.key}`}
            className="flex min-w-0 items-center gap-2 text-sm"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate font-medium text-[var(--c-text)]">
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums text-[var(--c-text)]/55">
              {row.pct}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
