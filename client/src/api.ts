const API_URL = import.meta.env.PROD
  ? 'https://apinightwrapup.ziax.online/api'
  : 'http://localhost:5000/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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

export type Library = {
  _id: string;
  name: string;
  description?: string;
  songCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type Song = {
  _id: string;
  library: string;
  title: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnail?: string;
  channelName?: string;
  createdAt: string;
  updatedAt: string;
};

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Something went wrong. Please try again.', response.status);
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

export const listLibraries = () => request<Library[]>('/libraries');

export const createLibrary = (name: string, description: string) =>
  request<Library>('/libraries', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });

export const listLibrarySongs = (libraryId: string) =>
  request<Song[]>(`/libraries/${encodeURIComponent(libraryId)}/songs`);
