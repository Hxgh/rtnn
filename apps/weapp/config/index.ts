import { defineConfig, type UserConfigExport } from "@tarojs/cli"
import path from "node:path"
import devConfig from "./dev"
import prodConfig from "./prod"

export default defineConfig<"vite">(async (merge) => {
  const baseConfig: UserConfigExport<"vite"> = {
    projectName: "weapp",
    date: "2026-03-20",
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2
    },
    sourceRoot: "src",
    outputRoot: "dist",
    alias: {
      "@rtnn/api-sdk": path.resolve(__dirname, "../../../packages/api-sdk/src"),
      "@rtnn/config": path.resolve(__dirname, "../../../packages/config/src"),
      "@rtnn/shared-types": path.resolve(
        __dirname,
        "../../../packages/shared-types/src"
      )
    },
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [
        {
          from: path.resolve(__dirname, "../src/runtime-config.js"),
          to: path.resolve(__dirname, "../dist/runtime-config.js")
        }
      ],
      options: {}
    },
    framework: "react",
    compiler: "vite",
    cache: {
      enable: false
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: "module",
            generateScopedName: "[name]__[local]___[hash:base64:5]"
          }
        }
      }
    },
    h5: {
      publicPath: "/",
      staticDirectory: "static",
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: "module",
            generateScopedName: "[name]__[local]___[hash:base64:5]"
          }
        }
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    return merge({}, baseConfig, devConfig)
  }

  return merge({}, baseConfig, prodConfig)
})
