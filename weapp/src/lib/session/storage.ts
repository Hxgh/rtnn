import Taro from "@tarojs/taro"
import type { UserRole } from "@rtnn/shared-types"

type SessionSnapshot = {
  accessToken?: string
  refreshToken?: string
  userId?: string
  email?: string
  name?: string
  role?: UserRole
}

const ACCESS_TOKEN_KEY = "rtnn:session:access-token"
const REFRESH_TOKEN_KEY = "rtnn:session:refresh-token"
const USER_ID_KEY = "rtnn:session:user-id"
const EMAIL_KEY = "rtnn:session:email"
const NAME_KEY = "rtnn:session:name"
const ROLE_KEY = "rtnn:session:role"

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
    setValue(ACCESS_TOKEN_KEY, snapshot.accessToken)
    setValue(REFRESH_TOKEN_KEY, snapshot.refreshToken)
    setValue(USER_ID_KEY, snapshot.userId)
    setValue(EMAIL_KEY, snapshot.email)
    setValue(NAME_KEY, snapshot.name)
    setValue(ROLE_KEY, snapshot.role)
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
