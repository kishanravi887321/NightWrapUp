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
  playCount?: number;
  audio?: {
    url?: string;
    publicId?: string;
    status?: 'pending' | 'ready' | 'failed';
    quality?: string;
    size?: string;
    duration?: number;
    provider?: string;
  };
  createdAt: string;
  updatedAt: string;
};

const request = async <T>(path: string, options?: RequestInit, allowRefresh = true): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && allowRefresh && path !== '/auth/refresh' && path !== '/auth/google') {
    await request('/auth/refresh', { method: 'POST' }, false);
    return request<T>(path, options, false);
  }
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

export const deleteSong = (libraryId: string, songId: string) =>
  request<void>(`/libraries/${encodeURIComponent(libraryId)}/songs/${encodeURIComponent(songId)}`, {
    method: 'DELETE',
  });

export const deleteLibrary = (libraryId: string) =>
  request<void>(`/libraries/${encodeURIComponent(libraryId)}`, { method: 'DELETE' });

export const recordSongPlay = (libraryId: string, songId: string) =>
  request<Song>(`/libraries/${encodeURIComponent(libraryId)}/songs/${encodeURIComponent(songId)}/play`, {
    method: 'POST',
  });
