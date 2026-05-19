import { useMemo, useState } from 'react';
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';

export const ATTENTION_BINS_PER_CHUNK = 10;

/**
 * 注意力權重柱狀圖：等寬 grid 讓 10×片段數 根柱子完整落在容器內（不橫向捲動）。
 */
export default function AttentionWeightsSection({
  weights,
  dict,
  isSummary = false,
  binsPerChunk = ATTENTION_BINS_PER_CHUNK,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const items = useMemo(() => {
    const list = Array.isArray(weights) ? weights : [];
    if (list.length === 0) return [];
    const max = Math.max(...list, 1e-6);
    const segmentCount = Math.max(1, Math.ceil(list.length / binsPerChunk));
    return list.map((weight, index) => ({
      weight,
      index,
      heightPct: Math.max((weight / max) * 100, 3),
      binInChunk: (index % binsPerChunk) + 1,
      chunkIndex: Math.floor(index / binsPerChunk) + 1,
      isChunkStart: index > 0 && index % binsPerChunk === 0,
      segmentCount,
    }));
  }, [weights, binsPerChunk]);

  if (items.length === 0) return null;

  const showBarLabels = items.length <= 30;
  const showChunkMarkers = isSummary && items[0].segmentCount > 1;

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
    gap: '2px',
    alignItems: 'end',
    height: collapsed ? 0 : '7.5rem',
    overflow: 'hidden',
    transition: 'height 0.25s ease',
  };

  return (
    <section className="mt-6 bg-[var(--c-bg)]/72 rounded-2xl p-6">
      <div className="mb-4 grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-black leading-tight text-[var(--c-text)]">
            {dict.attentionWeights}
          </h3>
          <p
            className={`mt-1 min-h-[1.125rem] text-xs leading-snug text-[var(--c-text)]/45 ${
              collapsed ? 'invisible' : ''
            }`}
            aria-hidden={collapsed}
          >
            {items.length} {dict.attentionBinsLabel}
            {showChunkMarkers && (
              <span>
                {' '}
                · {items[0].segmentCount} {dict.chunksCount}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? dict.expandAttention : dict.collapseAttention}
          className="shrink-0 self-start p-1.5 rounded-lg border border-transparent text-[var(--c-text)] hover:border-[var(--c-text)]/10 hover:bg-[var(--c-card)]/80 transition-colors"
        >
          {collapsed ? (
            <MdKeyboardArrowDown className="w-5 h-5" aria-hidden />
          ) : (
            <MdKeyboardArrowUp className="w-5 h-5" aria-hidden />
          )}
        </button>
      </div>

      <div
        className={`w-full transition-opacity duration-200 ${
          collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-hidden={collapsed}
      >
        <div style={gridStyle} role="img" aria-label={dict.attentionWeights}>
          {items.map((item) => (
            <div
              key={item.index}
              className={`flex min-w-0 flex-col items-center justify-end gap-0.5 h-full ${
                item.isChunkStart && showChunkMarkers
                  ? 'border-l-2 border-[var(--c-primary)]/35 pl-0.5'
                  : ''
              }`}
              title={
                showChunkMarkers
                  ? `${dict.chunkLabel} ${item.chunkIndex} · ${item.binInChunk}/10`
                  : `${item.binInChunk}/10`
              }
            >
              <div
                className="w-full min-h-[3px] rounded-t-sm bg-[var(--c-primary)] opacity-85"
                style={{ height: `${item.heightPct}%` }}
              />
              {showBarLabels && (
                <span className="text-[9px] leading-none text-[var(--c-text)]/40 tabular-nums">
                  {item.index + 1}
                </span>
              )}
            </div>
          ))}
        </div>

        {showChunkMarkers && !showBarLabels && (
          <div
            className="mt-2 w-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${items[0].segmentCount}, minmax(0, 1fr))`,
              gap: '2px',
            }}
          >
            {Array.from({ length: items[0].segmentCount }, (_, i) => (
              <span
                key={i}
                className="text-center text-[10px] font-bold text-[var(--c-text)]/45"
              >
                {dict.chunkLabel} {i + 1}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
