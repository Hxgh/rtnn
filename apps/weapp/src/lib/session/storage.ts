import Taro from "@tarojs/taro"
import type { UserRole } from "@rtnn/shared-types"
import { WEAPP_STORAGE_KEYS } from "@rtnn/config"

type SessionSnapshot = {
  accessToken?: string
  refreshToken?: string
  userId?: string
  email?: string
  name?: string
  role?: UserRole
}

const ACCESS_TOKEN_KEY = WEAPP_STORAGE_KEYS.accessToken
const REFRESH_TOKEN_KEY = WEAPP_STORAGE_KEYS.refreshToken
const USER_ID_KEY = WEAPP_STORAGE_KEYS.userId
const EMAIL_KEY = WEAPP_STORAGE_KEYS.email
const NAME_KEY = WEAPP_STORAGE_KEYS.name
const ROLE_KEY = WEAPP_STORAGE_KEYS.role

const getValue = (key: string) => {
  try {
    return Taro.getStorageSync<string>(key) || undefined
  } catch {
    return undefined
  }
}

const setValue = (key: string, value: string | undefined) => {
  if (!value) {
    Taro.removeStorageSync(key)
    return
  }
  Taro.setStorageSync(key, value)
}

export const sessionStorageAdapter = {
  read(): SessionSnapshot {
    return {
      accessToken: getValue(ACCESS_TOKEN_KEY),
      refreshToken: getValue(REFRESH_TOKEN_KEY),
      userId: getValue(USER_ID_KEY),
      email: getValue(EMAIL_KEY),
      name: getValue(NAME_KEY),
      role: getValue(ROLE_KEY) as UserRole | undefined
    }
  },
  write(snapshot: SessionSnapshot) {
    const existing = sessionStorageAdapter.read()
    const merged: SessionSnapshot = { ...existing, ...snapshot }
    setValue(ACCESS_TOKEN_KEY, merged.accessToken)
    setValue(REFRESH_TOKEN_KEY, merged.refreshToken)
    setValue(USER_ID_KEY, merged.userId)
    setValue(EMAIL_KEY, merged.email)
    setValue(NAME_KEY, merged.name)
    setValue(ROLE_KEY, merged.role)
  },
  clear() {
    Taro.removeStorageSync(ACCESS_TOKEN_KEY)
    Taro.removeStorageSync(REFRESH_TOKEN_KEY)
    Taro.removeStorageSync(USER_ID_KEY)
    Taro.removeStorageSync(EMAIL_KEY)
    Taro.removeStorageSync(NAME_KEY)
    Taro.removeStorageSync(ROLE_KEY)
  }
}

export type { SessionSnapshot }
