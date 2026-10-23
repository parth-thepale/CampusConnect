import { ApiResponse } from '../types';
import { ApiError } from './api-errors';

type TokenGetter = () => Promise<string | null>;

let globalTokenGetter: TokenGetter | null = null;

export function setApiTokenGetter(getter: TokenGetter | null) {
  globalTokenGetter = getter;
}

export interface RequestOptions extends RequestInit {
  token?: string | null;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, params, headers = {}, ...rest } = options;

  let resolvedToken = token;
  if (resolvedToken === undefined && globalTokenGetter) {
    try {
      resolvedToken = await globalTokenGetter();
    } catch {
      resolvedToken = null;
    }
  }

  const reqHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (resolvedToken) {
    reqHeaders['Authorization'] = `Bearer ${resolvedToken}`;
  }

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Set Content-Type for JSON body if not present
  if (rest.body && typeof rest.body === 'string' && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: reqHeaders,
    });
  } catch (netErr: any) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Unable to connect to the CampusConnect server. Please check your network connection.'
    );
  }

  const contentType = res.headers.get('content-type') || '';

  // Defensively detect HTML responses (e.g. rewrite misconfiguration returning index.html)
  if (contentType.includes('text/html')) {
    throw new ApiError(
      res.status,
      'INTEGRATION_ERROR',
      `API endpoint '${endpoint}' returned HTML instead of JSON. Ensure backend function rewrite is active.`
    );
  }

  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(
      res.status,
      'PARSE_ERROR',
      `Failed to parse server response from '${endpoint}' (Status ${res.status}).`
    );
  }

  if (!res.ok || json.success === false) {
    const code = json?.error?.code || `HTTP_${res.status}`;
    const message = json?.error?.message || json?.message || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, code, message, json?.error?.details);
  }

  return (json.data !== undefined ? json.data : (json as unknown as T));
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
