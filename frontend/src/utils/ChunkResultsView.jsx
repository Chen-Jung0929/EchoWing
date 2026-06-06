import { useCallback, useMemo, useRef, useState } from 'react';
import { formatMessage } from '../i18n';
import DownloadMetadataModal from '../components/DownloadMetadataModal/DownloadMetadataModal';
import NearbyRecordsModal from '../components/NearbyRecordsModal/NearbyRecordsModal';
import ReportGenerator from '../components/ReportGenerator/ReportGenerator';
import TimelineSection from '../components/Timeline/TimelineSection';
import ChunkVisualizerSection from './ChunkVisualizerSection';
import {
  aggregateChunksByVote,
  displayChunksForModel,
  modelWindowSec,
  resolveConfidenceThreshold,
} from './aggregateByVote';
import { buildFullReportModel } from './buildFullReportModel';
import { buildSurveySheetPayload } from './buildSurveySheetPayload';
import { ResultTitleBar } from './ResultTitleActions';
import { buildResultShareContent } from './shareResult';
import { getModelDisplayLabel, resolveResultModelName } from './modelLabel';
import { isSurveyMetadataSaved } from './surveyMetadata';
import { isSurveySheetConfigured, submitSurveyRecord } from '../services/surveySheet';
import {
  buildTimelineSpeciesSummary,
  displayChunkForTime,
  timelineSelectionLabel,
} from './timeline/timelineNavigation';
import { buildTimelineDecisionSupport } from './timeline/buildTimelineDecisionSupport';

function formatAnalyzedAt(isoString, lang) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function ResultBadge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--c-text)]/15 bg-[var(--c-bg)]/90 px-3 py-1 text-xs font-bold text-[var(--c-text)]/80">
      {children}
    </span>
  );
}

/**
 * 以 Canvas 時間軸 + 事件表導覽結果（取代分段 tab 與投票聚合 UI）。
 */
export default function ChunkResultsView({
  result,
  dict,
  lang,
  getLocalizedText,
  renderChunkBody,
  resetToLanding,
  spectrogramByIndex = {},
}) {
  const allChunks = result.chunks ?? [];
  const modelName = resolveResultModelName(result);
  const modelLabel = getModelDisplayLabel(modelName, dict);
  const windowSec = modelWindowSec(modelName);
  const chunks = useMemo(
    () => displayChunksForModel(allChunks, modelName),
    [allChunks, modelName]
  );
  const timeline = result.timeline ?? null;
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [surveyMetadata, setSurveyMetadata] = useState(null);
  const [saveVersion, setSaveVersion] = useState(0);
  const [sheetUploadStatus, setSheetUploadStatus] = useState('idle');
  const [sheetUploadError, setSheetUploadError] = useState('');
  const [nearbyModalOpen, setNearbyModalOpen] = useState(false);
  const [modalConfirmLabel, setModalConfirmLabel] = useState(null);
  const reportRef = useRef(null);
  const surveyMetadataRef = useRef(null);
  const pendingDownloadRef = useRef(false);
  const downloadResolveRef = useRef(null);
  const downloadRejectRef = useRef(null);

  const okChunks = chunks.filter((c) => !c.error);
  const isOverview = !selectedEvent;
  const activeChunk = useMemo(() => {
    const decisionOpts = { windowSec, selectedEvent: selectedEvent ?? null };
    const decisionSupport = buildTimelineDecisionSupport(timeline, decisionOpts);

    if (selectedEvent) {
      const chunk = displayChunkForTime(chunks, selectedEvent.peakTime, windowSec);
      if (!chunk) return null;
      return {
        ...chunk,
        predictions: {
          top_species: [
            {
              species_id: selectedEvent.species_id,
              name: selectedEvent.name,
              scientific_name: selectedEvent.scientific_name ?? '',
              wiki_url_zh: selectedEvent.wiki_url_zh ?? null,
              wiki_url_en: selectedEvent.wiki_url_en ?? null,
              probability: selectedEvent.confidence ?? 0,
              peak_time: selectedEvent.peakTime,
            },
          ],
          top_classes: chunk.predictions?.top_classes ?? [],
          meets_confidence_threshold: true,
          reference_species: [],
        },
        decision_support: decisionSupport,
      };
    }
    const firstOk = okChunks[0];
    if (!firstOk) return null;
    const timelineSpecies = buildTimelineSpeciesSummary(timeline);
    return {
      ...firstOk,
      index: -1,
      predictions: {
        top_species: timelineSpecies,
        top_classes: [],
        meets_confidence_threshold: timelineSpecies.length > 0,
        reference_species: [],
      },
      decision_support: decisionSupport,
    };
  }, [selectedEvent, chunks, windowSec, okChunks, timeline]);

  const filename = result.original_filename?.trim() || '—';
  const chunkIndices = useMemo(() => chunks.map((c) => c.index), [chunks]);
  const totalDurationSec = result.stream_meta?.total_duration_sec ?? 0;
  const eventCount = timeline?.species_events?.length ?? 0;
  const markerDurationSec = timeline?.duration_sec ?? totalDurationSec;

  const summarySpectrogramChunk = useMemo(() => {
    const firstOk = okChunks[0];
    if (!firstOk) return null;
    return { ...firstOk, index: -1 };
  }, [okChunks]);

  const summaryForReport = useMemo(
    () =>
      aggregateChunksByVote(chunks, {
        confidenceThreshold: resolveConfidenceThreshold(result.confidence_threshold),
        windowSec,
      }),
    [chunks, result.confidence_threshold, windowSec]
  );

  const fullReportModel = useMemo(
    () =>
      buildFullReportModel({
        result,
        chunks,
        filename,
        spectrogramByIndex,
        surveyMetadata,
        confidenceThreshold: resolveConfidenceThreshold(result.confidence_threshold),
        modelName,
        windowSec,
        totalDurationSec,
        timeline,
      }),
    [
      result,
      chunks,
      filename,
      spectrogramByIndex,
      surveyMetadata,
      modelName,
      windowSec,
      totalDurationSec,
      timeline,
    ]
  );

  const selectionLabel = timelineSelectionLabel(
    selectedEvent,
    windowSec,
    dict,
    getLocalizedText,
    lang
  );

  const runPdfDownload = useCallback(async () => {
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    if (!reportRef.current?.downloadPdf) {
      throw new Error('PDF report is not ready');
    }
    await reportRef.current.downloadPdf();
  }, []);

  const getSharePayload = useCallback(
    () =>
      buildResultShareContent({
        selectedEvent,
        timeline,
        summary: summaryForReport,
        chunks,
        filename,
        lang,
        dict,
        windowSec,
        processedAt: formatAnalyzedAt(result.processed_at, lang),
        spectrogramCache: spectrogramByIndex,
        totalDurationSec,
        modelName,
        getLocalizedText,
      }),
    [
      selectedEvent,
      timeline,
      summaryForReport,
      chunks,
      filename,
      lang,
      dict,
      windowSec,
      result.processed_at,
      spectrogramByIndex,
      totalDurationSec,
      modelName,
      getLocalizedText,
    ]
  );

  const handleSaveRequest = useCallback(() => {
    pendingDownloadRef.current = false;
    setModalConfirmLabel(dict.saveModalConfirm);
    setSaveModalOpen(true);
  }, [dict.saveModalConfirm]);

  const handleSaveModalClose = useCallback(() => {
    setSaveModalOpen(false);
    if (pendingDownloadRef.current) {
      downloadRejectRef.current?.(new DOMException('Cancelled', 'AbortError'));
      downloadResolveRef.current = null;
      downloadRejectRef.current = null;
    }
    pendingDownloadRef.current = false;
  }, []);

  const uploadSurveyToSheet = useCallback(
    async (metadata) => {
      if (!isSurveySheetConfigured()) {
        setSheetUploadStatus('idle');
        setSheetUploadError('');
        return { skipped: true };
      }

      setSheetUploadStatus('uploading');
      setSheetUploadError('');

      try {
        const payload = buildSurveySheetPayload({
          result,
          surveyMetadata: metadata,
          dict,
          lang,
        });
        const outcome = await submitSurveyRecord(payload);
        if (outcome.skipped) {
          setSheetUploadStatus('idle');
          return outcome;
        }
        setSheetUploadStatus('success');
        return outcome;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setSheetUploadStatus('error');
        setSheetUploadError(message);
        throw err;
      }
    },
    [result, dict, lang]
  );

  surveyMetadataRef.current = surveyMetadata;

  const handleSaveConfirm = useCallback(
    async (metadata) => {
      setSaveModalOpen(false);
      setSurveyMetadata(metadata);
      surveyMetadataRef.current = metadata;
      setSaveVersion((v) => v + 1);
      const shouldDownload = pendingDownloadRef.current;
      pendingDownloadRef.current = false;
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      if (shouldDownload) {
        try {
          await runPdfDownload();
          downloadResolveRef.current?.();
        } catch (err) {
          downloadRejectRef.current?.(err);
          throw err;
        } finally {
          downloadResolveRef.current = null;
          downloadRejectRef.current = null;
        }
      }
      uploadSurveyToSheet(metadata).catch(() => {});
    },
    [runPdfDownload, uploadSurveyToSheet]
  );

  const handleDownloadResult = useCallback(() => {
    if (isSurveyMetadataSaved(surveyMetadata)) {
      return runPdfDownload();
    }
    return new Promise((resolve, reject) => {
      downloadResolveRef.current = resolve;
      downloadRejectRef.current = reject;
      pendingDownloadRef.current = true;
      setModalConfirmLabel(dict.downloadModalConfirm);
      setSaveModalOpen(true);
    });
  }, [surveyMetadata, runPdfDownload, dict.downloadModalConfirm]);

  const confidenceThreshold = resolveConfidenceThreshold(result.confidence_threshold);
  const thresholdPct = Math.round(confidenceThreshold * 100);
  const xaiPending = result.xai_pending === true;
  const actionsDisabled = xaiPending;

  const nearbyInitialCoordinates = useMemo(
    () => surveyMetadata?.overview?.coordinates ?? null,
    [surveyMetadata]
  );

  const showNearbyFab = isSurveySheetConfigured();

  const handleSelectEvent = useCallback((ev) => {
    setSelectedEvent((prev) => {
      if (!ev) return null;
      if (!prev) return ev;
      const sameSpecies = prev.species_id === ev.species_id;
      const prevInEv = ev.peakTimes?.includes(prev.peakTime);
      const evInPrev = prev.peakTimes?.includes(ev.peakTime);
      const samePeak = prev.peakTime === ev.peakTime;
      if (sameSpecies && (samePeak || prevInEv || evInPrev)) return null;
      return ev;
    });
  }, []);

  return (
    <div className="w-full max-w-4xl bg-[var(--c-card)]/82 backdrop-blur-md p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[var(--c-text)]/5">
      {fullReportModel ? (
        <ReportGenerator
          ref={reportRef}
          reportModel={fullReportModel}
          lang={lang}
        />
      ) : null}

      <DownloadMetadataModal
        open={saveModalOpen}
        dict={dict}
        chunkIndices={chunkIndices}
        initialMetadata={surveyMetadata}
        confirmLabel={modalConfirmLabel ?? dict.saveModalConfirm}
        onClose={handleSaveModalClose}
        onConfirm={handleSaveConfirm}
      />

      <NearbyRecordsModal
        open={nearbyModalOpen}
        dict={dict}
        lang={lang}
        initialCoordinates={nearbyInitialCoordinates}
        onClose={() => setNearbyModalOpen(false)}
      />

      <div className="sticky top-24 z-10 -mx-2 px-2 py-4 mb-2 overflow-visible bg-[var(--c-card)]/95 backdrop-blur-md border-b border-[var(--c-text)]/10">
        <header className="mb-2 mt-2">
          <ResultTitleBar
            dict={dict}
            onSave={handleSaveRequest}
            onDownload={handleDownloadResult}
            getSharePayload={getSharePayload}
            surveySaved={saveVersion}
            actionsDisabled={actionsDisabled}
            onNearbyRecords={() => setNearbyModalOpen(true)}
            nearbyEnabled={showNearbyFab}
          />

          {sheetUploadStatus === 'success' ? (
            <p className="mt-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400" role="status">
              {dict.sheetUploadSuccess}
            </p>
          ) : null}
          {sheetUploadStatus === 'error' && sheetUploadError ? (
            <p className="mt-2 text-center text-xs font-bold text-red-500" role="alert">
              {dict.sheetUploadError}: {sheetUploadError}
            </p>
          ) : null}

          <details className="mt-2 flex flex-col items-center max-w-full">
            <summary className="cursor-pointer text-xs text-[var(--c-text)]/45 hover:text-[var(--c-primary)] transition-colors list-none [&::-webkit-details-marker]:hidden">
              <span className="underline decoration-dotted underline-offset-2">
                {dict.sourceFile}
              </span>
            </summary>
            <p className="mt-1 text-xs text-[var(--c-text)]/50 break-all px-1 max-w-md mx-auto">
              {filename}
            </p>
          </details>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <ResultBadge>
              {dict.timelineEventCount} · {eventCount}
            </ResultBadge>
            <ResultBadge>
              {dict.validChunks} · {okChunks.length}
            </ResultBadge>
            <ResultBadge>
              {formatMessage(dict.confidenceThresholdBadge, { threshold: thresholdPct })}
            </ResultBadge>
            <ResultBadge>
              {dict.modelUsed} · {modelLabel}
            </ResultBadge>
          </div>
        </header>

        {result.warnings?.length > 0 && (
          <section className="mb-4 bg-amber-500/10 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200">
            <p className="font-black mb-1">{dict.warnings}</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {summarySpectrogramChunk ? (
        <ChunkVisualizerSection
          chunk={summarySpectrogramChunk}
          isSummary
          resultChunks={chunks}
          spectrogramCache={spectrogramByIndex}
          dict={dict}
          lang={lang}
          totalDurationSec={totalDurationSec > 0 ? totalDurationSec : 0}
          xaiPending={xaiPending}
          eventMarkers={timeline?.species_events ?? []}
          markerDurationSec={markerDurationSec}
          selectedEvent={selectedEvent}
          onSelectEvent={handleSelectEvent}
          getLocalizedText={getLocalizedText}
          shellMarginTop={0}
        />
      ) : null}

      <div className="mb-4">
        {timeline ? (
          <TimelineSection
            timeline={timeline}
            dict={dict}
            getLocalizedText={getLocalizedText}
            lang={lang}
            selectedEvent={selectedEvent}
            onSelectEvent={handleSelectEvent}
          />
        ) : (
          <p className="text-sm text-center text-[var(--c-text)]/50 py-4">
            {dict.timelineNoData}
          </p>
        )}

        <p className="mt-2 text-center text-[10px] text-[var(--c-text)]/40">
          {dict.timelineNavHint}
        </p>
      </div>

      <div className="mt-4 min-h-[12rem]">
        {activeChunk?.error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-red-500 font-bold">{dict.decodeFailed}</p>
            <p className="text-sm text-[var(--c-text)]/60 mt-2">{activeChunk.error}</p>
          </div>
        ) : activeChunk ? (
          renderChunkBody(activeChunk, {
            isOverview,
            confidenceThreshold,
            spectrogramByIndex,
            resultChunks: chunks,
            totalDurationSec,
            xaiPending,
            speciesVariant: timeline ? 'timeline' : 'default',
            selectionLabel,
            hideSpectrogram: true,
          })
        ) : (
          <p className="text-center text-red-500 py-8">{dict.errorTitle}</p>
        )}
      </div>

      {okChunks.length === 0 && (
        <p className="text-center text-red-500 text-sm mt-4">{dict.errorTitle}</p>
      )}

      <details className="mt-6 bg-[var(--c-bg)]/50 rounded-xl p-4">
        <summary className="cursor-pointer font-bold text-[var(--c-text)]/70 text-sm">
          {dict.rawResponse}
        </summary>
        <pre className="mt-3 text-xs overflow-auto max-h-64 text-[var(--c-text)]/80">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>

      <div className="text-center mt-8">
        <button
          type="button"
          onClick={resetToLanding}
          className="text-[var(--c-primary)] font-bold underline"
        >
          {dict.backBtn}
        </button>
      </div>
    </div>
  );
}
