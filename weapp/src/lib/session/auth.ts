import type { CustomerLoginResult, CustomerMeResult } from "@rtnn/api-sdk"
import { sessionStorageAdapter } from "./storage"

export const authSession = {
  isLoggedIn() {
    const session = sessionStorageAdapter.read()
    return Boolean(session.accessToken && session.refreshToken)
  },
  getSnapshot() {
    return sessionStorageAdapter.read()
  },
  getAccessToken() {
    return sessionStorageAdapter.read().accessToken
  },
  getRefreshToken() {
    return sessionStorageAdapter.read().refreshToken
  },
  applySession(payload: CustomerLoginResult) {
    sessionStorageAdapter.write({
      accessToken: payload.tokens.accessToken,
      refreshToken: payload.tokens.refreshToken,
      userId: payload.user.id,
      email: payload.user.email,
      name: payload.user.name,
      role: payload.user.roles[0]
    })
  },
  toMeResponse(): CustomerMeResult | null {
    const snapshot = sessionStorageAdapter.read()
    if (!snapshot.userId || !snapshot.email || !snapshot.name || !snapshot.role) {
      return null
    }
    return {
      user: {
        id: snapshot.userId,
        email: snapshot.email,
        name: snapshot.name,
        audience: "customer",
        roles: [snapshot.role],
        permissions: ["customer:self:view"]
      }
    }
  },
  logout() {
    sessionStorageAdapter.clear()
  }
}
