import { MdPrint, MdSave } from 'react-icons/md';

/** 儲存／列印功能暫停，按鈕保留 UI */
const ACTIONS_ENABLED = false;

function ResultIconButton({ ariaLabel, children }) {
  return (
    <button
      type="button"
      disabled={!ACTIONS_ENABLED}
      aria-label={ariaLabel}
      aria-disabled={!ACTIONS_ENABLED}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--c-text)]/10 bg-[var(--c-card)]/90 text-[var(--c-text)] shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)] enabled:hover:border-transparent enabled:hover:bg-[var(--c-primary)] enabled:hover:text-[var(--c-bg)] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/** 預測結果標題列：左側標題、右側儲存／列印（同一行、靠右） */
export function ResultTitleBar({ dict }) {
  return (
    <div className="grid grid-cols-3 w-full items-center justify-between gap-3">
      <div aria-hidden="true"></div>
      <h2 className="text-center min-w-0 truncate text-2xl font-black tracking-tight text-[var(--c-text)] md:text-3xl">
        {dict.resultTitle}
      </h2>
      <div className="flex shrink-0 items-center gap-2 justify-end">
        <ResultIconButton ariaLabel={dict.saveResult}>
          <MdSave className="h-5 w-5" aria-hidden />
        </ResultIconButton>
        <ResultIconButton ariaLabel={dict.printResult}>
          <MdPrint className="h-5 w-5" aria-hidden />
        </ResultIconButton>
      </div>
    </div>
  );
}
