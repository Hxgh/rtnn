export type Primitive = string | number | boolean | null;

export interface ApiRequestOptions<TBody = unknown> {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, Primitive | Primitive[] | undefined>;
  body?: TBody;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
}

export interface ApiTransport {
  request<TResponse, TBody = unknown>(
    options: ApiRequestOptions<TBody>,
  ): Promise<TResponse>;
}

export interface FetchTransportOptions {
  baseUrl: string;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  credentials?: RequestCredentials;
  fetcher?: typeof fetch;
}

const buildQueryString = (
  query?: Record<string, Primitive | Primitive[] | undefined>,
) => {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null) {
          params.append(key, String(entry));
        }
      });
      return;
    }

    if (value !== null) {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

export const createFetchTransport = ({
  baseUrl,
  getHeaders,
  credentials = "include",
  fetcher = fetch,
}: FetchTransportOptions): ApiTransport => ({
  async request<TResponse, TBody>({
    method,
    path,
    query,
    body,
    headers,
    signal,
  }: ApiRequestOptions<TBody>) {
    const finalHeaders = {
      "content-type": "application/json",
      ...(getHeaders ? await getHeaders() : {}),
      ...headers,
    };

    const response = await fetcher(`${baseUrl}${path}${buildQueryString(query)}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials,
      signal,
    });

    if (!response.ok) {
      const payload = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw Object.assign(new Error("API request failed"), {
        status: response.status,
        payload,
      });
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  },
});

export interface TaroRequestLikeOptions<TData = unknown> {
  url: string;
  method:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "OPTIONS"
    | "HEAD";
  data?: TData;
  header?: Record<string, string>;
}

export interface TaroRequestLikeResult<TData = unknown> {
  statusCode: number;
  data: TData;
}

export type TaroRequestLike = <TResponse = unknown, TBody = unknown>(
  options: TaroRequestLikeOptions<TBody>,
) => Promise<TaroRequestLikeResult<TResponse>>;

export interface TaroTransportOptions {
  baseUrl: string;
  request: TaroRequestLike;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}

export const createTaroTransport = ({
  baseUrl,
  request,
  getHeaders,
}: TaroTransportOptions): ApiTransport => ({
  async request<TResponse, TBody>({
    method,
    path,
    query,
    body,
    headers,
  }: ApiRequestOptions<TBody>) {
    const response = await request<TResponse, TBody>({
      url: `${baseUrl}${path}${buildQueryString(query)}`,
      method,
      data: body,
      header: {
        "content-type": "application/json",
        ...(getHeaders ? await getHeaders() : {}),
        ...headers,
      },
    });

    if (response.statusCode >= 400) {
      throw Object.assign(new Error("API request failed"), {
        status: response.statusCode,
        payload: response.data,
      });
    }

    return response.data;
  },
});
