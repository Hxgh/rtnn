import { readProjectMetadata } from "./project-metadata.mjs";

export const SERVICE_TARGETS = Object.freeze([
  "backend",
  "admin",
  "app",
  "weapp",
]);

export const RELEASE_EXECUTION_MODES = Object.freeze([
  "server-local",
  "github-hosted",
]);

export const CLIENT_TARGETS = Object.freeze({
  adminDesktop: Object.freeze(["macos", "windows"]),
  appMobile: Object.freeze(["android", "ios"]),
});

export const CLIENT_TARGET_EXECUTION = Object.freeze({
  android: Object.freeze({
    defaultEnabled: true,
    defaultMode: "server-local",
    allowedModes: Object.freeze(["server-local", "github-hosted"]),
    runners: Object.freeze({
      "server-local": "self-hosted",
      "github-hosted": "ubuntu-latest",
    }),
  }),
  macos: Object.freeze({
    defaultEnabled: false,
    defaultMode: "github-hosted",
    allowedModes: Object.freeze(["github-hosted"]),
    runners: Object.freeze({
      "github-hosted": "macos-latest",
    }),
  }),
  windows: Object.freeze({
    defaultEnabled: false,
    defaultMode: "github-hosted",
    allowedModes: Object.freeze(["github-hosted"]),
    runners: Object.freeze({
      "github-hosted": "windows-latest",
    }),
  }),
  ios: Object.freeze({
    defaultEnabled: false,
    defaultMode: "github-hosted",
    allowedModes: Object.freeze(["github-hosted"]),
    runners: Object.freeze({
      "github-hosted": "macos-latest",
    }),
  }),
});

export const CLIENT_NAMES = Object.freeze(Object.keys(CLIENT_TARGETS));
const CLIENT_PLATFORM_TARGETS = Object.freeze(Object.keys(CLIENT_TARGET_EXECUTION));

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

function normalizeUrl(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `https://${normalized}`;
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

function normalizeMode(value, fallback, warnings, fieldPath) {
  const normalized = normalizeString(value, fallback);
  if (RELEASE_EXECUTION_MODES.includes(normalized)) {
    return normalized;
  }

  warnings.push(`${fieldPath} 包含未知执行模式: ${normalized}，已回退到 ${fallback}`);
  return fallback;
}

function normalizeModeList(value, fallback, warnings, fieldPath) {
  if (!Array.isArray(value) || value.length === 0) {
    return [...fallback];
  }

  const modes = [
    ...new Set(
      value.map((item) => String(item ?? "").trim()).filter(Boolean),
    ),
  ];
  const known = modes.filter((mode) => RELEASE_EXECUTION_MODES.includes(mode));
  const unknown = modes.filter((mode) => !RELEASE_EXECUTION_MODES.includes(mode));

  for (const mode of unknown) {
    warnings.push(`${fieldPath} 包含未知执行模式: ${mode}`);
  }

  return known.length > 0 ? known : [...fallback];
}

function normalizeRequestedClientTargets(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(item)).filter(Boolean);
  }

  return normalizeString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function targetExplicitlyRequested(requestedTargets, clientName, target) {
  return requestedTargets.some(
    (item) => item === target || item === `${clientName}:${target}`,
  );
}

function resolveDelivery(metadata) {
  const delivery = isPlainObject(metadata?.delivery) ? metadata.delivery : {};
  return {
    services: isPlainObject(delivery.services) ? delivery.services : {},
    clients: isPlainObject(delivery.clients) ? delivery.clients : {},
    configured: isPlainObject(metadata?.delivery),
  };
}

function resolveReleaseExecution(metadata, options, warnings) {
  const raw = isPlainObject(metadata?.releaseExecution)
    ? metadata.releaseExecution
    : {};
  const rawGithubHosted = isPlainObject(raw.githubHosted)
    ? raw.githubHosted
    : {};
  const rawClientBuild = isPlainObject(raw.clientBuild) ? raw.clientBuild : {};
  const rawTargetConfigs = isPlainObject(rawClientBuild.targets)
    ? rawClientBuild.targets
    : {};
  const defaultMode = normalizeMode(
    raw.defaultMode,
    "server-local",
    warnings,
    "releaseExecution.defaultMode",
  );
  const allowedModes = normalizeModeList(
    raw.allowedModes,
    ["server-local", "github-hosted"],
    warnings,
    "releaseExecution.allowedModes",
  );
  const requestedMode = options.releaseExecutionMode
    ? normalizeMode(
        options.releaseExecutionMode,
        defaultMode,
        warnings,
        "profile.releaseExecutionMode",
      )
    : defaultMode;
  const effectiveMode = allowedModes.includes(requestedMode)
    ? requestedMode
    : defaultMode;

  if (!allowedModes.includes(requestedMode)) {
    warnings.push(
      `releaseExecution.allowedModes 未包含请求执行模式 ${requestedMode}，已回退到 ${defaultMode}`,
    );
  }

  const targets = {};
  for (const target of CLIENT_PLATFORM_TARGETS) {
    const spec = CLIENT_TARGET_EXECUTION[target];
    const targetConfig = isPlainObject(rawTargetConfigs[target])
      ? rawTargetConfigs[target]
      : {};
    const targetDefaultMode = normalizeMode(
      targetConfig.defaultMode,
      spec.defaultMode,
      warnings,
      `releaseExecution.clientBuild.targets.${target}.defaultMode`,
    );
    const targetAllowedModes = normalizeModeList(
      targetConfig.allowedModes,
      spec.allowedModes,
      warnings,
      `releaseExecution.clientBuild.targets.${target}.allowedModes`,
    );

    targets[target] = {
      enabled: normalizeBoolean(targetConfig.enabled, spec.defaultEnabled),
      defaultMode: targetDefaultMode,
      allowedModes: targetAllowedModes,
    };
  }

  return {
    defaultMode,
    allowedModes,
    requestedMode,
    effectiveMode,
    githubHosted: {
      enabled: normalizeBoolean(rawGithubHosted.enabled, false),
      requiresExplicitOptIn: normalizeBoolean(
        rawGithubHosted.requiresExplicitOptIn,
        true,
      ),
    },
    clientBuild: {
      defaultTrigger: normalizeString(rawClientBuild.defaultTrigger, "manual"),
      targets,
    },
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

function resolveClientTargetProfile(
  clientName,
  target,
  releaseExecution,
  profileOptions,
) {
  const targetExecution = CLIENT_TARGET_EXECUTION[target];
  const targetConfig = releaseExecution.clientBuild.targets[target];
  const explicitlyRequested = targetExplicitlyRequested(
    profileOptions.requestedClientTargets,
    clientName,
    target,
  );
  const targetFilterActive = profileOptions.requestedClientTargets.length > 0;
  const targetEnabled = explicitlyRequested ? true : targetConfig.enabled;
  const preferredMode = profileOptions.releaseExecutionMode
    ? releaseExecution.effectiveMode
    : targetConfig.defaultMode;
  const githubHostedExplicit =
    profileOptions.allowGithubHosted ||
    releaseExecution.githubHosted.enabled ||
    !releaseExecution.githubHosted.requiresExplicitOptIn;

  if (targetFilterActive && !explicitlyRequested) {
    return {
      enabled: false,
      reason: "not-requested-client-target",
      executionMode: preferredMode,
      runner: "",
      runnerKind: "",
    };
  }

  if (!targetEnabled) {
    return {
      enabled: false,
      reason: explicitlyRequested
        ? "requested-target-disabled"
        : "releaseExecution.clientBuild.targets.enabled=false",
      executionMode: preferredMode,
      runner: "",
      runnerKind: "",
    };
  }

  if (!releaseExecution.allowedModes.includes(preferredMode)) {
    return {
      enabled: false,
      reason: `releaseExecution.allowedModes 不允许 ${preferredMode}`,
      executionMode: preferredMode,
      runner: "",
      runnerKind: "",
    };
  }

  if (!targetConfig.allowedModes.includes(preferredMode)) {
    return {
      enabled: false,
      reason: `${target} 不支持 ${preferredMode}`,
      executionMode: preferredMode,
      runner: "",
      runnerKind: "",
    };
  }

  if (preferredMode === "github-hosted" && !githubHostedExplicit) {
    return {
      enabled: false,
      reason: "github-hosted-requires-explicit-opt-in",
      executionMode: preferredMode,
      runner: "",
      runnerKind: "",
    };
  }

  const runner = targetExecution.runners[preferredMode];
  if (!runner) {
    return {
      enabled: false,
      reason: `${target} 缺少 ${preferredMode} runner`,
      executionMode: preferredMode,
      runner: "",
      runnerKind: "",
    };
  }

  return {
    enabled: true,
    reason: explicitlyRequested
      ? "explicit-client-target"
      : "releaseExecution-client-target-enabled",
    executionMode: preferredMode,
    runner,
    runnerKind:
      preferredMode === "github-hosted" ? "github-hosted" : "self-hosted",
  };
}

function resolveClientProfile(
  clientName,
  clientConfig,
  releaseExecution,
  profileOptions,
  warnings,
) {
  const config = isPlainObject(clientConfig) ? clientConfig : {};
  const rawEnabled = isPlainObject(clientConfig)
    ? config.enabled
    : clientConfig;
  const enabled = normalizeBoolean(rawEnabled, false);
  const defaultTargets = CLIENT_TARGETS[clientName];
  const requestedTargets = enabled
    ? normalizeTargetList(
        config.targets,
        defaultTargets,
        warnings,
        `delivery.clients.${clientName}.targets`,
      )
    : [];
  const targetProfiles = {};
  const targets = [];

  for (const target of requestedTargets) {
    const targetProfile = resolveClientTargetProfile(
      clientName,
      target,
      releaseExecution,
      profileOptions,
    );
    targetProfiles[target] = targetProfile;

    if (targetProfile.enabled) {
      targets.push(target);
    }
  }

  return {
    enabled,
    reason: enabled ? "delivery.clients.enabled=true" : "disabled-by-default",
    requestedTargets,
    targets,
    targetProfiles,
    webUrl: enabled ? normalizeUrl(config.webUrl) : "",
    webUrls: enabled
      ? Object.fromEntries(
          Object.entries(normalizeStringMap(config.webUrls)).map(([key, value]) => [
            key,
            normalizeUrl(value),
          ]),
        )
      : {},
    channel: enabled ? normalizeString(config.channel, "production") : "",
  };
}

export function buildProjectProfile(metadata = null, options = {}) {
  const warnings = [];
  const delivery = resolveDelivery(metadata);
  const profileOptions = {
    releaseExecutionMode: normalizeString(options.releaseExecutionMode),
    allowGithubHosted: normalizeBoolean(options.allowGithubHosted, false),
    requestedClientTargets: normalizeRequestedClientTargets(
      options.requestedClientTargets ?? options.clientTargets,
    ),
  };
  const releaseExecution = resolveReleaseExecution(
    metadata,
    profileOptions,
    warnings,
  );
  const projectRole = normalizeString(metadata?.project?.role, "template-source");
  const services = {};
  const clients = {};
  const disabledReasons = {
    services: {},
    clients: {},
    clientTargets: {},
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
      releaseExecution,
      profileOptions,
      warnings,
    );
    clients[clientName] = client;

    if (!client.enabled) {
      disabledReasons.clients[clientName] = client.reason;
    }

    for (const [target, targetProfile] of Object.entries(
      client.targetProfiles,
    )) {
      if (!targetProfile.enabled) {
        disabledReasons.clientTargets[`${clientName}:${target}`] =
          targetProfile.reason;
      }
    }
  }

  const enabledServices = SERVICE_TARGETS.filter(
    (serviceName) => services[serviceName].enabled,
  );
  const enabledClients = CLIENT_NAMES.filter(
    (clientName) => clients[clientName].enabled,
  );
  const enabledClientBuildTargets = enabledClients.flatMap((clientName) =>
    clients[clientName].targets.map((target) => {
      const targetProfile = clients[clientName].targetProfiles[target];
      return {
        client: clientName,
        target,
        executionMode: targetProfile.executionMode,
        runner: targetProfile.runner,
        runnerKind: targetProfile.runnerKind,
      };
    }),
  );

  return {
    schemaVersion: "rtnn.project-profile.v1",
    source: metadata ? "project-metadata" : "template-default",
    deliveryConfigured: delivery.configured,
    releaseExecution,
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

export function resolveProjectProfile(rootDir, options = {}) {
  return buildProjectProfile(readProjectMetadata(rootDir), options);
}
