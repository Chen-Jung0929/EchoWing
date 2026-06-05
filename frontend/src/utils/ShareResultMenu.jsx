import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaFacebook } from 'react-icons/fa';
import { FaThreads, FaXTwitter } from 'react-icons/fa6';
import { MdContentCopy, MdShare, MdCheck, MdImage } from 'react-icons/md';
import { downloadShareImage } from './shareResultImage';
import {
  copyShareText,
  isMobileShareDevice,
  publishNativeShare,
  publishPlatformShare,
} from './shareResult';

const MENU_BTN =
  'flex w-full items-center gap-3 rounded-xl border border-[var(--c-text)]/10 bg-[var(--c-card)] px-3 py-2.5 text-sm font-bold text-[var(--c-text)] shadow-md transition-colors hover:bg-[var(--c-bg)]/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--c-primary)]';

const PRIMARY_BTN =
  'flex w-full items-center gap-3 rounded-xl border border-[var(--c-primary)]/35 bg-[var(--c-primary)]/12 px-3 py-2.5 text-sm font-black text-[var(--c-text)] shadow-md transition-colors hover:bg-[var(--c-primary)]/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--c-primary)]';

const TEMPLATE_BTN =
  'rounded-full border px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--c-primary)]';

const DONE_MS = 2500;

/**
 * @param {import('../i18n').LocaleMessages} dict
 * @param {Awaited<ReturnType<typeof import('./shareResult').publishNativeShare>> | Awaited<ReturnType<typeof import('./shareResult').publishPlatformShare>>} result
 */
function publishStatusMessage(dict, result) {
  if (!result?.ok) return '';
  if (result.mode === 'native') return dict.shareNativeDone;
  if (result.imageCopied) return dict.shareFallbackClipboard;
  if (result.imageDownloaded) return dict.shareFallbackDownload;
  return dict.shareFallbackTextOnly;
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => ReturnType<typeof import('./shareResult').buildResultShareContent> | null} props.getSharePayload
 * @param {import('../i18n').LocaleMessages} props.dict
 */
export default function ShareResultMenu({ open, onClose, getSharePayload, dict }) {
  const [copied, setCopied] = useState(false);
  const [publishStatus, setPublishStatus] = useState('');
  const [templateKey, setTemplateKey] = useState('social');
  const [shareText, setShareText] = useState('');
  const statusTimerRef = useRef(null);
  const copyTimerRef = useRef(null);

  const payload = open ? getSharePayload?.() : null;
  const isMobile = isMobileShareDevice();
  const canNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  useEffect(() => {
    if (!open || !payload) return;
    setTemplateKey('social');
    setShareText(payload.templates.social);
    setCopied(false);
    setPublishStatus('');
  }, [open, payload?.templates.social]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setPublishStatus('');
      return undefined;
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (!open || typeof document === 'undefined' || !payload) return null;

  const sharePayload = { ...payload, text: shareText };

  const handleTemplateChange = (key) => {
    setTemplateKey(key);
    setShareText(payload.templates[key] ?? payload.templates.social);
  };

  const showPublishStatus = (result) => {
    const message = publishStatusMessage(dict, result);
    if (!message) return;
    setPublishStatus(message);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setPublishStatus('');
      statusTimerRef.current = null;
    }, DONE_MS * 2);
  };

  const handleNativeShare = async () => {
    try {
      const result = await publishNativeShare(sharePayload);
      if (result.mode === 'cancelled') return;
      if (result.mode === 'unsupported') {
        setPublishStatus(dict.shareNativeUnsupported);
        return;
      }
      showPublishStatus(result);
      if (result.mode === 'native') onClose();
    } catch (err) {
      console.error('[Share native]', err);
    }
  };

  const handlePlatformShare = async (platform) => {
    try {
      const result = await publishPlatformShare(sharePayload, platform);
      showPublishStatus(result);
    } catch (err) {
      console.error('[Share platform]', err);
    }
  };

  const handleCopy = async () => {
    try {
      await copyShareText(shareText);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, DONE_MS);
    } catch (err) {
      console.error('[Share copy]', err);
    }
  };

  const handleDownloadImage = () => {
    if (!payload.imageDataUrl) return;
    downloadShareImage(payload.imageDataUrl);
  };

  const templateOptions = [
    { key: 'social', label: dict.shareTemplateSocialLabel },
    { key: 'detailed', label: dict.shareTemplateDetailed },
  ];

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[210] cursor-default bg-black/20"
        aria-label={dict.shareModalClose}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dict.shareResult}
        className="fixed right-6 z-[220] flex w-[min(92vw,22rem)] max-h-[calc(100vh-19rem)] flex-col overflow-hidden rounded-2xl border border-[var(--c-text)]/10 bg-[var(--c-card)]/95 shadow-xl backdrop-blur-md top-[calc((100vh-17rem)/2)] -translate-y-1/2"
      >
        <div className="border-b border-[var(--c-text)]/10 px-3 py-2">
          <p className="text-xs font-black text-[var(--c-text)]/60">{dict.shareResult}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {templateOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleTemplateChange(option.key)}
                className={`${TEMPLATE_BTN} ${
                  templateKey === option.key
                    ? 'border-[var(--c-primary)] bg-[var(--c-primary)]/15 text-[var(--c-text)]'
                    : 'border-[var(--c-text)]/15 text-[var(--c-text)]/65 hover:bg-[var(--c-bg)]/60'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto p-3">
          <label className="mb-1 block text-[10px] font-bold text-[var(--c-text)]/50">
            {dict.shareTextLabel}
          </label>
          <textarea
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-xl border border-[var(--c-text)]/15 bg-[var(--c-bg)]/80 px-3 py-2 text-xs leading-relaxed text-[var(--c-text)] focus:border-[var(--c-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--c-primary)]"
          />

          <div className="mt-3 rounded-xl border border-[var(--c-text)]/10 bg-[var(--c-bg)]/50 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-[var(--c-text)]/50">
                {dict.shareImageLabel}
              </span>
              <button
                type="button"
                className={`${MENU_BTN} !w-auto !px-2.5 !py-1.5 !text-xs`}
                onClick={handleDownloadImage}
              >
                <MdImage size={16} aria-hidden />
                {dict.shareDownloadImage}
              </button>
            </div>
            {payload.imageDataUrl ? (
              <img
                src={payload.imageDataUrl}
                alt={dict.shareImagePreview}
                className="mx-auto block max-h-36 w-auto rounded-lg border border-[var(--c-text)]/10 shadow-sm"
              />
            ) : null}
          </div>

          {publishStatus ? (
            <p className="mt-3 rounded-xl border border-[var(--c-primary)]/20 bg-[var(--c-primary)]/10 px-3 py-2 text-[10px] leading-relaxed text-[var(--c-text)]/75">
              {publishStatus}
            </p>
          ) : null}

          <p className="mt-3 text-[10px] leading-relaxed text-[var(--c-text)]/50">
            {isMobile ? dict.shareNativeHint : dict.shareDesktopHint}
          </p>

          <div className="mt-3 flex flex-col gap-1.5">
            {isMobile && canNativeShare ? (
              <button type="button" className={PRIMARY_BTN} onClick={handleNativeShare}>
                <MdShare size={18} aria-hidden />
                {dict.shareNative}
              </button>
            ) : null}
            {!isMobile ? (
              <>
                <button type="button" className={MENU_BTN} onClick={() => handlePlatformShare('threads')}>
                  <FaThreads size={18} aria-hidden />
                  Threads
                </button>
                <button type="button" className={MENU_BTN} onClick={() => handlePlatformShare('twitter')}>
                  <FaXTwitter size={18} aria-hidden />
                  X
                </button>
                <button type="button" className={MENU_BTN} onClick={() => handlePlatformShare('facebook')}>
                  <FaFacebook size={18} aria-hidden />
                  Facebook
                </button>
                <button type="button" className={MENU_BTN} onClick={handleCopy}>
                  {copied ? <MdCheck size={18} aria-hidden /> : <MdContentCopy size={18} aria-hidden />}
                  {copied ? dict.shareCopied : dict.shareCopyLink}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
