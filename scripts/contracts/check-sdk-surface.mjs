import { readFileSync } from "node:fs";

const openApiPath = "apps/backend/openapi.json";
const endpointsModulePath = "packages/api-sdk/src/endpoints.ts";
const clientModulePath = "packages/api-sdk/src/client.ts";

function endpointKey(method, path) {
  return `${method.toUpperCase()} ${path}`;
}

function readOpenApiEndpoints() {
  const document = JSON.parse(readFileSync(openApiPath, "utf8"));
  const endpoints = [];
  for (const [path, operations] of Object.entries(document.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      if (operations?.[method]) {
        endpoints.push({
          method: method.toUpperCase(),
          path,
        });
      }
    }
  }
  return endpoints.sort((a, b) =>
    endpointKey(a.method, a.path).localeCompare(endpointKey(b.method, b.path)),
  );
}

function readManifestArray(content, exportName) {
  const exportIndex = content.indexOf(`export const ${exportName}`);
  if (exportIndex < 0) {
    console.error(`Missing SDK surface export: ${exportName}`);
    process.exit(1);
  }
  const arrayStart = content.indexOf("[", exportIndex);
  const arrayEnd = content.indexOf("] as const", arrayStart);
  if (arrayStart < 0 || arrayEnd < 0) {
    console.error(`Could not read SDK surface export: ${exportName}`);
    process.exit(1);
  }
  return content.slice(arrayStart, arrayEnd);
}

function readEndpointManifest() {
  const content = readFileSync(endpointsModulePath, "utf8");
  const surfaceBlock = readManifestArray(content, "API_SDK_ENDPOINT_SURFACE");
  const unwrappedBlock = readManifestArray(
    content,
    "INTENTIONALLY_UNWRAPPED_OPENAPI_ENDPOINTS",
  );
  const endpointPattern =
    /method:\s*["'](?<method>GET|POST|PUT|PATCH|DELETE)["']\s*,\s*path:\s*["'](?<path>[^"']+)["']\s*,\s*sdk:\s*["'](?<sdk>[^"']+)["']/g;
  const unwrappedPattern =
    /method:\s*["'](?<method>GET|POST|PUT|PATCH|DELETE)["']\s*,\s*path:\s*["'](?<path>[^"']+)["']\s*,\s*reason:\s*["'](?<reason>[^"']+)["']/g;
  return {
    wrapped: [...surfaceBlock.matchAll(endpointPattern)].map((match) => ({
      method: match.groups.method,
      path: match.groups.path,
      sdk: match.groups.sdk,
    })),
    unwrapped: [...unwrappedBlock.matchAll(unwrappedPattern)].map((match) => ({
      method: match.groups.method,
      path: match.groups.path,
      reason: match.groups.reason,
    })),
  };
}

function readClientTransportMappings() {
  const content = readFileSync(clientModulePath, "utf8");
  const requestPattern =
    /method:\s*["'](?<method>GET|POST|PUT|PATCH|DELETE)["']\s*,\s*path:\s*(?<pathExpression>[\s\S]*?)(?=,\s*(?:body|query)\b|\s*\}\s*\))/g;
  return [...content.matchAll(requestPattern)]
    .map((match) => {
      const pathMatch = match.groups.pathExpression.match(
        /["'](?<path>\/(?:api\/v1|healthz|readyz|version)[^"']*)["']/,
      );
      return pathMatch
        ? {
            method: match.groups.method,
            path: pathMatch.groups.path,
          }
        : null;
    })
    .filter(Boolean);
}

function assertNoDuplicates(entries, label) {
  const seen = new Map();
  for (const entry of entries) {
    const key = endpointKey(entry.method, entry.path);
    const existing = seen.get(key);
    if (existing) {
      console.error(`${label} duplicate: ${key}`);
      process.exit(1);
    }
    seen.set(key, entry);
  }
  return seen;
}

function assertSdkNamesAreUnique(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const existing = seen.get(entry.sdk);
    if (existing) {
      console.error(
        `SDK method is mapped to multiple endpoints: ${entry.sdk} (${endpointKey(existing.method, existing.path)} and ${endpointKey(entry.method, entry.path)})`,
      );
      process.exit(1);
    }
    seen.set(entry.sdk, entry);
  }
}

const openApiEndpoints = readOpenApiEndpoints();
const manifest = readEndpointManifest();
const clientMappings = readClientTransportMappings();

assertSdkNamesAreUnique(manifest.wrapped);
const wrappedKeys = assertNoDuplicates(
  manifest.wrapped,
  "SDK endpoint surface",
);
const unwrappedKeys = assertNoDuplicates(
  manifest.unwrapped,
  "Intentionally unwrapped endpoint surface",
);
const clientKeys = assertNoDuplicates(clientMappings, "SDK client transport");

for (const key of wrappedKeys.keys()) {
  if (unwrappedKeys.has(key)) {
    console.error(`Endpoint cannot be both wrapped and unwrapped: ${key}`);
    process.exit(1);
  }
}

const openApiKeys = new Set(
  openApiEndpoints.map((entry) => endpointKey(entry.method, entry.path)),
);
const missing = openApiEndpoints.filter((entry) => {
  const key = endpointKey(entry.method, entry.path);
  return !wrappedKeys.has(key) && !unwrappedKeys.has(key);
});
const staleWrapped = [...wrappedKeys.keys()].filter(
  (key) => !openApiKeys.has(key),
);
const staleUnwrapped = [...unwrappedKeys.keys()].filter(
  (key) => !openApiKeys.has(key),
);
const missingClientMappings = manifest.wrapped.filter(
  (entry) => !clientKeys.has(endpointKey(entry.method, entry.path)),
);
const extraClientMappings = [...clientKeys.keys()].filter(
  (key) => !wrappedKeys.has(key),
);

if (
  missing.length > 0 ||
  staleWrapped.length > 0 ||
  staleUnwrapped.length > 0 ||
  missingClientMappings.length > 0 ||
  extraClientMappings.length > 0
) {
  if (missing.length > 0) {
    console.error(
      "\nOpenAPI endpoints are missing from the SDK surface manifest:",
    );
    for (const entry of missing) {
      console.error(`- ${endpointKey(entry.method, entry.path)}`);
    }
  }
  if (staleWrapped.length > 0) {
    console.error(
      "\nSDK surface manifest contains wrapped endpoints that are not in OpenAPI:",
    );
    for (const key of staleWrapped) {
      console.error(`- ${key}`);
    }
  }
  if (staleUnwrapped.length > 0) {
    console.error(
      "\nSDK surface manifest contains unwrapped endpoints that are not in OpenAPI:",
    );
    for (const key of staleUnwrapped) {
      console.error(`- ${key}`);
    }
  }
  if (missingClientMappings.length > 0) {
    console.error(
      "\nSDK surface manifest entries are missing from packages/api-sdk/src/client.ts:",
    );
    for (const entry of missingClientMappings) {
      console.error(`- ${entry.sdk}: ${endpointKey(entry.method, entry.path)}`);
    }
  }
  if (extraClientMappings.length > 0) {
    console.error(
      "\npackages/api-sdk/src/client.ts contains endpoint mappings that are missing from the SDK surface manifest:",
    );
    for (const key of extraClientMappings) {
      console.error(`- ${key}`);
    }
  }
  console.error(
    "\nUpdate packages/api-sdk/src/endpoints.ts and packages/api-sdk/src/client.ts together, or intentionally mark internal endpoints as unwrapped.\n",
  );
  process.exit(1);
}

console.log("SDK endpoint surface check passed");
