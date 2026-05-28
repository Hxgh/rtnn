import { cache } from "react";
import { getRuntimeVersion, listClientDownloads } from "@/src/lib/api-client";

export const resolveReleaseOverview = cache(async () => {
  const [runtime, testingDownloads, productionDownloads] =
    await Promise.allSettled([
      getRuntimeVersion(),
      listClientDownloads({ channel: "testing" }),
      listClientDownloads({ channel: "production" }),
    ]);

  return {
    runtime: runtime.status === "fulfilled" ? runtime.value : null,
    testingDownloads:
      testingDownloads.status === "fulfilled" ? testingDownloads.value : [],
    productionDownloads:
      productionDownloads.status === "fulfilled"
        ? productionDownloads.value
        : [],
  };
});
