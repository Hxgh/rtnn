type WeappRuntimeConfig = {
  TARO_APP_API_BASE_URL?: string
}

type RuntimeConfigHost = typeof globalThis & {
  __RTNN_RUNTIME_CONFIG__?: WeappRuntimeConfig
}

const runtimeHost = globalThis as RuntimeConfigHost

export const readWeappRuntimeConfig = (
  key: keyof WeappRuntimeConfig,
): string | undefined => {
  const value = runtimeHost.__RTNN_RUNTIME_CONFIG__?.[key]
  if (typeof value !== "string") {
    return undefined
  }

  const normalizedValue = value.trim()
  return normalizedValue || undefined
}
