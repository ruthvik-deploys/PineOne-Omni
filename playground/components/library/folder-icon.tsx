import type { ReactNode } from "react";

/**
 * A Finder-style folder: back panel with its tab, whatever is inside peeking out over the top,
 * then the front panel. Pass up to three `sheets`; they fan out slightly. Decorative (aria-hidden).
 */
export function FolderIcon({ sheets = [] }: { sheets?: ReactNode[] }) {
  const fan = [
    "left-[14%] right-[22%] -rotate-[5deg]",
    "left-[24%] right-[14%] rotate-[4deg]",
    "left-[18%] right-[18%] rotate-0",
  ];
  return (
    <div aria-hidden className="relative aspect-[6/5] w-full">
      <svg viewBox="0 0 120 100" className="absolute inset-0 size-full drop-shadow-sm" preserveAspectRatio="none">
        <path
          d="M8 14 Q8 8 14 8 H42 Q46 8 49 11 L53 15 Q55 17 59 17 H106 Q112 17 112 23 V88 Q112 94 106 94 H14 Q8 94 8 88 Z"
          className="fill-folder-back"
        />
      </svg>
      {sheets.slice(0, 3).map((sheet, i) => (
        <div
          key={i}
          className={`absolute top-[9%] bottom-[24%] overflow-hidden rounded-[3px] bg-card shadow-sm ring-1 ring-border ${fan[i]}`}
        >
          {sheet}
        </div>
      ))}
      <svg viewBox="0 0 120 100" className="absolute inset-0 size-full" preserveAspectRatio="none">
        <path d="M6 40 Q6 35 11 35 H109 Q114 35 114 40 L112 89 Q112 95 106 95 H14 Q8 95 8 89 Z" className="fill-folder-front" />
        <path d="M11 35.6 H109" className="stroke-folder-edge" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}
