/**
 * A document file: a page with a folded top-right corner, showing its title and opening text
 * as a miniature. Decorative (aria-hidden); put the real name next to it.
 */
export function FileIcon({ title, excerpt, compact = false }: { title: string; excerpt: string; compact?: boolean }) {
  return (
    <div aria-hidden className="relative aspect-[17/22] w-full drop-shadow-sm">
      <svg viewBox="0 0 85 110" className="absolute inset-0 size-full" preserveAspectRatio="none">
        <path d="M4 1 H62 L84 23 V106 Q84 109 81 109 H4 Q1 109 1 106 V4 Q1 1 4 1 Z" className="fill-card stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d="M62 1 V19 Q62 23 66 23 H84" className="fill-muted stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {!compact && (
        <div className="absolute inset-x-[9%] top-[24%] bottom-[7%] overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
          <p className="text-[7px] leading-[1.25] font-semibold text-foreground sm:text-[8px]">{title}</p>
          <p className="mt-1 text-[4.5px] leading-[1.6] break-words text-muted-foreground sm:text-[5px]">{excerpt}</p>
        </div>
      )}
      {compact && (
        <div className="absolute inset-x-[16%] top-[34%] flex flex-col gap-[3px]">
          {[100, 80, 92, 64].map((w) => (
            <span key={w} className="h-px rounded-full bg-muted-foreground/40" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}
