export function isBackendPredictResponse(data) {
  return (
    Array.isArray(data?.chunks) &&
    data.chunks.length > 0 &&
    (data.chunks[0]?.predictions != null || data.chunks[0]?.error != null)
  );
}
