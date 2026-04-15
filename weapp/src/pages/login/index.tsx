import { Input, Text, View } from "@tarojs/components"
import { useDidShow } from "@tarojs/taro"
import type { CustomerLoginBody } from "@rtnn/api-sdk"
import { TEMPLATE_DEFAULTS, TEMPLATE_DISPLAY } from "@rtnn/config"
import { goToHome } from "../../lib/navigation"
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
          goToHome()
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
      goToHome()
    } catch {
      setErrorMessage("登录失败，请确认账号密码或稍后重试。")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="safe-page safe-page--auth page-stack">
      <View className="page-header">
        <Text className="page-brand">{TEMPLATE_DISPLAY.brand}</Text>
        <Text className="page-title">登录</Text>
        <Text className="page-desc">登录后可访问首页与我的页，并同步当前设备会话。</Text>
      </View>

      <View className="card card-section login-page__form">
        <View className="login-page__intro stack-sm">
          <Text className="login-page__intro-title">欢迎回来</Text>
          <Text className="helper-text">输入邮箱和密码后即可进入正式前台。</Text>
        </View>

        <View className="login-page__credentials">
          <View className="stack-sm">
            <Text className="field-label">邮箱</Text>
            <Input
              className="field-input"
              data-testid="login-email-input"
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
              data-testid="login-password-input"
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
          <Text className="helper-text">输入完成后即可建立当前设备会话。</Text>
        )}

        <View className="weapp-action-group">
          <View
            data-testid="login-submit-action"
            className={
              submitting
                ? "weapp-button weapp-button--primary weapp-button--disabled"
                : "weapp-button weapp-button--primary"
            }
            onClick={handleLogin}
          >
            {submitting ? "登录中..." : "登录"}
          </View>
          <View
            data-testid="login-home-action"
            className="weapp-button weapp-button--ghost"
            onClick={() => {
              void goToHome()
            }}
          >
            返回首页
          </View>
        </View>
      </View>
    </View>
  )
}
