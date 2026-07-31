/**
 * Thin fetch wrapper for the JSON endpoints.
 *
 * Inertia's own visits are used for navigation; these calls are the ones that
 * must feel instant — adding an item mid-burst, resolving a swipe — so they
 * bypass a page reload entirely.
 */

/**
 * Shield encrypts the XSRF-TOKEN cookie and decodes the header itself, so the
 * value has to be forwarded exactly as the browser stored it.
 */
function xsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? match[1] : null
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = xsrfToken()

  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'X-XSRF-TOKEN': token } : {}),
      ...options.headers,
    },
    credentials: 'same-origin',
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    /** The session expired mid-burst: get back to the login page rather than failing silently. */
    if (response.status === 401 || response.status === 419) {
      window.location.href = '/login'
    }
    throw new ApiError(payload?.message ?? 'Une erreur est survenue', response.status)
  }

  return payload as T
}

export function post<T>(url: string, body?: unknown): Promise<T> {
  return api<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
}

export function patch<T>(url: string, body: unknown): Promise<T> {
  return api<T>(url, { method: 'PATCH', body: JSON.stringify(body) })
}

export function destroy(url: string): Promise<void> {
  return api<void>(url, { method: 'DELETE' })
}
