const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const baseUrl = getApiUrl().replace(/\/$/, '');
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(url, { ...fetchOptions, headers });
  } catch (err) {
    const message =
      err instanceof TypeError && err.message === 'Failed to fetch'
        ? `Cannot reach the API at ${baseUrl}. Is the backend server running?`
        : err instanceof Error
          ? err.message
          : 'Network error';
    throw new Error(message);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || res.statusText || 'Request failed');
  }
  return data as T;
}

export { getApiUrl };
