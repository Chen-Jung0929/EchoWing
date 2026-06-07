import React, { useRef, useState, useMemo } from 'react';
import usePageMeta from '../hooks/usePageMeta';
import { MdCloudUpload, MdHelpOutline } from 'react-icons/md';
import { useAudioAnalysisContext } from '../context/AudioAnalysisContext';
import AudioRecorder from '../components/AudioRecorder/AudioRecorder';
import AudioPreview from '../components/AudioPreview/AudioPreview';
import { isSupportedMediaFile, MEDIA_FILE_ACCEPT } from '../utils/supportedMedia';
import { isInAppBrowser } from '../utils/inAppBrowser';
import { DEFAULT_MODEL_SELECTION, formatLandingModelOption, LANDING_MODEL_OPTIONS } from '../utils/modelLabel';

export default function LandingPage({ dict, openGuide }) {
  usePageMeta(dict.title, dict.subtitle, dict.pageMetaTitleSuffix);
  const {
    selectedFile, setSelectedFile,
    isRecordedFile, setIsRecordedFile,
    selectedFileMetadata, setSelectedFileMetadata,
    recorderError, setRecorderError,
    errorMessage, setErrorMessage,
    isProcessing, loadingHint,
    handleFileClear, handleProcess
  } = useAudioAnalysisContext();

  const fileRef = useRef(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_SELECTION);
  const recordingBlocked = useMemo(() => isInAppBrowser(), []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isSupportedMediaFile(file)) {
      setErrorMessage(dict.fileTypeUnsupported);
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setSelectedFileMetadata({ status: 'decoding', duration: null });
    setIsRecordedFile(false);
    setRecorderError('');
    setErrorMessage('');
  };

  const handleRecordingComplete = (file) => {
    if (fileRef.current) fileRef.current.value = '';
    setSelectedFile(file);
    setSelectedFileMetadata({ status: 'decoding', duration: null });
    setIsRecordedFile(true);
    setRecorderError('');
    setErrorMessage('');
  };

  const downloadSelectedFile = () => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="relative z-20 w-full min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">
      <div className="w-full max-w-lg flex flex-col items-center animate-fade-in-up">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-[var(--c-text)] mb-2 drop-shadow-sm">
            {dict.title}
          </h1>
          <h2 className="text-xl md:text-2xl font-bold text-[var(--c-primary)] tracking-widest">
            {dict.subtitle}
          </h2>
        </div>

        <div className="w-full bg-[var(--c-card)]/72 backdrop-blur-md p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.10)] border border-[var(--c-text)]/5 flex flex-col space-y-6">
          <div className="flex w-full min-w-0 flex-col gap-2">
            <div className="flex w-full min-w-0 items-stretch gap-3">
              <label
                className="flex min-h-[5.5rem] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--c-primary)] py-4 text-lg font-bold text-[var(--c-primary)] transition-all duration-300 hover:bg-[var(--c-primary)] hover:text-[var(--c-muted)]"
                title={dict.tooltipUpload}
              >
                <MdCloudUpload className="h-10 w-10 text-[var(--c-primary)]" />
                <span className="px-1 text-center leading-tight">{dict.uploadBtn}</span>
                <input
                  type="file"
                  accept={MEDIA_FILE_ACCEPT}
                  onChange={handleFileChange}
                  className="hidden"
                  ref={fileRef}
                />
              </label>

              <div className="w-[5.5rem] shrink-0 self-stretch">
                <AudioRecorder
                  dict={dict}
                  onRecordingComplete={handleRecordingComplete}
                  onErrorChange={setRecorderError}
                  recordingDisabled={recordingBlocked}
                />
              </div>
            </div>

            <p className="text-center text-xs text-[var(--c-text)]/55">{dict.uploadFormatsHint}</p>
            {recordingBlocked ? (
              <p className="text-center text-xs text-amber-600 dark:text-amber-400" role="status">
                {dict.inAppBrowserRecordingHint}
              </p>
            ) : (
              <p className="text-center text-xs text-[var(--c-text)]/45">{dict.recordMaxHint}</p>
            )}

            {recorderError ? (
              <p className="text-center text-sm font-bold text-red-500" role="alert">
                {recorderError}
              </p>
            ) : null}
          </div>

          {selectedFile ? (
            <AudioPreview
              key={`${selectedFile.name}-${selectedFile.lastModified}-${selectedFile.size}`}
              file={selectedFile}
              metadata={selectedFileMetadata}
              recorded={isRecordedFile}
              dict={dict}
              onClear={handleFileClear}
              onReplace={() => fileRef.current?.click()}
              onDownload={downloadSelectedFile}
            />
          ) : null}

          {errorMessage && (
            <div className="text-sm font-bold text-red-500 bg-red-500/10 rounded-xl px-4 py-3">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="model-select"
              className="text-sm font-bold text-[var(--c-text)]/70"
            >
              {dict.modelSelectionLabel}
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[var(--c-bg)]/70 text-[var(--c-text)] border-none rounded-xl px-4 py-3 font-bold cursor-pointer"
              aria-label={dict.tooltipModelSelection}
              title={dict.tooltipModelSelection}
            >
              {LANDING_MODEL_OPTIONS.map(({ value }) => (
                <option key={value} value={value}>
                  {formatLandingModelOption(value, dict)}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between gap-3 px-1 text-xs text-[var(--c-text)]/55">
              <span>{dict.modelHints[selectedModel]}</span>
              <button
                type="button"
                onClick={() => openGuide('models')}
                className="shrink-0 font-black text-[var(--c-primary)] underline decoration-dotted underline-offset-4"
              >
                {dict.modelHintLearnMore}
              </button>
            </div>
          </div>

          <button
            onClick={() => handleProcess(selectedModel)}
            disabled={!selectedFile || isProcessing}
            aria-label={dict.tooltipProcess}
            title={dict.tooltipProcess}
            className={`w-full py-4 rounded-xl font-black text-lg shadow-lg transition-all duration-300 ${
              selectedFile && !isProcessing
                ? 'bg-[var(--c-primary)] text-[var(--c-bg)] hover:shadow-xl hover:-translate-y-1 hover:brightness-110'
                : 'bg-[var(--c-text)]/20 text-[var(--c-text)]/40 cursor-not-allowed'
            }`}
          >
            {isProcessing ? dict.loadingText : dict.processBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
