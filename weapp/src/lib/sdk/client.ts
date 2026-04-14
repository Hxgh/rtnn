import { createApiClient, createTaroTransport } from "@rtnn/api-sdk"
import Taro from "@tarojs/taro"
import { readWeappLocale } from "../preferences"
import { sessionStorageAdapter } from "../session/storage"

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || "http://127.0.0.1:5100"

type ApiClient = ReturnType<typeof createApiClient>

let client: ApiClient | null = null

const getHeaders = async (): Promise<Record<string, string>> => {
  const token = sessionStorageAdapter.read().accessToken
  const headers: Record<string, string> = {
    "accept-language": readWeappLocale()
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export const getSdkClient = (): ApiClient => {
  if (client) {
    return client
  }

  const transport = createTaroTransport({
    baseUrl: API_BASE_URL,
    request: Taro.request,
    getHeaders
  })
  client = createApiClient(transport)
  return client
}
