import API from '../config';
import { notifyUnauthorized } from './authSession';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 350;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryStatus = (status) =>
  status === 408 || status === 429 || (status >= 500 && status <= 599);

const parseJsonSafe = (text) => {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { success: false, message: text || 'Invalid server response format.' };
  }
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const toQueryString = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    q.set(key, String(value));
  });
  return q.toString();
};

export const authJsonHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('wlm_token') || ''}`,
  'Content-Type': 'application/json',
});

export const fetchJsonWithRetry = async (url, options = {}) => {
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const retries = Number(options.retries ?? DEFAULT_RETRIES);
  const retryDelayMs = Number(options.retryDelayMs || DEFAULT_RETRY_DELAY_MS);
  const silentMode = options.silentMode === true; // Suppress logs and retries for expected 404s

  const baseHeaders = options.headers || authJsonHeaders();
  const getHeaders = { ...baseHeaders };
  if ('Content-Type' in getHeaders) delete getHeaders['Content-Type'];
  if ('content-type' in getHeaders) delete getHeaders['content-type'];

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers: getHeaders,
        },
        timeoutMs
      );
      const text = await response.text();
      const data = parseJsonSafe(text);

      if (response.ok && data?.success !== false) {
        return { success: true, status: response.status, data };
      }

      if (response.status === 401) {
        notifyUnauthorized();
        return {
          success: false,
          status: 401,
          message: data?.message || 'Session expired. Please login again.',
          data,
        };
      }

      // 404 is a valid response for some endpoints (e.g., submission not found)
      // In silentMode, return immediately without retrying
      if (response.status === 404) {
        if (!silentMode) {
          // Only log 404 if not in silent mode (for debugging)
          // This prevents the "GET /api/submissions/by-faculty/189 404" console spam
        }
        return {
          success: false,
          status: 404,
          message: data?.message || 'Not found.',
          data,
        };
      }

      // For other non-retryable errors, don't log in silent mode
      if (attempt < retries && shouldRetryStatus(response.status)) {
        if (!silentMode) {
          // Log retry attempts only when not in silent mode
        }
        await wait(retryDelayMs * (2 ** attempt));
        continue;
      }

      return {
        success: false,
        status: response.status,
        message: data?.message || `Request failed with status ${response.status}.`,
        data,
      };
    } catch (error) {
      if (attempt < retries) {
        await wait(retryDelayMs * (2 ** attempt));
        continue;
      }
      const message = error?.name === 'AbortError'
        ? `Request timed out after ${timeoutMs}ms.`
        : (error?.message || 'Network error while fetching data.');
      return {
        success: false,
        status: 0,
        message,
        data: {},
      };
    }
  }

  return { success: false, status: 0, message: 'Unknown GET failure.', data: {} };
};

export const fetchAllPages = async (path, params = {}, options = {}) => {
  const pageSize = Number(options.pageSize || 1000);
  const maxPages = Number(options.maxPages || 20);
  const headers = options.headers || authJsonHeaders();
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const retries = Number(options.retries ?? DEFAULT_RETRIES);
  const retryDelayMs = Number(options.retryDelayMs || DEFAULT_RETRY_DELAY_MS);

  let page = 1;
  let pages = 1;
  const merged = [];

  while (page <= pages && page <= maxPages) {
    const query = toQueryString({ ...params, page });
    const url = `${API}${path}${query ? `?${query}` : ''}`;
    const result = await fetchJsonWithRetry(url, {
      headers,
      timeoutMs,
      retries,
      retryDelayMs,
    });

    if (!result.success) {
      return {
        success: false,
        status: result.status || 0,
        message: result.message || 'Failed to fetch paginated data.',
        data: merged,
      };
    }

    const data = result.data || {};

    if (!data.success) {
      return {
        success: false,
        status: result.status || 0,
        message: data?.message || 'Failed to fetch paginated data.',
        data: merged,
      };
    }

    const chunk = Array.isArray(data.data) ? data.data : [];
    merged.push(...chunk);

    const metaPages = Number(data?.meta?.pages || 1);
    pages = Number.isFinite(metaPages) && metaPages > 0 ? metaPages : 1;
    page += 1;
  }

  return { success: true, data: merged };
};
