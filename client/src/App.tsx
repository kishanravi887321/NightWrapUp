import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import {
  AuthSession,
  ApiError,
  Library,
  Song,
  createLibrary,
  googleAuth,
  listLibraries,
  listLibrarySongs,
  logout,
  refresh,
} from './api';

function AuthScreen({
  onAuthenticated,
  sessionError,
}: {
  onAuthenticated: (session: AuthSession) => void;
  sessionError?: string;
}) {
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
        {sessionError && <div className="form-error">{sessionError}</div>}
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
  const [sessionError, setSessionError] = useState('');
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [libraryName, setLibraryName] = useState('');
  const [libraryDescription, setLibraryDescription] = useState('');
  const [loadingLibraries, setLoadingLibraries] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const renewed = await refresh();
        setSessionError('');
        localStorage.setItem('nightwrapup_user', JSON.stringify(renewed.user));
        if (renewed.extensionToken) {
          localStorage.setItem('nightwrapup_extension_token', renewed.extensionToken);
        }
        setSession(renewed);
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 401) {
          localStorage.removeItem('nightwrapup_user');
          localStorage.removeItem('nightwrapup_extension_token');
          setSession(null);
          setSessionError('Your sign-in session expired. Please sign in again.');
        } else {
          console.error('Unable to restore the sign-in session.', requestError);
          setSessionError(
            requestError instanceof Error
              ? `Unable to restore your session: ${requestError.message}`
              : 'Unable to restore your session. Please try again.',
          );
        }
      } finally {
        setCheckingSession(false);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoadingLibraries(true);
    listLibraries()
      .then((nextLibraries) => {
        setLibraries(nextLibraries);
        setSelectedId((current) => current || nextLibraries[0]?._id || '');
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load libraries.'))
      .finally(() => setLoadingLibraries(false));
  }, [session]);

  useEffect(() => {
    if (!selectedId) {
      setSongs([]);
      return;
    }
    setLoadingSongs(true);
    listLibrarySongs(selectedId)
      .then(setSongs)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load songs.'))
      .finally(() => setLoadingSongs(false));
  }, [selectedId]);

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

  const handleCreateLibrary = async () => {
    const name = libraryName.trim();
    if (!name) return;
    try {
      const library = await createLibrary(name, libraryDescription.trim());
      setLibraries((current) => [library, ...current]);
      setSelectedId(library._id);
      setLibraryName('');
      setLibraryDescription('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create library.');
    }
  };

  if (checkingSession) return <div className="loading-screen">Tuning your night<span>•</span><span>•</span><span>•</span></div>;
  if (!session) return <div className="app-shell"><div className="bg-orb bg-orb-left" /><div className="bg-orb bg-orb-right" /><AuthScreen onAuthenticated={handleAuthenticated} sessionError={sessionError} /></div>;

  const selectedLibrary = libraries.find((library) => library._id === selectedId);
  const totalTracks = libraries.reduce((sum, library) => sum + (library.songCount ?? 0), 0);

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />

      <main className="app">
        {error && (
          <div className="app-alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
        <section className="hero glass-card">
          <div className="hero-copy">
            <span className="eyebrow">NightWrapUp / Playlist Studio</span>
            <h1>Create a beautiful home for your YouTube Music links.</h1>
            <p>
              Add, preview, and organize the URLs you plan to save in your database later.
              Start with a smooth, premium interface your users will actually enjoy using.
            </p>

            <div className="hero-actions">
              <button className="ghost-btn user-menu" type="button" onClick={handleLogout}>
                {session.user.email} · Log out
              </button>
            </div>
          </div>

          <div className="hero-stats">
            <article className="stat-card">
              <span>Total playlists</span>
              <strong>{libraries.length}</strong>
            </article>
            <article className="stat-card">
              <span>Saved URLs</span>
              <strong>{totalTracks}</strong>
            </article>
            <article className="stat-card">
              <span>Tracks tracked</span>
              <strong>{songs.length}</strong>
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
              <span className="pill">{libraries.length} libraries</span>
            </div>

            <div className="playlist-list">
              {libraries.map((library) => {
                const isActive = library._id === selectedId;
                return (
                  <button
                    key={library._id}
                    type="button"
                    className={`playlist-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedId(library._id)}
                  >
                    <div className="playlist-badge from-fuchsia-500 to-violet-600" />
                    <div className="playlist-meta">
                      <strong>{library.name}</strong>
                      <span>{library.description || 'Your personal listening space'}</span>
                    </div>
                    <div className="playlist-count">
                      <span>{library.songCount ?? 0}</span>
                      <small>songs</small>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="library-create">
              <input value={libraryName} onChange={(event) => setLibraryName(event.target.value)} placeholder="New library name" maxLength={80} />
              <input value={libraryDescription} onChange={(event) => setLibraryDescription(event.target.value)} placeholder="Short mood or description" maxLength={240} />
              <button className="primary-btn" type="button" onClick={handleCreateLibrary}>Create library</button>
            </div>
          </aside>

          <section className="glass-card editor">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Playlist details</span>
                <h2>{selectedLibrary?.name ?? 'Select a library'}</h2>
              </div>
              <span className="pill">{loadingSongs ? 'Loading…' : `${songs.length} songs`}</span>
            </div>

            {selectedLibrary ? (
              <>
                <div className="editor-hero">
                  <div className="editor-art from-fuchsia-500 to-violet-600">
                    <div className="art-disc">
                      <span />
                    </div>
                  </div>

                  <div className="editor-copy">
                    <p className="editor-mood">Library • {selectedLibrary.description || 'Late-night listening'}</p>
                    <h3>{songs.length} songs in this library</h3>
                    <p>
                      Your extension saves YouTube songs directly into this library. Add a URL here
                      for a quick web-based save.
                    </p>

                    <div className="url-form">
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(event) => setNewUrl(event.target.value)}
                        placeholder="Paste a YouTube URL here"
                      />
                      <button type="button" onClick={() => setError('Use the extension floating button to save songs.')}>Add link</button>
                    </div>
                  </div>
                </div>

                <div className="track-list">
                  {songs.map((song, index) => (
                    <article key={song._id} className="track-item">
                      <div>
                        <span className="track-index">{String(index + 1).padStart(2, '0')}</span>
                        <a href={song.youtubeUrl} target="_blank" rel="noreferrer">
                          <strong>{song.title}</strong>
                          <small>{song.channelName || song.youtubeVideoId}</small>
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h3>{loadingLibraries ? 'Loading your libraries…' : 'Create your first library'}</h3>
                <p>Your libraries are synced with MongoDB and available to the extension.</p>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
