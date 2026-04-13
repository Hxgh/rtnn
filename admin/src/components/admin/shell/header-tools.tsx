"use client";

import { Fragment } from "react";
import type { ReactElement } from "react";
import {
  FullscreenControl,
  LocaleControl,
  ThemeControl,
  useFullscreenState,
} from "@/src/components/admin/preference-controls";
import { Separator } from "@/src/components/ui/separator";
import type { AdminDictionary } from "@/src/i18n/dictionaries";

export function HeaderTools({
  dictionary,
}: {
  dictionary: Pick<AdminDictionary, "common">;
}) {
  const { isFullscreenSupported } = useFullscreenState(dictionary.common);

  const groups = [
    isFullscreenSupported
      ? [<FullscreenControl key="fullscreen" dictionary={dictionary.common} />]
      : null,
    [
      <ThemeControl key="theme" dictionary={dictionary.common} />,
      <LocaleControl key="locale" dictionary={dictionary.common} />,
    ],
  ].filter((group): group is ReactElement[] => Boolean(group));

  return (
    <div className="flex items-center gap-1">
      {groups.map((group, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <Separator orientation="vertical" className="mx-1 hidden !h-4 md:block" />
          ) : null}
          <div className="flex items-center gap-1">{group}</div>
        </Fragment>
      ))}
    </div>
  );
}
