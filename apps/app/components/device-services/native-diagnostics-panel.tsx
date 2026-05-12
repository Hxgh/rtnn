"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createAppNativeCore,
  type NativeCoreClientInfo,
  type NativeCoreMapCandidate,
  type NativeCorePermissionKind,
  type NativeCorePermissionResult,
  type NativeCoreService,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/card";

type Messages = AppMessages["nativeCapabilities"];
type VisiblePermissionKind = Extract<
  NativeCorePermissionKind,
  "photo-library" | "camera" | "notification"
>;
type RuntimeSnapshot = {
  clientInfo: NativeCoreClientInfo;
  capabilities: Record<string, boolean>;
};

const permissionKinds: VisiblePermissionKind[] = [
  "photo-library",
  "camera",
  "notification",
];
const emptyPermissions: Record<
  VisiblePermissionKind,
  NativeCorePermissionResult | null
> = {
  "photo-library": null,
  camera: null,
  notification: null,
};

function getPermissionLabel(kind: VisiblePermissionKind, messages: Messages) {
  if (kind === "photo-library") {
    return messages.photoPermission;
  }

  if (kind === "camera") {
    return messages.cameraPermission;
  }

  return messages.notificationPermission;
}

function getPermissionStatusLabel(
  result: NativeCorePermissionResult | null,
  messages: Messages,
) {
  if (result?.reason === "permission-managed-by-file-picker") {
    return messages.permissionActionDriven;
  }

  if (!result) {
    return messages.permissionUnknown;
  }

  if (result.status === "granted") {
    return messages.permissionGranted;
  }

  if (result.status === "denied") {
    return messages.permissionDenied;
  }

  if (result.status === "prompt") {
    return messages.permissionPrompt;
  }

  if (result.status === "unsupported") {
    return messages.permissionUnsupported;
  }

  return messages.permissionUnknown;
}

export function NativeDiagnosticsPanel({ messages }: { messages: Messages }) {
  const nativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [permissions, setPermissions] =
    useState<Record<VisiblePermissionKind, NativeCorePermissionResult | null>>(
      emptyPermissions,
    );
  const [mapCandidates, setMapCandidates] = useState<NativeCoreMapCandidate[]>([]);

  useEffect(() => {
    let active = true;

    nativeCore
      .getRuntimeSnapshot()
      .then((nextSnapshot) => {
        if (active) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch(() => {});

    nativeCore
      .getMapCandidates()
      .then((candidates) => {
        if (active) {
          setMapCandidates(candidates);
        }
      })
      .catch(() => {});

    nativeCore
      .checkPermissions(permissionKinds)
      .then((nextPermissions) => {
        if (active) {
          setPermissions((current) => ({
            ...current,
            ...nextPermissions,
          }));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [nativeCore]);

  async function handleRequestPermission(kind: VisiblePermissionKind) {
    setLastMessage(null);

    try {
      const result = await nativeCore.requestPermission(kind);

      setPermissions((current) => ({
        ...current,
        [kind]: result,
      }));
      setLastMessage(result.message ?? result.reason ?? messages.permissionRequestDone);
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
    }
  }

  const clientInfo = snapshot?.clientInfo;
  const capabilityText = snapshot
    ? Object.entries(snapshot.capabilities)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
        .join(", ") || "-"
    : "-";

  return (
    <div className="space-y-5">
      <SurfaceCard className="overflow-hidden">
        <div className="space-y-3 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.runtimeTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.runtimeDescription}</p>
          </div>
          <dl className="grid gap-2 text-xs">
            <div className="grid grid-cols-[5.5rem_1fr] gap-3">
              <dt className="text-muted-foreground">{messages.runtime}</dt>
              <dd className="text-foreground">{clientInfo?.runtime ?? "-"}</dd>
            </div>
            <div className="grid grid-cols-[5.5rem_1fr] gap-3">
              <dt className="text-muted-foreground">{messages.platform}</dt>
              <dd className="text-foreground">{clientInfo?.platform ?? "-"}</dd>
            </div>
            <div className="grid grid-cols-[5.5rem_1fr] gap-3">
              <dt className="text-muted-foreground">{messages.shell}</dt>
              <dd className="text-foreground">{clientInfo?.shell ?? "-"}</dd>
            </div>
            <div className="grid grid-cols-[5.5rem_1fr] gap-3">
              <dt className="text-muted-foreground">{messages.features}</dt>
              <dd className="break-words text-foreground">{capabilityText}</dd>
            </div>
          </dl>
          {clientInfo?.runtime === "browser" ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
              {messages.unavailable}
            </p>
          ) : null}
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.permissions}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.permissionDescription}</p>
          </div>
          <dl className="grid gap-2 text-xs">
            {permissionKinds.map((kind) => (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-border/70 px-3 py-3"
                key={kind}
              >
                <div className="min-w-0">
                  <dt className="text-muted-foreground">
                    {getPermissionLabel(kind, messages)}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {getPermissionStatusLabel(permissions[kind], messages)}
                  </dd>
                </div>
                <Button
                  onClick={() => handleRequestPermission(kind)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {messages.requestPermission}
                </Button>
              </div>
            ))}
          </dl>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.mapDetected}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.mapDiagnosticDescription}</p>
          </div>
          <dl className="grid gap-2 text-xs">
            {mapCandidates.map((candidate) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-border/70 px-3 py-3"
                key={candidate.appType}
              >
                <dt className="font-medium text-foreground">{candidate.label}</dt>
                <dd className="text-muted-foreground">{candidate.status}</dd>
              </div>
            ))}
          </dl>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.keyboardTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.keyboardDescription}</p>
          </div>
          <Input
            id="native-keyboard-check"
            inputMode="text"
            placeholder={messages.keyboardPlaceholder}
          />
        </div>
      </SurfaceCard>

      {lastMessage ? (
        <p className="break-words rounded-lg bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {lastMessage}
        </p>
      ) : null}
    </div>
  );
}
