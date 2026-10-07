import { useEffect, useMemo, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AuthSession, googleAuth, logout, refresh } from './api';

const EXTENSION_BRIDGE_ORIGIN = 'https://nightwrapup.ziax.online';

type Playlist = {
  id: number;
  name: string;
  mood: string;
  accent: string;
  tracks: number;
  duration: string;
  updatedAt: string;
  urls: string[];
};

const initialPlaylists: Playlist[] = [
  {
    id: 1,
    name: 'Late Night Coding',
    mood: 'Deep focus',
    accent: 'from-fuchsia-500 to-violet-600',
    tracks: 12,
    duration: '58 min',
    updatedAt: '2h ago',
    urls: [
      'https://music.youtube.com/watch?v=2vjPBrBU-TM',
      'https://music.youtube.com/watch?v=4xDzrJKXOOY',
    ],
  },
  {
    id: 2,
    name: 'Midnight Chill',
    mood: 'Lo-fi calm',
    accent: 'from-cyan-400 to-blue-600',
    tracks: 18,
    duration: '1h 12m',
    updatedAt: 'Today',
    urls: [
      'https://music.youtube.com/watch?v=5qap5aO4i9A',
      'https://music.youtube.com/watch?v=DWcJFNfaw9c',
    ],
  },
  {
    id: 3,
    name: 'Weekend Reset',
    mood: 'Warm and airy',
    accent: 'from-amber-400 to-orange-500',
    tracks: 9,
    duration: '41 min',
    updatedAt: 'Yesterday',
    urls: ['https://music.youtube.com/watch?v=O7yq7c8NDgQ'],
  },
];

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credential?: string) => {
    if (!credential) {
      setError('Google did not return a sign-in credential.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onAuthenticated(await googleAuth(credential));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to authenticate.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-layout">
      <div className="auth-showcase">
        <span className="brand-mark">NW</span>
        <span className="eyebrow">NightWrapUp / private listening space</span>
        <h1>Your late-night soundtrack, beautifully organized.</h1>
        <p>Save the songs that find you after dark and keep your personal library in sync.</p>
        <div className="auth-proof"><span>✦</span> Your library. Your flow. Your night.</div>
      </div>
      <section className="auth-card glass-card">
        <div className="auth-card-heading">
          <span className="eyebrow">Welcome to your private listening space</span>
          <h2>Sign in with Google</h2>
          <p>New accounts are created automatically. Existing accounts are signed in instantly.</p>
        </div>
        <div className="google-login">
          <GoogleLogin
            onSuccess={(credentialResponse) => handleGoogleSuccess(credentialResponse.credential)}
            onError={() => setError('Google sign-in was cancelled or failed.')}
            useOneTap
            theme="filled_black"
            shape="pill"
            size="large"
            width="320"
          />
        </div>
        {busy && <div className="auth-status">Opening your space…</div>}
        {error && <div className="form-error">{error}</div>}
      </section>
    </main>
  );
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const saved = localStorage.getItem('nightwrapup_user');
    const extensionToken = localStorage.getItem('nightwrapup_extension_token');
    return saved ? { user: JSON.parse(saved), extensionToken: extensionToken ?? undefined } : null;
  });
  const [checkingSession, setCheckingSession] = useState(true);
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [selectedId, setSelectedId] = useState(initialPlaylists[0]?.id ?? 0);
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    const restoreSession = async () => {
      if (!session) {
        setCheckingSession(false);
        return;
      }
      try {
        const renewed = await refresh();
        setSession(renewed);
      } catch {
        localStorage.removeItem('nightwrapup_user');
        localStorage.removeItem('nightwrapup_extension_token');
        setSession(null);
      } finally {
        setCheckingSession(false);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    const isConnectionRequest =
      window.location.origin === EXTENSION_BRIDGE_ORIGIN &&
      new URLSearchParams(window.location.search).get('extension') === 'connect';

    if (checkingSession || !session || !isConnectionRequest) {
      return;
    }

    const extensionToken = localStorage.getItem('nightwrapup_extension_token');
    if (!extensionToken) {
      return;
    }

    window.postMessage(
      {
        source: 'nightwrapup-web',
        type: 'NIGHTWRAPUP_EXTENSION_TOKEN',
        token: extensionToken,
      },
      EXTENSION_BRIDGE_ORIGIN,
    );
  }, [checkingSession, session]);

  const handleAuthenticated = (nextSession: AuthSession) => {
    localStorage.setItem('nightwrapup_user', JSON.stringify(nextSession.user));
    if (nextSession.extensionToken) {
      localStorage.setItem('nightwrapup_extension_token', nextSession.extensionToken);
    }
    setSession(nextSession);
  };

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    localStorage.removeItem('nightwrapup_user');
    localStorage.removeItem('nightwrapup_extension_token');
    setSession(null);
  };

  if (checkingSession) return <div className="loading-screen">Tuning your night<span>•</span><span>•</span><span>•</span></div>;
  if (!session) return <div className="app-shell"><div className="bg-orb bg-orb-left" /><div className="bg-orb bg-orb-right" /><AuthScreen onAuthenticated={handleAuthenticated} /></div>;

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedId) ?? playlists[0],
    [playlists, selectedId],
  );

  const totalTracks = playlists.reduce((sum, playlist) => sum + playlist.tracks, 0);
  const totalUrls = playlists.reduce((sum, playlist) => sum + playlist.urls.length, 0);

  const handleAddUrl = () => {
    const url = newUrl.trim();
    if (!url || !selectedPlaylist) {
      return;
    }

    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === selectedPlaylist.id
          ? { ...playlist, urls: [url, ...playlist.urls], tracks: playlist.tracks + 1, updatedAt: 'Just now' }
          : playlist,
      ),
    );
    setNewUrl('');
  };

  const handleRemoveUrl = (playlistId: number, urlIndex: number) => {
    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              urls: playlist.urls.filter((_, index) => index !== urlIndex),
              tracks: Math.max(0, playlist.tracks - 1),
              updatedAt: 'Just now',
            }
          : playlist,
      ),
    );
  };

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />

      <main className="app">
        <section className="hero glass-card">
          <div className="hero-copy">
            <span className="eyebrow">NightWrapUp / Playlist Studio</span>
            <h1>Create a beautiful home for your YouTube Music links.</h1>
            <p>
              Add, preview, and organize the URLs you plan to save in your database later.
              Start with a smooth, premium interface your users will actually enjoy using.
            </p>

            <div className="hero-actions">
              <button className="primary-btn" type="button">
                Open playlist editor
              </button>
              <button className="secondary-btn" type="button">
                Sync-ready layout
              </button>
              <button className="ghost-btn user-menu" type="button" onClick={handleLogout}>
                {session.user.email} · Log out
              </button>
            </div>
          </div>

          <div className="hero-stats">
            <article className="stat-card">
              <span>Total playlists</span>
              <strong>{playlists.length}</strong>
            </article>
            <article className="stat-card">
              <span>Saved URLs</span>
              <strong>{totalUrls}</strong>
            </article>
            <article className="stat-card">
              <span>Tracks tracked</span>
              <strong>{totalTracks}</strong>
            </article>
          </div>
        </section>

        <section className="content-grid">
          <aside className="glass-card sidebar">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Your playlists</span>
                <h2>Library</h2>
              </div>
              <span className="pill">{playlists.length} items</span>
            </div>

            <div className="playlist-list">
              {playlists.map((playlist) => {
                const isActive = playlist.id === selectedId;
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    className={`playlist-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedId(playlist.id)}
                  >
                    <div className={`playlist-badge ${playlist.accent}`} />
                    <div className="playlist-meta">
                      <strong>{playlist.name}</strong>
                      <span>
                        {playlist.mood} • {playlist.updatedAt}
                      </span>
                    </div>
                    <div className="playlist-count">
                      <span>{playlist.urls.length}</span>
                      <small>links</small>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="note-card">
              <span className="note-label">Database ready</span>
              <p>
                This UI is set up for your future DB save flow. Hook the add/remove actions to
                your API later without redesigning the screen.
              </p>
            </div>
          </aside>

          <section className="glass-card editor">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Playlist details</span>
                <h2>{selectedPlaylist?.name ?? 'Select a playlist'}</h2>
              </div>
              <span className="pill">{selectedPlaylist?.duration ?? '0 min'}</span>
            </div>

            {selectedPlaylist ? (
              <>
                <div className="editor-hero">
                  <div className={`editor-art ${selectedPlaylist.accent}`}>
                    <div className="art-disc">
                      <span />
                    </div>
                  </div>

                  <div className="editor-copy">
                    <p className="editor-mood">{selectedPlaylist.mood}</p>
                    <h3>{selectedPlaylist.tracks} tracks on deck</h3>
                    <p>
                      Drop in the YouTube Music URL you want to keep for this playlist. The
                      interface is intentionally spacious and futuristic so the product feels
                      premium from day one.
                    </p>

                    <div className="url-form">
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(event) => setNewUrl(event.target.value)}
                        placeholder="Paste a YouTube Music URL here"
                      />
                      <button type="button" onClick={handleAddUrl}>
                        Add link
                      </button>
                    </div>
                  </div>
                </div>

                <div className="track-list">
                  {selectedPlaylist.urls.map((url, index) => (
                    <article key={`${url}-${index}`} className="track-item">
                      <div>
                        <span className="track-index">{String(index + 1).padStart(2, '0')}</span>
                        <a href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      </div>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => handleRemoveUrl(selectedPlaylist.id, index)}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h3>No playlist selected</h3>
                <p>Pick a playlist from the sidebar to start adding URLs.</p>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
