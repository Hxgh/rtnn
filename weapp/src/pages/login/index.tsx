import { Input, Text, View } from "@tarojs/components"
import Taro from "@tarojs/taro"
import type { CustomerLoginBody } from "@rtnn/api-sdk"
import { getSdkClient } from "../../lib/sdk/client"
import { authSession } from "../../lib/session/auth"
import { useState } from "react"
import "./index.scss"

const initialCredentials = {
  email: "",
  password: ""
}

export default function LoginPage() {
  const [credentials, setCredentials] = useState(initialCredentials)

  const handleLogin = async () => {
    if (!credentials.email || !credentials.password) {
      Taro.showToast({ title: "请输入邮箱和密码", icon: "none" })
      return
    }

    const client = getSdkClient()
    const payload: CustomerLoginBody = {
      email: credentials.email,
      password: credentials.password
    }

    try {
      const session = await client.auth.customer.login(payload)
      authSession.applySession(session)
      Taro.showToast({ title: "登录成功", icon: "success" })
      Taro.switchTab({ url: "/pages/profile/index" })
    } catch (error) {
      console.error("customer login failed", error)
      Taro.showToast({ title: "登录失败，请稍后再试", icon: "none" })
    }
  }

  return (
    <View className="safe-page login-page">
      <View className="card login-page__hero">
        <Text className="login-page__title">登录引导</Text>
        <Text className="login-page__desc">
          当前是模板骨架。已接入 @rtnn/api-sdk，后台接口失败时只会提示错误。
        </Text>
      </View>
      <Input
        className="login-page__input"
        value={credentials.email}
        placeholder="邮箱"
        onInput={(event) =>
          setCredentials((prev) => ({ ...prev, email: event.detail.value ?? "" }))
        }
      />
      <Input
        className="login-page__input"
        value={credentials.password}
        placeholder="密码"
        password
        onInput={(event) =>
          setCredentials((prev) => ({ ...prev, password: event.detail.value ?? "" }))
        }
      />
      <View className="button-primary" onClick={handleLogin}>
        登录
      </View>
    </View>
  )
}
