import { useEffect, useRef, useState } from 'react';
import {
  AuthSession,
  ApiError,
  Library,
  Song,
  createLibrary,
  deleteLibrary,
  deleteSong,
  listLibraries,
  listLibrarySongs,
  createMobileSecretKey,
  revokeMobileSecretKey,
  logout,
  recordSongPlay,
  refresh,
} from './api';
import AuthScreen from './components/AuthScreen';
import AudioPlayer from './components/AudioPlayer';
import PlayerControls from './components/PlayerControls';
import YouTubePlayer, { PlayerApi } from './components/YouTubePlayer';

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
  const [playingSongId, setPlayingSongId] = useState('');
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const playerRef = useRef<PlayerApi | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [showLibraryMenu, setShowLibraryMenu] = useState(false);
  const [libraryName, setLibraryName] = useState('');
  const [libraryDescription, setLibraryDescription] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [loadingLibraries, setLoadingLibraries] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<'studio' | 'profile'>('studio');
  const [mobileSecretKey, setMobileSecretKey] = useState('');
  const [mobileKeyInput, setMobileKeyInput] = useState('');
  const [showMobileSecretKey, setShowMobileSecretKey] = useState(true);
  const [mobileKeyBusy, setMobileKeyBusy] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      if (!localStorage.getItem('nightwrapup_user')) {
        setCheckingSession(false);
        return;
      }
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
    if (!session || checkingSession) return;
    setLoadingLibraries(true);
    listLibraries()
      .then((nextLibraries) => {
        setLibraries(nextLibraries);
        setSelectedId((current) => current || nextLibraries[0]?._id || '');
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load libraries.'))
      .finally(() => setLoadingLibraries(false));
  }, [session, checkingSession]);

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

  useEffect(() => {
    setPlayingSongId('');
    setPlayingIndex(-1);
    playerRef.current = null;
    setCurrentTime(0);
    setDuration(0);
  }, [selectedId]);

  const selectedLibrary = libraries.find((library) => library._id === selectedId);
  const totalPlays = songs.reduce((sum, song) => sum + (song.playCount ?? 0), 0);

  const handleCreateLibrary = async () => {
    const name = libraryName.trim();
    if (!name) return;
    try {
      const library = await createLibrary(name, libraryDescription.trim());
      setLibraries((current) => [library, ...current]);
      setSelectedId(library._id);
      setLibraryName('');
      setLibraryDescription('');
      setShowLibraryMenu(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create library.');
    }
  };

  const playSong = (index: number) => {
    const song = songs[index];
    if (!song) return;
    setPlayingIndex(index);
    setPlayingSongId(song._id);
    setIsPaused(false);
    void recordSongPlay(selectedId, song._id)
      .then((updatedSong) => {
        setSongs((current) => current.map((item) => item._id === updatedSong._id ? updatedSong : item));
      })
      .catch((requestError) => console.warn('Unable to record song play.', requestError));
  };

  const playNextSong = () => {
    if (songs.length === 0) {
      setPlayingSongId('');
      setPlayingIndex(-1);
      return;
    }
    if (playingIndex >= 0) {
      playSong((playingIndex + 1) % songs.length);
      return;
    }
    playSong(0);
    playerRef.current = null;
    setCurrentTime(0);
    setDuration(0);
  };

  const handleDeleteSong = async (song: Song) => {
    if (!selectedId || !window.confirm(`Delete "${song.title}"?`)) return;
    try {
      await deleteSong(selectedId, song._id);
      setSongs((current) => current.filter((item) => item._id !== song._id));
      setLibraries((current) => current.map((library) => library._id === selectedId
        ? { ...library, songCount: Math.max(0, (library.songCount ?? 1) - 1) }
        : library));
      if (playingSongId === song._id) playNextSong();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete the song.');
    }
  };

  const handleDeleteLibrary = async () => {
    if (!selectedLibrary) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedLibrary.name}" and all its songs?`)) return;
    const confirmation = window.prompt('Type "delete this library" to confirm.');
    if (confirmation !== 'delete this library') {
      setError('Library deletion cancelled. The confirmation text did not match.');
      return;
    }
    try {
      await deleteLibrary(selectedLibrary._id);
      const remaining = libraries.filter((library) => library._id !== selectedLibrary._id);
      setLibraries(remaining);
      setSelectedId(remaining[0]?._id || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete the library.');
    }
  };

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

  const handleCreateMobileKey = async () => {
    if (!/^\d{8}$/.test(mobileKeyInput)) {
      setError('Your mobile key must contain exactly 8 digits.');
      return;
    }
    setMobileKeyBusy(true);
    setError('');
    try {
      const result = await createMobileSecretKey(mobileKeyInput);
      setMobileSecretKey(result.secretKey);
      setMobileKeyInput('');
      setShowMobileSecretKey(true);
      setSession((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                mobileAccessEnabled: true,
                mobileSecretKeyCreatedAt: result.createdAt,
                mobileSecretKeyLastUsedAt: undefined,
              },
            }
          : current,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the mobile key.');
    } finally {
      setMobileKeyBusy(false);
    }
  };

  const handleRevokeMobileKey = async () => {
    if (!window.confirm('Revoke mobile access? The current key will stop working immediately.')) return;
    setMobileKeyBusy(true);
    setError('');
    try {
      await revokeMobileSecretKey();
      setMobileSecretKey('');
      setShowMobileSecretKey(false);
      setSession((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                mobileAccessEnabled: false,
                mobileSecretKeyCreatedAt: undefined,
                mobileSecretKeyLastUsedAt: undefined,
              },
            }
          : current,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to revoke mobile access.');
    } finally {
      setMobileKeyBusy(false);
    }
  };

  const copyMobileKey = async () => {
    if (!mobileSecretKey) return;
    await navigator.clipboard.writeText(mobileSecretKey);
  };

  if (checkingSession) return <div className="loading-screen">Tuning your night<span>•</span><span>•</span><span>•</span></div>;
  if (!session) return <div className="app-shell"><div className="bg-orb bg-orb-left" /><div className="bg-orb bg-orb-right" /><AuthScreen onAuthenticated={handleAuthenticated} sessionError={sessionError} /></div>;

  const profileName = session.user.email.split('@')[0];

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />

      <main className="app">
        <nav className="app-nav" aria-label="Main navigation">
          <button className="app-brand" type="button" onClick={() => setActiveView('studio')}>NW <span>NightWrapUp</span></button>
          <button className={`nav-link ${activeView === 'studio' ? 'active' : ''}`} type="button" onClick={() => setActiveView('studio')}>Studio</button>
          <button className={`nav-link ${activeView === 'profile' ? 'active' : ''}`} type="button" onClick={() => setActiveView('profile')}>Profile</button>
        </nav>
        {error && (
          <div className="app-alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
        {activeView === 'profile' ? (
          <section className="profile-page glass-card">
            <button className="back-link" type="button" onClick={() => setActiveView('studio')}>← Back to studio</button>
            <div className="profile-page-heading">
              <div className="profile-avatar" aria-hidden="true">{session.user.email.charAt(0).toUpperCase()}</div>
              <div>
                <span className="eyebrow">Account settings</span>
                <h1>Your profile</h1>
                <p>Manage your NightWrapUp account and listening space.</p>
              </div>
            </div>
            <div className="profile-details">
              <div><span>Name</span><strong>{profileName}</strong></div>
              <div><span>Email</span><strong>{session.user.email}</strong></div>
              <div><span>Libraries</span><strong>{libraries.length}</strong></div>
              <div><span>Account</span><strong>Private account</strong></div>
            </div>
            <section className="mobile-access-card">
              <span className="eyebrow">Mobile listening</span>
              <h2>Connect your phone</h2>
              <p>
                Choose an 8-digit mobile key here, then use it with your email in the listening app.
              </p>
              {mobileSecretKey ? (
                <div className="mobile-key-reveal">
                  <code aria-label={showMobileSecretKey ? 'Visible mobile key' : 'Hidden mobile key'}>
                    {showMobileSecretKey ? mobileSecretKey : '••••••••'}
                  </code>
                  <button
                    className="secondary-btn mobile-key-eye"
                    type="button"
                    onClick={() => setShowMobileSecretKey((visible) => !visible)}
                    aria-label={showMobileSecretKey ? 'Hide mobile key' : 'Show mobile key'}
                    title={showMobileSecretKey ? 'Hide mobile key' : 'Show mobile key'}
                  >
                    {showMobileSecretKey ? '◉' : '◎'}
                  </button>
                  <button className="secondary-btn" type="button" onClick={copyMobileKey}>Copy key</button>
                </div>
              ) : (
                <div className="mobile-access-actions mobile-key-form">
                  <label htmlFor="mobile-key-input">Choose an 8-digit key</label>
                  <input
                    id="mobile-key-input"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{8}"
                    maxLength={8}
                    value={mobileKeyInput}
                    onChange={(event) => setMobileKeyInput(event.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="00000000"
                    autoComplete="new-password"
                  />
                  <button className="primary-btn" type="button" onClick={handleCreateMobileKey} disabled={mobileKeyBusy}>
                    {mobileKeyBusy ? 'Saving…' : session.user.mobileAccessEnabled ? 'Change mobile key' : 'Save mobile key'}
                  </button>
                  {session.user.mobileAccessEnabled && (
                    <button className="danger-btn" type="button" onClick={handleRevokeMobileKey} disabled={mobileKeyBusy}>
                      Revoke access
                    </button>
                  )}
                </div>
              )}
              {session.user.mobileSecretKeyCreatedAt && (
                <small className="mobile-key-meta">
                  Key created {new Date(session.user.mobileSecretKeyCreatedAt).toLocaleDateString()}
                  {session.user.mobileSecretKeyLastUsedAt
                    ? ` · Last used ${new Date(session.user.mobileSecretKeyLastUsedAt).toLocaleDateString()}`
                    : ' · Not used yet'}
                </small>
              )}
              {mobileSecretKey && (
                <button className="ghost-btn mobile-key-dismiss" type="button" onClick={() => {
                  setMobileSecretKey('');
                  setShowMobileSecretKey(false);
                }}>
                  Hide key
                </button>
              )}
            </section>
            <button className="profile-logout profile-page-logout" type="button" onClick={handleLogout}>Log out</button>
          </section>
        ) : (
        <>
        <section className="content-grid">
          <aside className="glass-card sidebar">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Your playlists</span>
                <h2>Library</h2>
              </div>
              <div className="library-heading-actions">
                <span className="pill">{libraries.length} libraries</span>
                <button
                  className={`menu-button ${showLibraryMenu ? 'active' : ''}`}
                  type="button"
                  onClick={() => setShowLibraryMenu((current) => !current)}
                  aria-label="Open library actions"
                  aria-expanded={showLibraryMenu}
                >
                  <span />
                  <span />
                  <span />
                </button>
              </div>
            </div>

            {showLibraryMenu && (
              <div className="library-menu">
                <div className="library-menu-section">
                  <span className="menu-label">Create library</span>
                  <input value={libraryName} onChange={(event) => setLibraryName(event.target.value)} placeholder="Library name" maxLength={80} />
                  <input value={libraryDescription} onChange={(event) => setLibraryDescription(event.target.value)} placeholder="Description (optional)" maxLength={240} />
                  <button className="primary-btn" type="button" onClick={handleCreateLibrary}>Create library</button>
                </div>
                {selectedLibrary && (
                  <div className="library-menu-section">
                    <span className="menu-label">Save a song</span>
                    <input type="url" value={newUrl} onChange={(event) => setNewUrl(event.target.value)} placeholder="Paste a YouTube URL" />
                    <button className="secondary-btn" type="button" onClick={() => setError('Use the extension floating button to save songs.')}>Add link</button>
                  </div>
                )}
              </div>
            )}

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
                    {isActive && songs[0]?.thumbnail ? (
                      <img className="playlist-badge" src={songs[0].thumbnail} alt="" />
                    ) : (
                      <div className="playlist-badge from-fuchsia-500 to-violet-600" />
                    )}
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

          </aside>

          <section className="glass-card editor">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Playlist details</span>
                <h2>{selectedLibrary?.name ?? 'Select a library'}</h2>
              </div>
              <div className="editor-actions">
                <span className="pill">{loadingSongs ? 'Loading…' : `${songs.length} songs`}</span>
                {selectedLibrary && <button className="danger-btn" type="button" onClick={handleDeleteLibrary}>Delete library</button>}
              </div>
            </div>

            {selectedLibrary ? (
              <>
                <div className="editor-hero">
                  <div className="editor-art from-fuchsia-500 to-violet-600">
                    {songs[0]?.thumbnail && <img src={songs[0].thumbnail} alt="" />}
                    <div className="art-disc">
                      <span />
                    </div>
                  </div>

                  <div className="editor-copy">
                    <p className="editor-mood">Library • {selectedLibrary.description || 'Late-night listening'}</p>
                    <h3>{songs.length} songs · {totalPlays} plays</h3>
                  </div>
                </div>

                {playingSongId && songs[playingIndex] && (
                  <PlayerControls
                    title={songs[playingIndex].title}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    paused={isPaused}
                    canGoPrevious={playingIndex > 0}
                    canGoNext={songs.length > 1}
                    onToggle={() => {
                      if (isPaused) {
                        playerRef.current?.playVideo();
                      } else {
                        playerRef.current?.pauseVideo();
                      }
                      setIsPaused((current) => !current);
                    }}
                    onPrevious={() => playingIndex > 0 && playSong(playingIndex - 1)}
                    onNext={() => songs.length > 1 && playSong((playingIndex + 1) % songs.length)}
                    onSeek={(value) => {
                      playerRef.current?.seekTo(value, true);
                      setCurrentTime(value);
                    }}
                    onVolume={(value) => {
                      setVolume(value);
                      playerRef.current?.setVolume(value);
                    }}
                  />
                )}

                <div className="track-list">
                  {songs.map((song, index) => (
                    <article key={song._id} className="track-item">
                      <div>
                        <span className="track-index">{String(index + 1).padStart(2, '0')}</span>
                        <button
                          className={`track-play ${playingSongId === song._id ? 'playing' : ''}`}
                          type="button"
                          aria-label={playingSongId === song._id ? `Stop ${song.title}` : `Play ${song.title}`}
                          onClick={() => playingSongId === song._id
                            ? setPlayingSongId('')
                            : playSong(index)}
                        >
                          {playingSongId === song._id ? '❚❚' : '▶'}
                        </button>
                        <div className="track-details">
                          <strong>{song.title}</strong>
                          <small>{song.channelName || song.youtubeVideoId}</small>
                        </div>
                      </div>
                      {playingSongId === song._id && (
                        song.audio?.url ? (
                          <AudioPlayer
                            src={song.audio.url}
                            onReady={(player) => {
                              playerRef.current = player;
                              player.setVolume(volume);
                            }}
                            onEnded={playNextSong}
                            onPlaying={() => setIsPaused(false)}
                            onPaused={() => setIsPaused(true)}
                            onProgress={(nextTime, nextDuration) => {
                              setCurrentTime(nextTime);
                              setDuration(nextDuration);
                            }}
                          />
                        ) : (
                          <YouTubePlayer
                            videoId={song.youtubeVideoId}
                            onReady={(player) => {
                              playerRef.current = player;
                              player.setVolume(volume);
                            }}
                            onEnded={playNextSong}
                            onPlaying={() => setIsPaused(false)}
                            onPaused={() => setIsPaused(true)}
                            onProgress={(nextTime, nextDuration) => {
                              setCurrentTime(nextTime);
                              setDuration(nextDuration);
                            }}
                          />
                        )
                      )}
                      <div className="track-actions">
                        <small className="track-plays">{song.playCount ?? 0} plays</small>
                        <button className="track-delete" type="button" onClick={() => handleDeleteSong(song)} aria-label={`Delete ${song.title}`}>×</button>
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
        </>
        )}
      </main>
    </div>
  );
}

export default App;
