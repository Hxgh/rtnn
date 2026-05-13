"use client";

import type { ReactNode } from "react";
import {
  getVisibleMapCandidates,
  isMapCandidateActionable,
  type MapNavigationPickerState,
  type NativeCoreMapCandidate,
} from "@/lib/native-core";
import { cn } from "@/lib/utils";

export type MapNavigationPickerLabels = {
  title: ReactNode;
  description: ReactNode;
  checkingDescription: ReactNode;
  emptyDescription: ReactNode;
  failedDescription: ReactNode;
  checking: ReactNode;
  notInstalled: ReactNode;
  unsupported: ReactNode;
  unavailable: ReactNode;
  webFallback: ReactNode;
};

function getMapInstallLabel(
  status: NativeCoreMapCandidate["status"],
  labels: MapNavigationPickerLabels,
) {
  if (status === "not-installed") {
    return labels.notInstalled;
  }

  if (status === "unsupported") {
    return labels.unsupported;
  }

  return labels.unavailable;
}

function getMapCandidateHint(
  candidate: NativeCoreMapCandidate,
  labels: MapNavigationPickerLabels,
) {
  if (candidate.status === "installed") {
    return null;
  }

  return getMapInstallLabel(candidate.status, labels);
}

function getMapPickerCaption(
  candidates: NativeCoreMapCandidate[],
  labels: MapNavigationPickerLabels,
) {
  if (candidates.some(isMapCandidateActionable)) {
    return labels.description;
  }

  return labels.emptyDescription;
}

function MapAppMark({
  candidate,
  disabled,
}: {
  candidate: NativeCoreMapCandidate;
  disabled: boolean;
}) {
  const initial = candidate.label.slice(0, 1);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
        disabled
          ? "border-border bg-secondary text-muted-foreground"
          : "border-foreground bg-foreground text-background",
      )}
    >
      {initial}
    </span>
  );
}

export function MapNavigationPicker({
  candidates,
  labels,
  onClose,
  onSelect,
  onWebFallback,
  state,
}: {
  candidates: NativeCoreMapCandidate[];
  labels: MapNavigationPickerLabels;
  onClose: () => void;
  onSelect: (candidate: NativeCoreMapCandidate) => void;
  onWebFallback: () => void;
  state: MapNavigationPickerState;
}) {
  const visibleCandidates = getVisibleMapCandidates(candidates);
  const isChecking = state === "checking";
  const isFailed = state === "failed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/45"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-modal="true"
        className="mx-auto w-full max-w-[28rem] rounded-t-[1.25rem] border border-border/80 bg-background pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="space-y-1 px-5">
          <h3 className="text-base font-semibold text-foreground">
            {labels.title}
          </h3>
          <p className="text-xs leading-5 text-muted-foreground">
            {isChecking
              ? labels.checkingDescription
              : isFailed
                ? labels.failedDescription
                : getMapPickerCaption(candidates, labels)}
          </p>
        </div>

        <div className="mt-3 divide-y divide-border/70 bg-card">
          {isChecking ? (
            <div className="px-5 py-5 text-sm text-muted-foreground">
              {labels.checking}
            </div>
          ) : null}
          {!isChecking && visibleCandidates.length === 0 ? (
            <button
              className="flex min-h-16 w-full items-center justify-between gap-3 px-5 py-3 text-left text-foreground active:bg-secondary/80"
              onClick={onWebFallback}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-foreground bg-foreground text-sm font-semibold text-background"
                >
                  W
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {labels.webFallback}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    {isFailed ? labels.failedDescription : labels.emptyDescription}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-lg leading-none text-muted-foreground">›</span>
            </button>
          ) : null}
          {visibleCandidates.map((candidate) => {
            const disabled = !isMapCandidateActionable(candidate);
            const hint = getMapCandidateHint(candidate, labels);

            return (
              <button
                className={cn(
                  "flex min-h-16 w-full items-center justify-between gap-3 px-5 py-3 text-left",
                  disabled
                    ? "cursor-not-allowed bg-card text-muted-foreground"
                    : "bg-card text-foreground active:bg-secondary/80",
                )}
                disabled={disabled}
                key={candidate.appType}
                onClick={() => onSelect(candidate)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <MapAppMark candidate={candidate} disabled={disabled} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {candidate.label}
                    </span>
                    {hint ? (
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {hint}
                      </span>
                    ) : null}
                  </span>
                </span>
                {disabled ? (
                  <span className="shrink-0 text-xs leading-5 text-muted-foreground">
                    {getMapInstallLabel(candidate.status, labels)}
                  </span>
                ) : (
                  <span className="shrink-0 text-lg leading-none text-muted-foreground">›</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
