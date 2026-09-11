"use client";

/**
 * The shared visual vocabulary of the reality layer.
 *
 * These components exist so provenance is shown consistently everywhere. A
 * traveller should be able to learn "green dot = we checked this just now,
 * outlined chip = we worked it out ourselves" once, and have it hold across
 * the whole product.
 */

import type {
  Confidence,
  DataLabel,
  RealityStatus,
  Severity,
  SourceRef,
} from "../../types/reality";

/* ------------------------------- Status -------------------------------- */

const STATUS_STYLES: Record<
  RealityStatus,
  { dot: string; text: string; bg: string; border: string; label: string }
> = {
  GOOD: {
    dot: "bg-emerald-500",
    text: "text-emerald-900",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Good",
  },
  FAIR: {
    dot: "bg-sky-500",
    text: "text-sky-900",
    bg: "bg-sky-50",
    border: "border-sky-200",
    label: "Fair",
  },
  CAUTION: {
    dot: "bg-amber-500",
    text: "text-amber-900",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Caution",
  },
  POOR: {
    dot: "bg-rose-500",
    text: "text-rose-900",
    bg: "bg-rose-50",
    border: "border-rose-200",
    label: "Poor",
  },
  UNKNOWN: {
    dot: "bg-neutral-400",
    text: "text-neutral-700",
    bg: "bg-neutral-100",
    border: "border-neutral-200",
    label: "Unknown",
  },
};

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: RealityStatus;
  size?: "sm" | "lg";
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.UNKNOWN;
  const scale =
    size === "lg"
      ? "px-3.5 py-1.5 text-xs tracking-[0.14em]"
      : "px-2.5 py-1 text-[10px] tracking-[0.12em]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase ${scale} ${style.bg} ${style.text} ${style.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export function statusAccent(status: RealityStatus) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.UNKNOWN;
}

/* ---------------------------- Provenance ------------------------------- */

const LABEL_COPY: Record<DataLabel, { text: string; title: string }> = {
  LIVE: { text: "Live", title: "Fetched now from a named external source" },
  PROVIDER: { text: "Provider price", title: "A real price quoted by a provider" },
  ESTIMATE: { text: "Estimate", title: "Calculated by our model, not measured" },
  APPROXIMATE: { text: "Approx.", title: "A rounded figure or range, not exact" },
  STATIC: { text: "Reference", title: "Curated reference data, reviewed not live" },
  FALLBACK: { text: "Fallback", title: "The live source failed; this is a stand-in" },
  UNAVAILABLE: { text: "Unavailable", title: "We genuinely do not have this" },
};

/**
 * Live data gets a filled green treatment; everything we worked out ourselves
 * stays outlined. The visual weight difference is the point.
 */
export function DataLabelChip({
  label,
  className = "",
}: {
  label: DataLabel;
  className?: string;
}) {
  const copy = LABEL_COPY[label] ?? LABEL_COPY.ESTIMATE;

  const tone =
    label === "LIVE" || label === "PROVIDER"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : label === "UNAVAILABLE" || label === "FALLBACK"
      ? "border-neutral-200 bg-neutral-100 text-neutral-600"
      : "border-black/10 bg-transparent text-[#6b6b66]";

  return (
    <span
      title={copy.title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone} ${className}`}
    >
      {label === "LIVE" && (
        <span className="h-1 w-1 rounded-full bg-emerald-500" />
      )}
      {copy.text}
    </span>
  );
}

export function ConfidenceChip({ confidence }: { confidence: Confidence }) {
  const tone =
    confidence === "High"
      ? "text-emerald-800"
      : confidence === "Medium"
      ? "text-[#6b6b66]"
      : "text-amber-800";

  return (
    <span className={`text-[11px] font-medium ${tone}`}>
      {confidence} confidence
    </span>
  );
}

/* ------------------------------ Sources -------------------------------- */

export function relativeTime(iso?: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 0) return "just now";
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

/**
 * Renders attribution only when a source genuinely exists. A value with no
 * source shows nothing rather than an invented one.
 */
export function SourceStamp({
  sources,
  lastUpdated,
  className = "",
}: {
  sources?: SourceRef[] | null;
  lastUpdated?: string | null;
  className?: string;
}) {
  const when = relativeTime(lastUpdated);
  const named = (sources ?? []).filter((s) => s?.name);

  if (!when && named.length === 0) return null;

  return (
    <p className={`text-[11px] leading-relaxed text-[#8f8f88] ${className}`}>
      {when && <span>Updated {when}</span>}
      {when && named.length > 0 && <span className="mx-1.5">·</span>}
      {named.length > 0 && (
        <span>
          Source:{" "}
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

/* ------------------------------ Severity ------------------------------- */

export const SEVERITY_STYLES: Record<
  Severity,
  { bar: string; chip: string; label: string }
> = {
  CRITICAL: {
    bar: "bg-rose-600",
    chip: "bg-rose-50 text-rose-900 border-rose-200",
    label: "Critical",
  },
  HIGH: {
    bar: "bg-rose-500",
    chip: "bg-rose-50 text-rose-900 border-rose-200",
    label: "High",
  },
  MEDIUM: {
    bar: "bg-amber-500",
    chip: "bg-amber-50 text-amber-900 border-amber-200",
    label: "Medium",
  },
  LOW: {
    bar: "bg-sky-500",
    chip: "bg-sky-50 text-sky-900 border-sky-200",
    label: "Low",
  },
  INFO: {
    bar: "bg-neutral-400",
    chip: "bg-neutral-100 text-neutral-700 border-neutral-200",
    label: "Info",
  },
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.INFO;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.chip}`}
    >
      {style.label}
    </span>
  );
}

/* ------------------------------- States -------------------------------- */

export function SectionSkeleton({ title }: { title?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      {title && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b5b5ad]">
          {title}
        </p>
      )}
      <div className="mt-3 space-y-2.5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-neutral-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-100" />
      </div>
    </div>
  );
}

/**
 * The honest empty state. Used whenever a live source could not be reached -
 * it says so plainly rather than showing plausible-looking stand-in data.
 */
export function UnavailableNotice({
  title,
  reason,
  onRetry,
}: {
  title?: string;
  reason: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-[#faf9f7] p-6">
      {title && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b5b5ad]">
          {title}
        </p>
      )}
      <p className="mt-2 text-sm text-[#6b6b66]">{reason}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-semibold text-[#171717] transition hover:bg-white"
        >
          Try again
        </button>
      )}
    </div>
  );
}
