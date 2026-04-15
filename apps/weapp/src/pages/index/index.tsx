import { Navigator, Text, View } from "@tarojs/components"
import { useDidShow } from "@tarojs/taro"
import type { CustomerMeResult } from "@rtnn/api-sdk"
import { TEMPLATE_DISPLAY } from "@rtnn/config"
import { useState } from "react"
import { authSession } from "../../lib/session/auth"
import "./index.css"

type HomeState =
  | {
      status: "loading"
    }
  | {
      status: "guest"
    }
  | {
      status: "error"
      message: string
    }
  | {
      status: "authenticated"
      profile: CustomerMeResult["user"]
    }

export default function IndexPage() {
  const [state, setState] = useState<HomeState>({
    status: "loading"
  })

  useDidShow(() => {
    setState({ status: "loading" })

    authSession
      .restoreSession()
      .then((session) => {
        if (!session) {
          setState({ status: "guest" })
          return
        }

        setState({
          status: "authenticated",
          profile: session.user
        })
      })
      .catch(() => {
        setState({
          status: "error",
          message: "当前会话状态暂时不可用，请稍后重试。"
        })
      })
  })

  return (
    <View className="safe-page safe-page--tabbed page-stack">
      <View className="page-header">
        <Text className="page-brand">{TEMPLATE_DISPLAY.brand}</Text>
        <Text className="page-title">首页</Text>
        <Text className="page-desc">查看当前账户状态，并进入我的页管理会话。</Text>
      </View>

      {state.status === "loading" ? (
        <View className="card hero-card">
          <View className="hero-card__header">
            <View className="hero-card__copy">
              <Text className="hero-card__title">正在同步当前会话</Text>
              <Text className="hero-card__desc">
                正在检查本地凭据与当前账户状态。
              </Text>
            </View>
            <Text className="inline-status">同步中</Text>
          </View>
        </View>
      ) : null}

      {state.status === "guest" ? (
        <View className="card hero-card">
          <View className="hero-card__header">
            <View className="hero-card__copy">
              <Text className="hero-card__title">当前未登录</Text>
              <Text className="hero-card__desc">
                登录后即可访问首页和我的页，并同步当前设备会话。
              </Text>
            </View>
            <Text className="inline-status">未登录</Text>
          </View>
          <View className="weapp-action-group">
            <Navigator
              url="/pages/login/index"
              className="weapp-button weapp-button--primary"
              data-testid="home-login-action"
            >
              去登录
            </Navigator>
          </View>
        </View>
      ) : null}

      {state.status === "error" ? (
        <View className="message-box message-box--error">{state.message}</View>
      ) : null}

      {state.status === "authenticated" ? (
        <>
          <View className="card hero-card" data-testid="home-auth-card">
            <View className="hero-card__header">
              <View className="hero-card__copy">
                <Text className="hero-card__title">{state.profile.name}</Text>
                <Text className="hero-card__desc" data-testid="home-email-value">
                  {state.profile.email}
                </Text>
              </View>
              <Text className="inline-status inline-status--success">已登录</Text>
            </View>
            <View className="hero-card__meta">
              <View className="hero-meta">
                <Text className="hero-meta__label">当前角色</Text>
                <Text className="hero-meta__value">
                  {state.profile.roles.join(", ") || "-"}
                </Text>
              </View>
              <View className="hero-meta">
                <Text className="hero-meta__label">会话状态</Text>
                <Text className="hero-meta__value">当前设备已同步</Text>
              </View>
            </View>
          </View>

          <View className="section-stack">
            <Text className="section-title">账户概览</Text>
            <View className="card card-section">
              <View className="list list--tight">
                <View className="list-row">
                  <Text className="list-label">邮箱</Text>
                  <Text className="list-value">{state.profile.email}</Text>
                </View>
                <View className="list-row">
                  <Text className="list-label">用户 ID</Text>
                  <Text className="list-value list-value--mono">{state.profile.id}</Text>
                </View>
              </View>
            </View>
          </View>
        </>
      ) : null}

      <View className="section-stack">
        <Text className="section-title">常用入口</Text>
        <View className="card card-section">
          <Navigator
            className="row-link"
            openType="switchTab"
            url="/pages/profile/index"
            data-testid="home-me-link"
          >
            <View className="row-link__copy">
              <Text className="row-link__title">我的</Text>
              <Text className="row-link__desc">
                查看账户信息，并管理当前设备会话。
              </Text>
            </View>
            <Text className="row-link__chevron">›</Text>
          </Navigator>
        </View>
      </View>
    </View>
  )
}
