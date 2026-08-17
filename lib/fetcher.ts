import { ApiError } from "@/lib/ApiError";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function fetcher<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { params, ...customConfig } = options;
  const isFormData = customConfig.body instanceof FormData;

  // 1. Handle Query Params
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.keys(params).forEach((key) =>
      url.searchParams.append(key, params[key]),
    );
  }

  const config: RequestInit = {
    method: customConfig.method || "GET",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...customConfig.headers,
    },
    // Required for HttpOnly Cookies to be sent
    credentials: "include",
    ...customConfig,
  };

  try {
    let response = await fetch(url.toString(), config);

    // 2. Handle Token Expiration (401)
    if (response.status === 401 && !endpoint.includes("/auth/refresh")) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // Retry the original request once
        response = await fetch(url.toString(), config);
      }
    }

    const data = await response.json();

    if (!response.ok) {
      // data.message comes from your backend sendResponse/AppError logic
      throw new ApiError(
        data.message || "Something went wrong",
        response.status,
      );
    }

    return data as T; // Return the 'data' property from your backend response
  } catch (error) {
    throw error;
  }
}

async function attemptTokenRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}
