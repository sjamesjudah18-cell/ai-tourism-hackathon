"use client";

/**
 * The reduced visual vocabulary.
 *
 * The previous UI had ten-plus distinct badge styles on a single screen -
 * severity, category, day number, distance, duration, confidence, provenance -
 * which flattened meaning instead of establishing it. Everything a badge was
 * doing is now handled by exactly three components, and everything else became
 * plain metadata text.
 *
 *   1. <SeverityBadge>   ONLY for genuine alert severity. Nothing else.
 *   2. <ProvenanceBadge> LIVE / ESTIMATED / UNAVAILABLE and friends.
 *   3. <CategoryLabel>   Plain small-caps text, deliberately not a pill.
 *
 * Distances, durations, day numbers and ratings render with <Meta>.
 */

import type { ReactNode } from "react";
import type {
  Confidence,
  DataLabel,
  RealityStatus,
  Severity,
} from "../../types/reality";

/* --------------------------- 1. Severity -------------------------------- */

const SEVERITY: Record<
  Severity,
  { label: string; text: string; rule: string; dot: string }
> = {
  CRITICAL: {
    label: "Critical",
    text: "text-red-800",
    rule: "bg-red-700",
    dot: "bg-red-700",
  },
  HIGH: {
    label: "High",
    text: "text-red-700",
    rule: "bg-red-600",
    dot: "bg-red-600",
  },
  MEDIUM: {
    label: "Medium",
    text: "text-amber-700",
    rule: "bg-amber-500",
    dot: "bg-amber-500",
  },
  LOW: {
    label: "Low",
    text: "text-sky-700",
    rule: "bg-sky-500",
    dot: "bg-sky-500",
  },
  INFO: {
    label: "Info",
    text: "text-[#8f8f88]",
    rule: "bg-[#b5b5ad]",
    dot: "bg-[#b5b5ad]",
  },
};

export function severityStyle(severity: Severity) {
  return SEVERITY[severity] ?? SEVERITY.INFO;
}

/**
 * Severity as a coloured dot plus a word — no bordered pill. Red and amber are
 * reserved strictly for HIGH and CRITICAL so they keep their meaning.
 */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const style = severityStyle(severity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

/* -------------------------- 2. Provenance -------------------------------- */

const PROVENANCE: Record<DataLabel, { text: string; title: string }> = {
  LIVE: { text: "Live", title: "Fetched now from a named external source" },
  PROVIDER: { text: "Provider price", title: "A real price quoted by a provider" },
  ESTIMATE: { text: "Estimated", title: "Calculated by our model, not measured" },
  APPROXIMATE: { text: "Approx.", title: "A range or rounded figure, not exact" },
  STATIC: { text: "Reference", title: "Curated reference data, reviewed not live" },
  FALLBACK: { text: "Fallback", title: "The live source failed; this is a stand-in" },
  UNAVAILABLE: { text: "Unavailable", title: "We genuinely do not have this" },
};

/**
 * The one badge that stays visually distinct, because provenance is the
 * product's whole promise. Live data gets a filled dot; everything we worked
 * out ourselves stays quiet.
 */
export function ProvenanceBadge({
  label,
  className = "",
}: {
  label: DataLabel;
  className?: string;
}) {
  const copy = PROVENANCE[label] ?? PROVENANCE.ESTIMATE;
  const isLive = label === "LIVE" || label === "PROVIDER";
  const isMissing = label === "UNAVAILABLE" || label === "FALLBACK";

  return (
    <span
      title={copy.title}
      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
        isLive
          ? "text-emerald-700"
          : isMissing
          ? "text-[#b5b5ad]"
          : "text-[#8f8f88]"
      } ${className}`}
    >
      {isLive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {copy.text}
    </span>
  );
}

/* --------------------------- 3. Category --------------------------------- */

/** Plain small-caps text. Deliberately not a bordered pill. */
export function CategoryLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8f88] ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------- Plain metadata -------------------------------- */

/** What distances, durations, ratings and day numbers use now. */
export function Meta({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`t-meta ${className}`}>{children}</span>;
}

/** Separates metadata items without drawing attention to itself. */
export function MetaDot() {
  return (
    <span className="mx-2 text-[#d8d8d2]" aria-hidden="true">
      ·
    </span>
  );
}

/* ---------------------------- Readiness ---------------------------------- */

const STATUS: Record<RealityStatus, { label: string; text: string; dot: string }> = {
  GOOD: { label: "Good", text: "text-emerald-700", dot: "bg-emerald-500" },
  FAIR: { label: "Fair", text: "text-sky-700", dot: "bg-sky-500" },
  CAUTION: { label: "Caution", text: "text-amber-700", dot: "bg-amber-500" },
  POOR: { label: "Poor", text: "text-red-700", dot: "bg-red-600" },
  UNKNOWN: { label: "Unknown", text: "text-[#8f8f88]", dot: "bg-[#b5b5ad]" },
};

export function statusStyle(status: RealityStatus) {
  return STATUS[status] ?? STATUS.UNKNOWN;
}

/** Status as dot + word, matching the severity treatment. */
export function StatusMark({
  status,
  className = "",
}: {
  status: RealityStatus;
  className?: string;
}) {
  const style = statusStyle(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${style.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export function ConfidenceNote({ confidence }: { confidence: Confidence }) {
  return <span className="t-caption">{confidence} confidence</span>;
}

/* ------------------------------ Buttons ---------------------------------- */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfbfa]";

const BUTTON_SIZES = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-5 py-2.5 text-[13px]",
  lg: "px-6 py-3 text-sm",
};

const BUTTON_VARIANTS = {
  // The existing black pill already read as premium - kept as-is.
  primary: "bg-[#171717] text-white hover:bg-black",
  secondary:
    "border border-[rgba(0,0,0,0.14)] bg-transparent text-[#171717] hover:bg-[#f5f3ee]",
  ghost: "text-[#6b6b66] hover:text-[#171717]",
  accent: "bg-[#d97745] text-white hover:bg-[#c66a3c]",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${BUTTON_BASE} ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------- Inputs ---------------------------------- */

export const inputClass =
  "w-full rounded-xl border border-[rgba(0,0,0,0.12)] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition placeholder:text-[#b5b5ad] focus:border-[#171717] focus:ring-1 focus:ring-[#171717]";

export function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="t-label block">
        {label}
        {optional && (
          <span className="ml-1.5 font-medium normal-case tracking-normal text-[#b5b5ad]">
            optional
          </span>
        )}
      </label>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 t-caption">{hint}</p>}
    </div>
  );
}

/* ------------------------------ Surfaces --------------------------------- */

/**
 * Content surface. Border and shadow are deliberately light - hierarchy comes
 * from type and spacing, not from boxing everything uniformly.
 */
export function Panel({
  children,
  className = "",
  inset = true,
}: {
  children: ReactNode;
  className?: string;
  inset?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[rgba(0,0,0,0.07)] bg-white ${
        inset ? "p-5 md:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Section heading with an optional eyebrow and trailing action. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="t-label text-[#8a5a3b]">{eyebrow}</p>}
        <h2 className="t-headline mt-1.5 text-[#171717]">{title}</h2>
        {description && (
          <p className="t-body mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------- States ---------------------------------- */

/** Skeletons are shaped like the content they replace, not generic bars. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-[#eeece7] ${className}`} />
  );
}

export function PlaceCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.07)] bg-white">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function BriefingSkeleton({ title }: { title?: string }) {
  return (
    <div className="border-b border-[rgba(0,0,0,0.07)] py-7">
      {title && <p className="t-label">{title}</p>}
      <Skeleton className="mt-3 h-5 w-2/5" />
      <Skeleton className="mt-3 h-3 w-4/5" />
      <Skeleton className="mt-2 h-3 w-3/5" />
    </div>
  );
}

/** The honest empty state, used wherever a live source could not be reached. */
export function UnavailableNote({
  title,
  reason,
  onRetry,
}: {
  title?: string;
  reason: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(0,0,0,0.12)] bg-[#faf9f7] p-5">
      {title && <p className="t-label">{title}</p>}
      <p className="t-body mt-1.5">{reason}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ----------------------------- Attribution ------------------------------- */

export function relativeTime(iso?: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(seconds / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** Renders attribution only when a source genuinely exists. */
export function SourceLine({
  sources,
  lastUpdated,
  className = "",
}: {
  sources?: { name: string; url?: string | null }[] | null;
  lastUpdated?: string | null;
  className?: string;
}) {
  const when = relativeTime(lastUpdated);
  const named = (sources ?? []).filter((s) => s?.name);
  if (!when && named.length === 0) return null;

  return (
    <p className={`t-caption ${className}`}>
      {when && <span>Updated {when}</span>}
      {when && named.length > 0 && <MetaDot />}
      {named.length > 0 && (
        <span>
          {named.map((source, index) => (
            <span key={source.name}>
              {index > 0 && ", "}
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted underline-offset-2 hover:text-[#171717]"
                >
                  {source.name}
                </a>
              ) : (
                source.name
              )}
            </span>
          ))}
        </span>
      )}
    </p>
  );
}
