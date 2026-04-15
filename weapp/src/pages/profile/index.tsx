import { Navigator, Text, View } from "@tarojs/components"
import { useDidShow } from "@tarojs/taro"
import type { CustomerMeResult } from "@rtnn/api-sdk"
import { TEMPLATE_DISPLAY } from "@rtnn/config"
import { useState } from "react"
import { relaunchToLogin } from "../../lib/navigation"
import { getSdkClient } from "../../lib/sdk/client"
import { authSession } from "../../lib/session/auth"
import "./index.css"

type ProfileState =
  | {
      status: "loading"
    }
  | {
      status: "guest"
      message: string
    }
  | {
      status: "error"
      message: string
    }
  | {
      status: "authenticated"
      profile: CustomerMeResult["user"]
    }

export default function ProfilePage() {
  const [state, setState] = useState<ProfileState>({
    status: "loading"
  })

  useDidShow(() => {
    setState({ status: "loading" })

    authSession
      .restoreSession()
      .then((result) => {
        if (!result) {
          setState({
            status: "guest",
            message: "当前未登录，请先建立当前设备会话。"
          })
          return
        }

        setState({
          status: "authenticated",
          profile: result.user
        })
      })
      .catch(() => {
        setState({
          status: "error",
          message: "读取账户信息失败，请稍后重试。"
        })
      })
  })

  const handleLogout = async () => {
    const refreshToken = authSession.getRefreshToken()
    if (refreshToken) {
      const client = getSdkClient()
      try {
        await client.auth.customer.logout({ refreshToken })
      } catch {
        // best effort, ignore failures
      }
    }
    authSession.logout()
    relaunchToLogin()
  }

  const profile = state.status === "authenticated" ? state.profile : null
  const initials = profile?.name.trim().slice(0, 1).toUpperCase() || "G"

  return (
    <View className="safe-page safe-page--tabbed page-stack">
      <View className="page-header">
        <Text className="page-brand">{TEMPLATE_DISPLAY.brand}</Text>
        <Text className="page-title">我的</Text>
        <Text className="page-desc">查看当前账户信息，并管理当前设备会话。</Text>
      </View>

      {state.status === "loading" ? (
        <View className="card hero-card">
          <View className="hero-card__header">
            <View className="hero-card__copy">
              <Text className="hero-card__title">正在同步账户信息</Text>
              <Text className="hero-card__desc">正在恢复当前设备会话。</Text>
            </View>
            <Text className="inline-status">同步中</Text>
          </View>
        </View>
      ) : null}

      {state.status === "guest" || state.status === "error" ? (
        <View className="card hero-card">
          <View className="hero-card__header">
            <View className="hero-card__copy">
              <Text className="hero-card__title">
                {state.status === "guest" ? "当前未登录" : "暂时无法读取账户信息"}
              </Text>
              <Text className="hero-card__desc">{state.message}</Text>
            </View>
            <Text className="inline-status">
              {state.status === "guest" ? "未登录" : "异常"}
            </Text>
          </View>
          <View className="weapp-action-group">
            <Navigator
              className="weapp-button weapp-button--primary"
              data-testid="profile-login-action"
              url="/pages/login/index"
            >
              去登录
            </Navigator>
          </View>
        </View>
      ) : null}

      {profile ? (
        <>
          <View className="card card-section info-card" data-testid="profile-auth-card">
            <View className="profile-hero">
              <View className="profile-avatar">
                <Text>{initials}</Text>
              </View>
              <View className="profile-hero__copy">
                <Text className="profile-hero__title">{profile.name}</Text>
                <Text className="profile-hero__desc" data-testid="profile-email-value">
                  {profile.email}
                </Text>
              </View>
            </View>
            <Text className="inline-status inline-status--success">已登录</Text>
          </View>

          <View className="section-stack">
            <Text className="section-title">账户信息</Text>
            <View className="card card-section">
              <View className="list">
                <View className="list-row">
                  <Text className="list-label">用户 ID</Text>
                  <Text className="list-value list-value--mono">{profile.id}</Text>
                </View>
                <View className="list-row">
                  <Text className="list-label">邮箱</Text>
                  <Text className="list-value">{profile.email}</Text>
                </View>
                <View className="list-row">
                  <Text className="list-label">角色</Text>
                  <Text className="list-value">{profile.roles.join(", ") || "-"}</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="section-stack">
            <Text className="section-title">会话管理</Text>
            <View className="card card-section profile-page__session-card">
              <View>
                <Text className="card-title">当前设备会话</Text>
                <Text className="card-desc">
                  退出登录后，需要重新输入邮箱和密码才能继续访问首页与我的页。
                </Text>
              </View>
              <View className="weapp-action-group">
                <View
                  className="weapp-button weapp-button--danger"
                  data-testid="profile-logout-action"
                  onClick={handleLogout}
                >
                  退出登录
                </View>
              </View>
            </View>
          </View>
        </>
      ) : null}
    </View>
  )
}
