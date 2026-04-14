import { Text, View } from "@tarojs/components"
import Taro, { useDidShow } from "@tarojs/taro"
import type { CustomerMeResult } from "@rtnn/api-sdk"
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

  const navigateTo = (url: string) => {
    Taro.navigateTo({ url })
  }

  return (
    <View className="safe-page page-stack">
      <View className="page-header">
        <Text className="page-kicker">customer weapp</Text>
        <Text className="page-title">客户首页</Text>
        <Text className="page-desc">
          保留登录、会话恢复、账户概览和我的页入口这条正式主线。
        </Text>
      </View>

      <View className="section-stack">
        <Text className="section-title">当前状态</Text>
        <View className="card card-section stack-md">
          {state.status === "loading" ? (
            <View className="stack-sm">
              <Text className="inline-status">正在恢复会话</Text>
              <Text className="helper-text">正在检查本地凭据与当前登录状态。</Text>
            </View>
          ) : null}

          {state.status === "guest" ? (
            <View className="stack-md">
              <View className="index-page__status">
                <View className="index-page__status-copy">
                  <Text className="index-page__status-title">当前未登录</Text>
                  <Text className="index-page__status-desc">
                    先登录客户账号，再进入正式首页与我的页流程。
                  </Text>
                </View>
                <Text className="inline-status">未登录</Text>
              </View>
              <View className="action-group">
                <View
                  className="button-primary"
                  onClick={() => navigateTo("/pages/login/index")}
                >
                  进入登录
                </View>
              </View>
            </View>
          ) : null}

          {state.status === "error" ? (
            <View className="message-box message-box--error">
              {state.message}
            </View>
          ) : null}

          {state.status === "authenticated" ? (
            <View className="stack-md">
              <View className="index-page__status">
                <View className="index-page__status-copy">
                  <Text className="index-page__status-title">
                    {state.profile.name}
                  </Text>
                  <Text className="index-page__status-desc">
                    {state.profile.email}
                  </Text>
                </View>
                <Text className="inline-status inline-status--success">已登录</Text>
              </View>
              <View className="list">
                <View className="list-row">
                  <Text className="list-label">角色</Text>
                  <Text className="list-value">
                    {state.profile.roles.join(", ") || "-"}
                  </Text>
                </View>
                <View className="list-row">
                  <Text className="list-label">用户 ID</Text>
                  <Text className="list-value list-value--mono">{state.profile.id}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View className="section-stack">
        <Text className="section-title">常用入口</Text>
        <View className="card card-section">
          <View
            className="index-page__quick-link"
            onClick={() => navigateTo("/pages/profile/index")}
          >
            <View>
              <Text className="index-page__quick-title">我的</Text>
              <Text className="index-page__quick-desc">
                查看账户信息、登录状态并执行退出登录。
              </Text>
            </View>
            <Text className="index-page__chevron">›</Text>
          </View>
          <View
            className="index-page__quick-link"
            onClick={() => navigateTo("/pages/login/index")}
          >
            <View>
              <Text className="index-page__quick-title">登录页</Text>
              <Text className="index-page__quick-desc">
                会话失效后，可从这里重新建立登录状态。
              </Text>
            </View>
            <Text className="index-page__chevron">›</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
