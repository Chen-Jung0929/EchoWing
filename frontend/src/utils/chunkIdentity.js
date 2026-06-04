/**
 * Stable React key / dedupe id for a prediction chunk.
 * @param {{ analysis_id?: string, model_name?: string, index?: number }} chunk
 * @param {number} [fallbackIndex]
 */
export function chunkIdentity(chunk, fallbackIndex = 0) {
  if (chunk?.analysis_id) return String(chunk.analysis_id);
  const model = chunk?.model_name ?? 'chunk';
  const index = chunk?.index ?? fallbackIndex;
  return `${model}-${index}`;
}

/**
 * Merge one streamed chunk into an array (replace same id, else append).
 * @template T
 * @param {T[]} chunks
 * @param {T} incoming
 * @returns {T[]}
 */
export function upsertChunk(chunks, incoming) {
  const key = chunkIdentity(incoming);
  const list = [...(chunks ?? [])];
  const idx = list.findIndex((c) => chunkIdentity(c) === key);
  if (idx >= 0) {
    list[idx] = incoming;
    return list;
  }
  list.push(incoming);
  return list;
}

/**
 * Apply streamed XAI heatmap to an existing chunk (SSE xai_update event).
 * @template T
 * @param {T[]} chunks
 * @param {{ analysis_id?: string, model_name?: string, index?: number, xai_heatmap?: number[] }} update
 * @returns {T[]}
 */
export function mergeChunkXai(chunks, update) {
  const key = chunkIdentity(update);
  return (chunks ?? []).map((c) => {
    if (chunkIdentity(c) !== key) return c;
    if (!c?.predictions) return c;
    return {
      ...c,
      predictions: {
        ...c.predictions,
        xai_heatmap: update.xai_heatmap ?? null,
      },
    };
  });
}
