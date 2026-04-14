import { Text, View } from "@tarojs/components"
import Taro, { useDidShow } from "@tarojs/taro"
import type { CustomerMeResult } from "@rtnn/api-sdk"
import { useState } from "react"
import { getSdkClient } from "../../lib/sdk/client"
import { authSession } from "../../lib/session/auth"
import "./index.css"

type ProfileState = {
  id: string
  email: string
  displayName: string
  role: string
  loggedIn: boolean
}

const defaultState: ProfileState = {
  id: "-",
  email: "-",
  displayName: "未登录",
  role: "-",
  loggedIn: false
}

const toViewModel = (response: CustomerMeResult): ProfileState => ({
  id: response.user.id,
  email: response.user.email,
  displayName: response.user.name,
  role: response.user.roles.join(", "),
  loggedIn: true
})

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileState>(defaultState)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  useDidShow(() => {
    setLoading(true)
    setMessage("")

    authSession
      .restoreSession()
      .then((result) => {
        if (!result) {
          setProfile(defaultState)
          setMessage("当前未登录，请先进入登录页建立 customer 会话。")
          return
        }

        setProfile(toViewModel(result))
      })
      .catch(() => {
        setProfile(defaultState)
        setMessage("读取账户信息失败，请稍后重试。")
      })
      .finally(() => {
        setLoading(false)
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
    setProfile(defaultState)
    setMessage("已退出当前会话。")
    Taro.reLaunch({ url: "/pages/login/index" })
  }

  const initials =
    profile.displayName && profile.displayName !== "未登录"
      ? profile.displayName.trim().slice(0, 1).toUpperCase()
      : "G"

  return (
    <View className="safe-page page-stack">
      <View className="page-header">
        <Text className="page-kicker">my account</Text>
        <Text className="page-title">我的</Text>
        <Text className="page-desc">
          集中查看账户状态、当前身份和退出登录入口。
        </Text>
      </View>

      <View className="card card-section stack-md">
        <View className="profile-page__hero">
          <View className="profile-page__avatar">
            <Text>{initials}</Text>
          </View>
          <View className="profile-page__hero-copy">
            <Text className="profile-page__hero-title">{profile.displayName}</Text>
            <Text className="profile-page__hero-desc">{profile.email}</Text>
          </View>
        </View>
        {loading ? (
          <Text className="inline-status">正在同步会话</Text>
        ) : (
          <Text
            className={
              profile.loggedIn
                ? "inline-status inline-status--success"
                : "inline-status"
            }
          >
            {profile.loggedIn ? "已登录" : "未登录"}
          </Text>
        )}
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
              <Text className="list-value">{profile.role}</Text>
            </View>
          </View>
        </View>
      </View>

      {message ? (
        <View
          className={
            profile.loggedIn ? "message-box" : "message-box message-box--muted"
          }
        >
          {message}
        </View>
      ) : null}

      <View className="action-group">
        {!profile.loggedIn ? (
          <View
            className="button-primary"
            onClick={() => Taro.navigateTo({ url: "/pages/login/index" })}
          >
            去登录
          </View>
        ) : (
          <>
            <View
              className="button-ghost"
              onClick={() => Taro.switchTab({ url: "/pages/index/index" })}
            >
              返回首页
            </View>
            <View className="button-danger" onClick={handleLogout}>
              退出登录
            </View>
          </>
        )}
      </View>
    </View>
  )
}
