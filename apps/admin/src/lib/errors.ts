export function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error && "payload" in error) {
    const payload = (error as { payload?: unknown }).payload;
    if (typeof payload === "string") {
      return payload;
    }
    if (payload && typeof payload === "object" && "message" in payload) {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === "string") {
        return message;
      }
      if (Array.isArray(message)) {
        return message.join(", ");
      }
    }
  }
  return "";
}

export function resolveErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error && "payload" in error) {
    const payload = (error as { payload?: unknown }).payload;
    if (payload && typeof payload === "object" && "code" in payload) {
      const code = (payload as { code?: unknown }).code;
      return typeof code === "string" ? code : null;
    }
  }
  return null;
}

export function resolveErrorStatus(error: unknown): number | null {
  if (typeof error === "object" && error && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
}

export async function resolveAsyncData<T>(
  loader: () => Promise<T>,
): Promise<{ data: T | null; error: unknown | null; status: number | null }> {
  try {
    const data = await loader();
    return {
      data,
      error: null,
      status: null,
    };
  } catch (error) {
    return {
      data: null,
      error,
      status: resolveErrorStatus(error),
    };
  }
}
