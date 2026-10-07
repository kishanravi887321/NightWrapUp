const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  user: AuthUser;
  extensionToken?: string;
};

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? 'Something went wrong. Please try again.');
  }
  return body.data as T;
};

export const googleAuth = (credential: string) =>
  request<AuthSession>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });

export const refresh = () => request<AuthSession>('/auth/refresh', { method: 'POST' });

export const logout = () => request<void>('/auth/logout', { method: 'POST' });

export const createExtensionToken = () =>
  request<{ extensionToken: string }>('/auth/extension-token', { method: 'POST' });
