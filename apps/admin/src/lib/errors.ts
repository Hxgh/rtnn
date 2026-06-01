function resolveErrorPayload(error: unknown): unknown {
  if (typeof error === "object" && error && "payload" in error) {
    return (error as { payload?: unknown }).payload;
  }
  return null;
}

export function resolveErrorMessage(error: unknown): string {
  const payload = resolveErrorPayload(error);
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
  if (payload && typeof payload === "object" && "code" in payload) {
    const code = (payload as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "";
}

export function resolveErrorCode(error: unknown): string | null {
  const payload = resolveErrorPayload(error);
  if (payload && typeof payload === "object" && "code" in payload) {
    const code = (payload as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  if (typeof error === "object" && error && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
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
