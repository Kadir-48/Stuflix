export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Safely fetches and parses JSON responses.
 * Protects against HTML error/fallback pages and ensures response.ok & Content-Type validation.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          data,
          error: data?.error || data?.message || data?.details || `HTTP error ${res.status}`,
        };
      }
      return {
        ok: true,
        status: res.status,
        data,
      };
    }

    // Non-JSON response (e.g., HTML fallback or server error)
    const rawText = await res.text();
    const isHtml = rawText.trim().startsWith('<');
    if (isHtml) {
      console.error(`[safeFetchJson] Server returned HTML page (${res.status} ${res.statusText}) instead of JSON for ${url}. Full response:`, rawText);
    }
    const preview = isHtml
      ? `Server returned HTML page (${res.status} ${res.statusText}) instead of JSON for ${url}: ${rawText.slice(0, 300)}`
      : rawText.slice(0, 150) || `HTTP ${res.status} response`;

    return {
      ok: false,
      status: res.status,
      error: preview,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err?.message || 'Network request failed. Please check connection.',
    };
  }
}
