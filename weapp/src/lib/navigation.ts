import Taro from "@tarojs/taro"

function goToTabPage(url: string) {
  if (process.env.TARO_ENV === "h5") {
    return Taro.reLaunch({ url })
  }

  return Taro.switchTab({ url })
}

export function goToHome() {
  return goToTabPage("/pages/index/index")
}

export function goToProfile() {
  return goToTabPage("/pages/profile/index")
}

export function goToLogin() {
  return Taro.navigateTo({ url: "/pages/login/index" })
}

export function relaunchToLogin() {
  return Taro.reLaunch({ url: "/pages/login/index" })
}
