import type { CustomerLoginResult, CustomerMeResult } from "@rtnn/api-sdk"
import { getSdkClient } from "../sdk/client"
import { sessionStorageAdapter } from "./storage"

function resolveStatus(error: unknown) {
  if (typeof error === "object" && error && "status" in error) {
    const status = Number((error as { status?: unknown }).status)
    return Number.isFinite(status) ? status : null
  }

  return null
}

function syncUser(response: CustomerMeResult) {
  sessionStorageAdapter.write({
    userId: response.user.id,
    email: response.user.email,
    name: response.user.name,
    role: response.user.roles[0]
  })
}

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
  syncMe(response: CustomerMeResult) {
    syncUser(response)
  },
  async restoreSession(): Promise<CustomerMeResult | null> {
    const snapshot = sessionStorageAdapter.read()
    if (!snapshot.accessToken && !snapshot.refreshToken) {
      return null
    }

    const client = getSdkClient()

    try {
      const me = await client.auth.customer.me()
      syncUser(me)
      return me
    } catch (error) {
      const status = resolveStatus(error)
      if (status !== 401) {
        throw error
      }

      if (!snapshot.refreshToken) {
        this.logout()
        return null
      }
    }

    try {
      const refreshed = await client.auth.customer.refresh({
        refreshToken: snapshot.refreshToken
      })
      this.applySession(refreshed)
      const me = await client.auth.customer.me()
      syncUser(me)
      return me
    } catch (error) {
      const status = resolveStatus(error)
      if (status === 401 || status === 403) {
        this.logout()
        return null
      }

      throw error
    }
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
