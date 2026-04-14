import { Input, Text, View } from "@tarojs/components"
import Taro, { useDidShow } from "@tarojs/taro"
import type { CustomerLoginBody } from "@rtnn/api-sdk"
import { TEMPLATE_DEFAULTS, TEMPLATE_DISPLAY } from "@rtnn/config"
import { getSdkClient } from "../../lib/sdk/client"
import { authSession } from "../../lib/session/auth"
import { useState } from "react"
import "./index.css"

const initialCredentials: {
  email: string
  password: string
} = {
  email: TEMPLATE_DEFAULTS.customer.email,
  password: TEMPLATE_DEFAULTS.customer.password
}

export default function LoginPage() {
  const [credentials, setCredentials] = useState(initialCredentials)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useDidShow(() => {
    authSession
      .restoreSession()
      .then((session) => {
        if (session) {
          Taro.switchTab({ url: "/pages/index/index" })
        }
      })
      .catch(() => {
        setErrorMessage("当前会话暂不可用，请稍后重试。")
      })
  })

  const handleLogin = async () => {
    if (submitting) {
      return
    }

    if (!credentials.email || !credentials.password) {
      setErrorMessage("请输入邮箱和密码。")
      return
    }

    setSubmitting(true)
    setErrorMessage("")

    const client = getSdkClient()
    const payload: CustomerLoginBody = {
      email: credentials.email,
      password: credentials.password
    }

    try {
      const session = await client.auth.customer.login(payload)
      authSession.applySession(session)
      const restored = await authSession.restoreSession()
      if (!restored) {
        throw new Error("session restore failed")
      }
      Taro.switchTab({ url: "/pages/index/index" })
    } catch {
      setErrorMessage("登录失败，请确认账号密码或稍后重试。")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="safe-page page-stack">
      <View className="page-header">
        <Text className="page-kicker">customer auth</Text>
        <Text className="page-title">登录</Text>
        <Text className="page-desc">
          使用 {TEMPLATE_DISPLAY.brand} 的正式 customer 登录接口建立会话，并进入首页主线。
        </Text>
      </View>

      <View className="card card-section login-page__form">
        <View className="login-page__credentials">
          <View className="stack-sm">
            <Text className="field-label">邮箱</Text>
            <Input
              className="field-input"
              value={credentials.email}
              placeholder="请输入邮箱"
              onInput={(event) =>
                setCredentials((prev) => ({ ...prev, email: event.detail.value ?? "" }))
              }
            />
          </View>
          <View className="stack-sm">
            <Text className="field-label">密码</Text>
            <Input
              className="field-input"
              value={credentials.password}
              placeholder="请输入密码"
              password
              onInput={(event) =>
                setCredentials((prev) => ({ ...prev, password: event.detail.value ?? "" }))
              }
            />
          </View>
        </View>

        {errorMessage ? (
          <View className="message-box message-box--error">{errorMessage}</View>
        ) : (
          <Text className="helper-text">登录后将进入首页，并同步当前账户状态。</Text>
        )}

        <View className="action-group">
          <View
            className={submitting ? "button-primary button-primary--disabled" : "button-primary"}
            onClick={handleLogin}
          >
            {submitting ? "登录中..." : "登录"}
          </View>
          <View
            className="button-ghost"
            onClick={() => Taro.switchTab({ url: "/pages/index/index" })}
          >
            返回首页
          </View>
        </View>
      </View>
    </View>
  )
}
