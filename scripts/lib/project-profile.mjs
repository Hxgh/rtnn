import { readProjectMetadata } from "./project-metadata.mjs";

export const SERVICE_TARGETS = Object.freeze([
  "backend",
  "admin",
  "app",
  "weapp",
]);

export const CLIENT_TARGETS = Object.freeze({
  adminDesktop: Object.freeze(["macos", "windows"]),
  appMobile: Object.freeze(["android", "ios"]),
});

export const CLIENT_NAMES = Object.freeze(Object.keys(CLIENT_TARGETS));

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeStringMap(value) {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [normalizeString(key), normalizeString(item)])
      .filter(([key, item]) => key && item),
  );
}

function normalizeTargetList(value, defaults, warnings, fieldPath) {
  if (!Array.isArray(value) || value.length === 0) {
    return [...defaults];
  }

  const requested = [
    ...new Set(
      value.map((item) => String(item ?? "").trim()).filter(Boolean),
    ),
  ];
  const known = requested.filter((item) => defaults.includes(item));
  const unknown = requested.filter((item) => !defaults.includes(item));

  for (const target of unknown) {
    warnings.push(`${fieldPath} 包含未知目标: ${target}`);
  }

  if (known.length === 0) {
    warnings.push(`${fieldPath} 未包含有效目标，已回退到默认目标`);
    return [...defaults];
  }

  return known;
}

function resolveDelivery(metadata) {
  const delivery = isPlainObject(metadata?.delivery) ? metadata.delivery : {};
  return {
    services: isPlainObject(delivery.services) ? delivery.services : {},
    clients: isPlainObject(delivery.clients) ? delivery.clients : {},
    configured: isPlainObject(metadata?.delivery),
  };
}

function resolveServiceProfile(serviceName, serviceConfig, warnings) {
  const config = isPlainObject(serviceConfig) ? serviceConfig : {};
  const rawEnabled = isPlainObject(serviceConfig)
    ? config.enabled
    : serviceConfig;
  let enabled = normalizeBoolean(rawEnabled, true);
  let reason = enabled
    ? "enabled-by-default"
    : "delivery.services.enabled=false";

  if (serviceName === "backend" && !enabled) {
    enabled = true;
    reason = "backend-required";
    warnings.push(
      "delivery.services.backend.enabled=false 暂不支持，backend 已按核心契约源保持启用",
    );
  }

  return {
    enabled,
    reason,
  };
}

function resolveClientProfile(clientName, clientConfig, warnings) {
  const config = isPlainObject(clientConfig) ? clientConfig : {};
  const rawEnabled = isPlainObject(clientConfig)
    ? config.enabled
    : clientConfig;
  const enabled = normalizeBoolean(rawEnabled, false);
  const defaultTargets = CLIENT_TARGETS[clientName];
  const targets = enabled
    ? normalizeTargetList(
        config.targets,
        defaultTargets,
        warnings,
        `delivery.clients.${clientName}.targets`,
      )
    : [];

  return {
    enabled,
    reason: enabled ? "delivery.clients.enabled=true" : "disabled-by-default",
    targets,
    webUrl: enabled ? normalizeString(config.webUrl) : "",
    webUrls: enabled ? normalizeStringMap(config.webUrls) : {},
    channel: enabled ? normalizeString(config.channel, "production") : "",
  };
}

export function buildProjectProfile(metadata = null) {
  const warnings = [];
  const delivery = resolveDelivery(metadata);
  const projectRole = normalizeString(metadata?.project?.role, "template-source");
  const services = {};
  const clients = {};
  const disabledReasons = {
    services: {},
    clients: {},
  };

  for (const serviceName of SERVICE_TARGETS) {
    const service = resolveServiceProfile(
      serviceName,
      delivery.services[serviceName],
      warnings,
    );
    services[serviceName] = service;

    if (!service.enabled) {
      disabledReasons.services[serviceName] = service.reason;
    }
  }

  for (const clientName of CLIENT_NAMES) {
    const client = resolveClientProfile(
      clientName,
      delivery.clients[clientName],
      warnings,
    );
    clients[clientName] = client;

    if (!client.enabled) {
      disabledReasons.clients[clientName] = client.reason;
    }
  }

  const enabledServices = SERVICE_TARGETS.filter(
    (serviceName) => services[serviceName].enabled,
  );
  const enabledClients = CLIENT_NAMES.filter(
    (clientName) => clients[clientName].enabled,
  );
  const enabledClientBuildTargets = enabledClients.flatMap((clientName) =>
    clients[clientName].targets.map((target) => ({
      client: clientName,
      target,
    })),
  );

  return {
    schemaVersion: "rtnn.project-profile.v1",
    source: metadata ? "project-metadata" : "template-default",
    deliveryConfigured: delivery.configured,
    projectRole,
    isBusinessSource: projectRole === "business-source",
    services,
    clients,
    enabledServices,
    disabledServices: SERVICE_TARGETS.filter(
      (serviceName) => !services[serviceName].enabled,
    ),
    enabledClients,
    disabledClients: CLIENT_NAMES.filter(
      (clientName) => !clients[clientName].enabled,
    ),
    enabledImageTargets: [...enabledServices],
    enabledSmokeTargets: [...enabledServices],
    enabledClientBuildTargets,
    disabledReasons,
    warnings,
  };
}

export function resolveProjectProfile(rootDir) {
  return buildProjectProfile(readProjectMetadata(rootDir));
}
