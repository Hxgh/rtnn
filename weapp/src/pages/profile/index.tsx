import { Text, View } from "@tarojs/components"
import Taro, { useDidShow } from "@tarojs/taro"
import type { CustomerMeResult } from "@rtnn/api-sdk"
import { useState } from "react"
import { getSdkClient } from "../../lib/sdk/client"
import { authSession } from "../../lib/session/auth"
import "./index.scss"

type ProfileState = {
  id: string
  email: string
  displayName: string
  role: string
  loggedIn: boolean
}

const defaultState: ProfileState = {
  id: "guest",
  email: "guest@rtnn.dev",
  displayName: "访客",
  role: "GUEST",
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

  useDidShow(() => {
    const client = getSdkClient()
    client.auth.customer
      .me()
      .then((result) => {
        setProfile(toViewModel(result))
      })
      .catch((error) => {
        console.error("customer me failed", error)
        Taro.showToast({ title: "获取用户信息失败", icon: "none" })
        const cachedProfile = authSession.toMeResponse()
        if (cachedProfile) {
          setProfile(toViewModel(cachedProfile))
        }
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
    Taro.showToast({ title: "已退出", icon: "none" })
  }

  return (
    <View className="safe-page profile-page">
      <View className="card profile-page__card">
        <Text className="profile-page__title">账户信息</Text>
        <Text className="profile-page__line">用户 ID: {profile.id}</Text>
        <Text className="profile-page__line">邮箱: {profile.email}</Text>
        <Text className="profile-page__line">昵称: {profile.displayName}</Text>
        <Text className="profile-page__line">角色: {profile.role}</Text>
        <Text className="profile-page__line">
          登录状态: {profile.loggedIn ? "已登录" : "未登录"}
        </Text>
      </View>
      <View className="button-ghost" onClick={handleLogout}>
        退出登录
      </View>
    </View>
  )
}
