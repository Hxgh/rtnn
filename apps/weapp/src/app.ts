import type { PropsWithChildren } from "react"
import { useEffect } from "react"
import "./app.css"
import homeIcon from "./assets/tabbar/home.png"
import homeActiveIcon from "./assets/tabbar/home-active.png"
import meIcon from "./assets/tabbar/me.png"
import meActiveIcon from "./assets/tabbar/me-active.png"

const H5_TABBAR_ICONS = [
  {
    label: "首页",
    icon: homeIcon,
    activeIcon: homeActiveIcon
  },
  {
    label: "我的",
    icon: meIcon,
    activeIcon: meActiveIcon
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
