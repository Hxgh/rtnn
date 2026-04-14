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
        text: "首页"
      },
      {
        pagePath: "pages/profile/index",
        text: "我的"
      }
    ]
  },
  window: {
    navigationBarTitleText: "RTNN",
    navigationBarBackgroundColor: "#ffffff",
    navigationBarTextStyle: "black",
    backgroundTextStyle: "light"
  }
})
