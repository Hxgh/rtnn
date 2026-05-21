"use client";

import {
  useMapNavigation,
  type NativeCoreMapCandidate,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { MapNavigationPicker } from "@/components/native-core";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";

type Messages = AppMessages["nativeCapabilities"];

const mapTarget = {
  lat: 31.2304,
  lng: 121.4737,
  name: "RTNN",
};

function getMapMessage(reason: string | null, messages: Messages) {
  if (!reason) {
    return null;
  }

  if (
    reason === "map-install-check-timeout" ||
    reason === "map-install-check-unavailable" ||
    reason === "native-bridge-not-ready"
  ) {
    return messages.mapCheckUnavailable;
  }

  if (reason === "map-app-not-installed-or-not-visible") {
    return messages.mapVisibilityLimited;
  }

  if (reason === "native-map-open-failed" || reason === "native-map-no-handler") {
    return messages.mapOpenFailed;
  }

  return messages.mapOpenFailed;
}

export function MapNavigationPanel({ messages }: { messages: Messages }) {
  const navigation = useMapNavigation({
    target: mapTarget,
  });
  const displayMessage = getMapMessage(navigation.reason, messages);

  function openMap(candidate: NativeCoreMapCandidate) {
    void navigation.openMap(candidate);
  }

  function openWebMap() {
    void navigation.openWebMap();
  }

  return (
    <div className="space-y-5">
      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.mapTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">
              {messages.mapDescription}
            </p>
          </div>
          <Button
            className="w-full"
            disabled={navigation.actionState !== "idle"}
            onClick={() => void navigation.detectMaps()}
            type="button"
          >
            {navigation.actionState === "checking"
              ? messages.checkingShort
              : navigation.actionState === "opening"
                ? messages.openingShort
                : messages.openMap}
          </Button>
        </div>
      </SurfaceCard>

      {displayMessage ? (
        <p className="break-words rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {displayMessage}
        </p>
      ) : null}

      {navigation.pickerOpen ? (
        <MapNavigationPicker
          candidates={navigation.candidates}
          labels={{
            checking: messages.mapChecking,
            checkingDescription: messages.mapPickerCheckingDescription,
            description: messages.mapPickerDescription,
            emptyDescription: messages.mapPickerEmptyDescription,
            failedDescription: messages.mapPickerFailedDescription,
            notInstalled: messages.mapNotInstalled,
            title: messages.mapPickerTitle,
            unavailable: messages.mapUnavailable,
            unsupported: messages.mapUnsupported,
            webFallback: messages.mapWebFallback,
          }}
          onClose={navigation.closePicker}
          onSelect={openMap}
          onWebFallback={openWebMap}
          state={navigation.pickerState}
        />
      ) : null}
    </div>
  );
}
