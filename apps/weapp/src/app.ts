import type { PropsWithChildren } from "react"
import { useEffect } from "react"
import "./app.css"

const H5_TABBAR_ICONS = [
  {
    label: "首页",
    icon: "assets/tabbar/home.png",
    activeIcon: "assets/tabbar/home-active.png"
  },
  {
    label: "我的",
    icon: "assets/tabbar/me.png",
    activeIcon: "assets/tabbar/me-active.png"
  }
] as const

function syncH5TabBarIcons() {
  const items = document.querySelectorAll<HTMLAnchorElement>(".weui-tabbar__item")

  items.forEach((item, index) => {
    const icon = H5_TABBAR_ICONS[index]
    const image = item.querySelector<HTMLImageElement>(".weui-tabbar__icon")

    if (!icon || !image) {
      return
    }

    const isActive = item.classList.contains("weui-bar__item_on")
    image.src = isActive ? icon.activeIcon : icon.icon
    image.alt = `${icon.label}图标`
    image.decoding = "async"
  })
}

function App({ children }: PropsWithChildren) {
  useEffect(() => {
    if (process.env.TARO_ENV !== "h5") {
      return
    }

    syncH5TabBarIcons()

    const observer = new MutationObserver(() => {
      syncH5TabBarIcons()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return children
}

export default App
