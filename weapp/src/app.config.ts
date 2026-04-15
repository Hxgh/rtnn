import { TEMPLATE_DISPLAY } from "@rtnn/config"

export default defineAppConfig({
  pages: [
    "pages/index/index",
    "pages/login/index",
    "pages/profile/index"
  ],
  tabBar: {
    color: "#737373",
    selectedColor: "#111111",
    backgroundColor: "#ffffff",
    borderStyle: "black",
    list: [
      {
        pagePath: "pages/index/index",
        iconPath: "assets/tabbar/home.png",
        selectedIconPath: "assets/tabbar/home-active.png",
        text: "首页"
      },
      {
        pagePath: "pages/profile/index",
        iconPath: "assets/tabbar/me.png",
        selectedIconPath: "assets/tabbar/me-active.png",
        text: "我的"
      }
    ]
  },
  window: {
    navigationBarTitleText: TEMPLATE_DISPLAY.brand,
    navigationBarBackgroundColor: "#ffffff",
    navigationBarTextStyle: "black",
    backgroundTextStyle: "light",
    backgroundColor: "#f5f5f5"
  }
})
