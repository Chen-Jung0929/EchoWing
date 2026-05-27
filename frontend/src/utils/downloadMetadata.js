export function toDatetimeLocalValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function createEmptyDownloadMetadata() {
  return {
    environmentDescription: '',
    fieldConfirmation: '',
    observerName: 'Anonymous User',
    observerNotes: '',
    observedAt: toDatetimeLocalValue(),
    location: '',
    coordinates: null,
  };
}

export function formatObservedAtForDisplay(observedAt, lang) {
  if (!observedAt) return '—';
  try {
    const d = new Date(observedAt);
    if (Number.isNaN(d.getTime())) return observedAt;
    return d.toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return observedAt;
  }
}

export function hasSurveyMetadataContent(metadata) {
  if (!metadata) return false;
  return Boolean(
    metadata.environmentDescription?.trim() ||
      metadata.fieldConfirmation?.trim() ||
      metadata.observerName?.trim() ||
      metadata.observerNotes?.trim() ||
      metadata.location?.trim() ||
      metadata.coordinates
  );
}

export function downloadRecordingWithMetadata(file, metadata) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);

  const base = file.name.replace(/\.[^/.]+$/, '') || 'recording';
  const payload = {
    ...metadata,
    sourceFilename: file.name,
    exportedAt: new Date().toISOString(),
  };
  const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  const jsonLink = document.createElement('a');
  jsonLink.href = jsonUrl;
  jsonLink.download = `${base}_metadata.json`;
  jsonLink.rel = 'noopener';
  document.body.appendChild(jsonLink);
  jsonLink.click();
  jsonLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(jsonUrl), 2_000);
}
