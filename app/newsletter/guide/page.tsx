import type { Metadata } from "next"
import Image from "next/image"
import { Platypi, Figtree } from "next/font/google"
import {
  ArrowRight,
  CheckCircle,
  Headset,
  Plugs,
  Robot,
  Storefront,
  Trophy,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr"

const platypi = Platypi({ subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"] })
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })

export const metadata: Metadata = {
  title: "Guide — AI assistant for merchants | Pine Labs",
  description: "Launching Guide, a general assistant for merchants on Pine Labs.",
}

const H = platypi.className

// Lime glow used behind the hero and the closing section (Figma: blurred ellipses)
const limeGlow = [
  "radial-gradient(38% 32% at 88% 58%, rgba(255,255,255,0.95), transparent 70%)",
  "radial-gradient(55% 45% at 38% 42%, #BDEF4C, transparent 75%)",
  "radial-gradient(45% 40% at 100% 95%, #C4F25A, transparent 70%)",
  "radial-gradient(55% 45% at 0% 0%, #C9F46A, transparent 70%)",
  "#E3F5C6",
].join(", ")

const signals = [
  { value: "180", label: "Merchants using Guide", tilt: 7 },
  { value: "125", label: "Runs per day", tilt: -2 },
  { value: "~4", label: "Questions per merchant", tilt: 4 },
]

/* ── Building blocks ─────────────────────────────────── */

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <>
      <h2 className={`${H} mx-auto max-w-[17ch] text-center text-[34px] font-normal leading-[1.1] tracking-[-0.02em] sm:text-[42px]`}>
        {title}
      </h2>
      {sub && <p className="mx-auto mt-3 max-w-[46ch] text-center text-[15px] leading-relaxed text-neutral-500">{sub}</p>}
    </>
  )
}

function FeatureCard({
  title,
  body,
  wide,
  children,
}: {
  title: string
  body: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col rounded-[22px] bg-[#EDF0EF] p-6 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="relative flex h-[200px] items-center justify-center">{children}</div>
      <p className="mx-auto mt-6 max-w-[34ch] text-center text-[15px] leading-relaxed text-neutral-500">
        <span className="font-semibold text-neutral-900">{title}</span> {body}
      </p>
    </div>
  )
}

function Tile({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl bg-white shadow-[0_12px_32px_-12px_rgba(17,24,20,0.18)] ${className}`}>{children}</div>
  )
}

function Bar({ label, pct, tone = "bg-[#6BCB3D]" }: { label: string; pct: number; tone?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-11 text-[11px] text-neutral-500">{label}</span>
      <span className="h-1.5 flex-1 rounded-full bg-neutral-100">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
    </div>
  )
}

/* Chat preview: the merchant asks on the right, Guide answers on the left */
function ChatPreview({ ask, answer, children }: { ask: string; answer: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-[#EDF0EF] p-5 sm:p-6">
      <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-neutral-900 px-3.5 py-2.5 text-[13px] leading-snug text-white">
        {ask}
      </p>
      <div className="flex items-end gap-2">
        <Image src="/brand/pineone-omni-mark.svg" alt="Guide" width={26} height={26} className="shrink-0" />
        <div className="flex-1 rounded-2xl rounded-bl-md bg-white p-3.5 shadow-[0_8px_24px_-12px_rgba(17,24,20,0.18)]">
          <p className="text-[12px] font-medium leading-snug">{answer}</p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  )
}

const asks: {
  q: string
  body: string
  ask: string
  answer: string
  preview: React.ReactNode
}[] = [
  {
    q: "How is your business performing?",
    body: "Across stores, devices, collections and payment modes.",
    ask: "How did the business do this week?",
    answer: "Here’s this week across all your stores.",
    preview: (
      <div className="grid grid-cols-3 gap-1.5">
        {["Stores", "Devices", "Modes"].map((l) => (
          <div key={l} className="rounded-lg bg-[#F4F5F4] py-2 text-center">
            <p className="text-[10px] text-neutral-500">{l}</p>
            <p className="mx-auto mt-1.5 h-1.5 w-8 rounded-full bg-[#6BCB3D]" />
          </div>
        ))}
      </div>
    ),
  },
  {
    q: "Is anything left unsettled?",
    body: "Transactions not settled in the latest settlement.",
    ask: "Did everything settle yesterday?",
    answer: "Almost. A few transactions aren’t in the latest settlement.",
    preview: (
      <div className="space-y-1.5">
        <p className="flex items-center gap-2 rounded-lg bg-[#F4F5F4] px-2.5 py-2 text-[11px] text-neutral-500">
          <CheckCircle weight="fill" className="size-3.5 text-[#6BCB3D]" /> Settled · Batch 1
        </p>
        <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-800">
          <WarningCircle weight="fill" className="size-3.5 text-amber-500" /> Not in latest settlement
        </p>
      </div>
    ),
  },
  {
    q: "Any anomalies in refunds?",
    body: "Unusual refund activity, caught early.",
    ask: "Anything odd with refunds lately?",
    answer: "Yes. Refunds spiked on one day this week.",
    preview: (
      <div className="flex h-14 items-end gap-1.5">
        {[30, 38, 26, 34, 30, 92, 36].map((h, i) => (
          <span key={i} className={`flex-1 rounded-t ${i === 5 ? "bg-red-400" : "bg-neutral-200"}`} style={{ height: `${h}%` }} />
        ))}
      </div>
    ),
  },
  {
    q: "How is each store doing?",
    body: "Performance by revenue and volume of payments.",
    ask: "Which store is doing best?",
    answer: "Store A leads on revenue this month.",
    preview: (
      <div className="space-y-2">
        <Bar label="Store A" pct={90} tone="bg-neutral-800" />
        <Bar label="Store B" pct={64} tone="bg-neutral-800" />
        <Bar label="Store C" pct={38} tone="bg-neutral-800" />
      </div>
    ),
  },
  {
    q: "How do you compare?",
    body: "Against fellow merchants in the same MCC for your pincode. Signals only, no confidential or PII data.",
    ask: "How am I doing compared to others nearby?",
    answer: "Against merchants in your MCC and pincode:",
    preview: (
      <div className="flex items-center gap-3 rounded-lg bg-[#F4F5F4] p-2.5">
        <span className="grid size-9 place-items-center rounded-lg bg-[#D9F5C4]">
          <Trophy weight="fill" className="size-4" />
        </span>
        <span>
          <span className={`${H} block text-[18px] leading-tight`}>Top 20 percentile</span>
          <span className="block text-[10px] text-neutral-500">by revenue · example</span>
        </span>
      </div>
    ),
  },
]

/* ── Page ────────────────────────────────────────────── */

export default function GuideNewsletterPage() {
  return (
    <main className={`${figtree.className} min-h-screen bg-[#8FB0AE] text-neutral-900 sm:px-6 sm:py-16`}>
      <article className="mx-auto max-w-[760px] overflow-hidden bg-[#F7F7F6] sm:rounded-xl">
        {/* ── Hero ── */}
        <header className="relative h-[834px] overflow-hidden px-5 pt-16 text-center sm:px-12" style={{ background: limeGlow }}>
          <Image
            src="/brand/pineone-omni-mark.svg"
            alt="PineOne"
            width={64}
            height={64}
            priority
            className="mx-auto rounded-full border-2 border-white/90 shadow-[0_6px_20px_-8px_rgba(60,110,10,0.5)]"
          />
          <h1 className={`${H} mt-8 text-[52px] font-normal italic leading-[1.1] tracking-[-0.02em] sm:text-[60px]`}>
            Meet Guide
          </h1>
          <p className="mx-auto mt-3 max-w-[40ch] text-[16px] leading-relaxed text-neutral-600">
            We’re launching our AI assistant for merchants, a general assistant for everyone on Pine Labs.
          </p>
          <span className="mt-4 inline-block rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-700">
            Closed beta
          </span>

          {/* Phone — runs off the bottom edge */}
          <div className="relative mx-auto mt-12 w-[290px] sm:w-[320px]">
            <div className="h-[660px] rounded-[44px] border-[10px] border-white/55 bg-white/40">
              <div className="h-full rounded-[34px] bg-[#F7F7F6] text-left">
                <div className="flex items-center justify-between px-5 pt-2.5 text-[11px] font-semibold">
                  <span>9:41</span>
                  <span className="h-6 w-[84px] rounded-full bg-neutral-900" />
                  <span className="flex items-end gap-0.5">
                    <span className="h-1.5 w-1 rounded-sm bg-neutral-900" />
                    <span className="h-2 w-1 rounded-sm bg-neutral-900" />
                    <span className="ml-1 h-2.5 w-5 rounded-[3px] bg-neutral-900" />
                  </span>
                </div>
                <div className="px-4 pt-5">
                  <p className="text-[11px] text-neutral-400">Guide</p>
                  <p className="text-[19px] font-semibold">Good morning 👋</p>
                  <p className="ml-auto mt-4 w-fit max-w-[80%] rounded-2xl rounded-br-md bg-neutral-900 px-3 py-2 text-[12px] text-white">
                    How much have I collected over a few intervals?
                  </p>
                  <div className="mt-3 w-[92%] rounded-2xl bg-white p-3">
                    <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold">
                      <CheckCircle weight="fill" className="size-4 text-[#6BCB3D]" /> Last 7 days, by payment mode
                    </p>
                    <div className="space-y-1.5">
                      <Bar label="UPI" pct={88} />
                      <Bar label="Cards" pct={54} />
                      <Bar label="Others" pct={22} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Tile className="absolute -left-32 top-[298px] hidden items-center gap-3 !rounded-full p-3 pr-5 text-left sm:flex">
              <span className="grid size-9 place-items-center rounded-full bg-[#EDF0EF]">
                <Trophy weight="fill" className="size-4" />
              </span>
              <span>
                <span className="block text-[11px] text-neutral-500">Most repeated ask</span>
                <span className="block text-[13px] font-semibold">Collections over time</span>
              </span>
            </Tile>
            <Tile className="absolute -right-24 top-[360px] hidden items-center gap-2 !rounded-full p-1.5 pr-4 sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-[#D9F5C4]">
                <ArrowRight weight="bold" className="size-3.5" />
              </span>
              <span className="text-[12px] font-semibold">Ask a follow-up</span>
            </Tile>
          </div>
        </header>

        {/* ── Early signals ── */}
        <section className="px-5 pb-20 pt-20 sm:px-12">
          <SectionHead title="Early signal from closed beta" />
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-0">
            {signals.map((s) => (
              <div
                key={s.label}
                className="flex aspect-[0.95] w-[220px] flex-col items-center justify-center rounded-[22px] border-2 border-white bg-[#EDF0EF] sm:-mx-1"
                style={{ transform: `rotate(${s.tilt}deg)` }}
              >
                <span className={`${H} text-[64px] leading-none tabular-nums`}>{s.value}</span>
                <span className="mt-10 text-[14px] font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Stop hunting + ask in plain words (combined) ── */}
        <section className="px-5 py-20 sm:px-12">
          <SectionHead
            title="Stop hunting for the information you need."
            sub="No more clicking through dashboards and reports. Ask about your business in plain words — like asking your chief of staff, EA or munshi ji."
          />
          <div className="mt-14 space-y-12 sm:space-y-16">
            {asks.map((a, i) => (
              <div key={a.q} className="grid items-center gap-6 sm:grid-cols-2 sm:gap-10">
                <div className={i % 2 ? "sm:order-2" : ""}>
                  <ChatPreview ask={a.ask} answer={a.answer}>
                    {a.preview}
                  </ChatPreview>
                </div>
                <div>
                  <span className="text-[12px] font-semibold tabular-nums text-neutral-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className={`${H} mt-2 text-[26px] font-normal leading-[1.15] tracking-[-0.01em]`}>{a.q}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">{a.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-14 max-w-[44ch] text-center text-[15px] text-neutral-500">
            <span className="font-semibold text-neutral-900">And many other things.</span> If it is your data on Pine Labs,
            Guide can answer it.
          </p>
        </section>

        {/* ── What's next ── */}
        <section className="px-5 py-20 sm:px-12">
          <SectionHead title="What we will do next" sub="Guide is only getting started. Here is what is on the way." />
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <FeatureCard wide title="Connectors, launching soon." body="Guide assists you on the other business tools you already use.">
              <span className="absolute right-0 top-0 rounded-full bg-neutral-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#C8F59A]">
                Coming soon
              </span>
              <div className="flex items-center">
                <Tile className="px-4 py-3 text-[12px] font-medium text-neutral-500">Your tools</Tile>
                <span className="h-px w-8 bg-neutral-300" />
                <Tile className="grid size-14 place-items-center !rounded-full">
                  <Plugs weight="fill" className="size-6" />
                </Tile>
                <span className="h-px w-8 bg-neutral-300" />
                <Tile className="px-4 py-3 text-[12px] font-medium text-neutral-500">Your apps</Tile>
              </div>
            </FeatureCard>
            <FeatureCard title="Customer support" body="Help with customer support queries on Pine Labs.">
              <Tile className="flex items-center gap-3 p-3 pr-5">
                <span className="grid size-9 place-items-center rounded-xl bg-[#EDF0EF]">
                  <Headset weight="fill" className="size-4" />
                </span>
                <span className="text-left text-[12px]">
                  <span className="block text-neutral-500">Support</span>
                  <span className="block font-semibold">Query resolved</span>
                </span>
              </Tile>
            </FeatureCard>
            <FeatureCard title="Agents" body="Nudges to use Agents that act autonomously on your behalf.">
              <Tile className="flex items-center gap-3 p-3 pr-5">
                <span className="grid size-9 place-items-center rounded-xl bg-[#D9F5C4]">
                  <Robot weight="fill" className="size-4" />
                </span>
                <span className="text-left text-[12px]">
                  <span className="block text-neutral-500">Agent</span>
                  <span className="block font-semibold">Working on it…</span>
                </span>
              </Tile>
            </FeatureCard>
          </div>
          <p className="mt-4 text-center text-[11px] text-neutral-400">Product visuals are illustrative.</p>
        </section>

        {/* ── Ambition ── */}
        <section className="flex h-[485px] flex-col items-center justify-center px-5 text-center" style={{ background: limeGlow }}>
          <p className="text-[20px] text-neutral-600">We want to compete with</p>
          <p className={`${H} mt-2 text-[52px] font-normal italic leading-none tracking-[-0.02em] sm:text-[68px]`}>
            Muse for Business.
          </p>
        </section>
      </article>
    </main>
  )
}
