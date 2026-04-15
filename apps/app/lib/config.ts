import { APP_IDS, ENV_KEYS, PORTS } from "@rtnn/config";

export function getApiBaseUrl(): string {
  return (
    process.env[ENV_KEYS.backendBaseUrl] ?? `http://localhost:${PORTS.backend}`
  );
}

export function getAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME ?? APP_IDS.app;
}
