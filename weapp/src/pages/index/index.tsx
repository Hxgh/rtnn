import { Text, View } from "@tarojs/components"
import Taro from "@tarojs/taro"
import "./index.css"

export default function IndexPage() {
  const navigateTo = (url: string) => {
    Taro.navigateTo({ url })
  }

  return (
    <View className="safe-page index-page">
      <View className="card index-page__hero">
        <Text className="index-page__title">RTNN Weapp Template</Text>
        <Text className="index-page__desc">
          小程序端共享认证与 session 接口，结构与 Web 端保持一致。
        </Text>
      </View>

      <View className="card index-page__panel">
        <Text className="index-page__panel-title">快速入口</Text>
        <View
          className="button-primary"
          onClick={() => navigateTo("/pages/login/index")}
        >
          登录
        </View>
        <View
          className="button-ghost"
          onClick={() => navigateTo("/pages/profile/index")}
        >
          个人中心
        </View>
      </View>
    </View>
  )
}
