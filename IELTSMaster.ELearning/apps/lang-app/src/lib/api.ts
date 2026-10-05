import type { AuthResponse } from '@lang/shared';

// Gọi API cùng origin qua rewrite `/api` của Next.js (xem next.config.mjs).
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// --- Token ------------------------------------------------------------------
// Access token chỉ giữ trong bộ nhớ (không localStorage như lightc-general).
// Refresh token nằm trong cookie httpOnly do backend đặt; reload trang thì gọi
// /auth/refresh để lấy access token mới.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// Báo cho AuthProvider khi phiên hết hạn hẳn (refresh thất bại).
type AuthFailureListener = () => void;
const authFailureListeners = new Set<AuthFailureListener>();

export function onAuthFailure(listener: AuthFailureListener): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

// Nhiều request cùng gặp 401 thì chỉ gọi refresh một lần.
let refreshing: Promise<AuthResponse | null> | null = null;

/** Đổi refresh cookie lấy phiên mới; `null` khi phiên đã hết hạn hẳn. */
export function refreshAccessToken(): Promise<AuthResponse | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return null;
        const session = (await res.json()) as AuthResponse;
        accessToken = session.accessToken;
        return session;
      } catch {
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

// Các endpoint mà 401 nghĩa là sai thông tin, không phải token hết hạn.
const NO_REFRESH_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
]);

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Body lỗi nguyên văn (vd. `issues` của 422). */
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- Global loading tracker -------------------------------------------------
// Đếm số request đang chạy để hiển thị thanh loading toàn cục. Mỗi request
// tăng bộ đếm khi bắt đầu và giảm khi kết thúc (kể cả khi lỗi) => loading tự
// tắt khi tất cả request đã xong.
type LoadingListener = (active: number) => void;
let activeCount = 0;
const loadingListeners = new Set<LoadingListener>();

function notifyLoading() {
  loadingListeners.forEach((listener) => listener(activeCount));
}

export function subscribeLoading(listener: LoadingListener): () => void {
  loadingListeners.add(listener);
  listener(activeCount);
  return () => {
    loadingListeners.delete(listener);
  };
}

async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
  activeCount += 1;
  notifyLoading();
  try {
    return await fn();
  } finally {
    activeCount = Math.max(0, activeCount - 1);
    notifyLoading();
  }
}

// --- Request ----------------------------------------------------------------
async function send(
  path: string,
  init: RequestInit,
  allowRefresh = true,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && allowRefresh && !NO_REFRESH_PATHS.has(path)) {
    if (await refreshAccessToken()) return send(path, init, false);
    accessToken = null;
    authFailureListeners.forEach((listener) => listener());
  }
  return res;
}

const NETWORK_ERROR =
  'Không kết nối được máy chủ, hãy kiểm tra mạng và thử lại';
const SERVER_ERROR = 'Máy chủ đang gặp sự cố, vui lòng thử lại sau';

function errorMessage(data: unknown, fallback: string): string {
  const message = (data as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join(', ');
  return typeof message === 'string' && message ? message : fallback;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  fallbackError = 'Yêu cầu thất bại',
): Promise<T> {
  return withLoading(async () => {
    let res: Response;
    try {
      res = await send(path, init);
    } catch {
      // `fetch` ném TypeError tiếng Anh ("Failed to fetch") khi mất mạng.
      throw new ApiError(NETWORK_ERROR, 0);
    }
    if (res.status === 204) return undefined as T;

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 5xx không có body JSON: API không chạy (rewrite của Next.js trả 500).
      const fallback = res.status >= 500 ? SERVER_ERROR : fallbackError;
      throw new ApiError(errorMessage(data, fallback), res.status, data);
    }
    return data as T;
  });
}

/** Tên file trong `Content-Disposition` (ưu tiên `filename*` đã encode). */
function fileNameOf(header: string | null): string | null {
  if (!header) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) return decodeURIComponent(encoded[1]);
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? null;
}

/** Tải file nhị phân (vd. Excel bảng điểm): trả blob kèm tên file của server. */
async function download(
  path: string,
  fallbackError = 'Tải file thất bại',
): Promise<{ blob: Blob; fileName: string | null }> {
  return withLoading(async () => {
    let res: Response;
    try {
      res = await send(path, {});
    } catch {
      throw new ApiError(NETWORK_ERROR, 0);
    }
    if (!res.ok) {
      const data: unknown = await res.json().catch(() => ({}));
      const fallback = res.status >= 500 ? SERVER_ERROR : fallbackError;
      throw new ApiError(errorMessage(data, fallback), res.status, data);
    }
    return {
      blob: await res.blob(),
      fileName: fileNameOf(res.headers.get('Content-Disposition')),
    };
  });
}

// Upload multipart (không set Content-Type để trình duyệt tự thêm boundary).
function upload<T>(path: string, file: File, fieldName = 'file'): Promise<T> {
  const form = new FormData();
  form.append(fieldName, file);
  return request<T>(path, { method: 'POST', body: form }, 'Tải lên thất bại');
}

// Gửi FormData tự dựng sẵn (file kèm các field text khác).
function postForm<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: form }, 'Tải lên thất bại');
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'DELETE',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  upload,
  postForm,
  download,
};
