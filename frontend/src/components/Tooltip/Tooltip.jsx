export default function Tooltip({ label, children, className = '' }) {
  if (!label) return children;

  return (
    <span className={`group/tooltip relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-[400] mt-2 hidden max-w-56 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/75 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm group-hover/tooltip:block group-focus-within/tooltip:block"
      >
        {label}
      </span>
    </span>
  );
}
