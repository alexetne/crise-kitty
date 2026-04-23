export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? '/api';

type RequestOptions = {
  method?: 'GET' | 'POST';
  token?: string | null;
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  { method = 'GET', token, body }: RequestOptions = {},
) {
  const hasBody = body !== undefined;

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === 'object' && 'message' in payload
        ? payload.message || 'Request failed'
        : 'Request failed',
    );
  }

  return payload as T;
}
