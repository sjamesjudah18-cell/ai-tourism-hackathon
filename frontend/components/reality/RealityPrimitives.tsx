"use client";

/**
 * Compatibility layer over the shared design system.
 *
 * The eight Reality Check detail components were already written against
 * exactly the three concepts the reduced system allows - provenance, status and
 * severity - so rather than rewriting all eight, their old primitives now
 * delegate to `components/ui/Primitives`. That collapses the visual language in
 * one place: a `DataLabelChip` anywhere in the product now renders the same
 * quiet `ProvenanceBadge` as everything else, with no bordered pill.
 *
 * New code should import from `components/ui/Primitives` directly.
 */

import type {
  Confidence,
  DataLabel,
  RealityStatus,
  Severity,
  SourceRef,
} from "../../types/reality";
import {
  BriefingSkeleton,
  ConfidenceNote,
  ProvenanceBadge,
  SeverityBadge,
  SourceLine,
  StatusMark,
  UnavailableNote,
  relativeTime as relativeTimeImpl,
  severityStyle,
  statusStyle,
} from "../ui/Primitives";

export function StatusBadge({ status }: { status: RealityStatus; size?: "sm" | "lg" }) {
  return <StatusMark status={status} />;
}

export function DataLabelChip({
  label,
  className = "",
}: {
  label: DataLabel;
  className?: string;
}) {
  return <ProvenanceBadge label={label} className={className} />;
}

export function ConfidenceChip({ confidence }: { confidence: Confidence }) {
  return <ConfidenceNote confidence={confidence} />;
}

export function SeverityChip({ severity }: { severity: Severity }) {
  return <SeverityBadge severity={severity} />;
}

export function SourceStamp({
  sources,
  lastUpdated,
  className = "",
}: {
  sources?: SourceRef[] | null;
  lastUpdated?: string | null;
  className?: string;
}) {
  return (
    <SourceLine sources={sources} lastUpdated={lastUpdated} className={className} />
  );
}

export function SectionSkeleton({ title }: { title?: string }) {
  return <BriefingSkeleton title={title} />;
}

export function UnavailableNotice({
  title,
  reason,
  onRetry,
}: {
  title?: string;
  reason: string;
  onRetry?: () => void;
}) {
  return <UnavailableNote title={title} reason={reason} onRetry={onRetry} />;
}

export const relativeTime = relativeTimeImpl;

/** Kept for callers that read severity colours directly. */
export const SEVERITY_STYLES = new Proxy({} as Record<Severity, any>, {
  get: (_target, key: string) => {
    const style = severityStyle(key as Severity);
    return { bar: style.rule, chip: style.text, label: style.label };
  },
});

export function statusAccent(status: RealityStatus) {
  const style = statusStyle(status);
  return { dot: style.dot, text: style.text, label: style.label };
}
