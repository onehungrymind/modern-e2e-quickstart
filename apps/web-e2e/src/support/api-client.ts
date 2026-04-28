const baseUrl = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:3000';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type Headers = Record<string, string>;

function buildHeaders(token?: string, hasBody = false): Headers {
  const headers: Headers = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const payload = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    throw new ApiClientError(res.status, payload, `${res.status} ${res.statusText}`);
  }
  return payload as T;
}

export const apiClient = {
  async get<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, { headers: buildHeaders(token) });
    return parse<T>(res);
  },
  async post<T>(path: string, body: unknown, token?: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: buildHeaders(token, true),
      body: JSON.stringify(body),
    });
    return parse<T>(res);
  },
  async delete(path: string, token?: string): Promise<void> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(token),
    });
    await parse<void>(res);
  },
};
