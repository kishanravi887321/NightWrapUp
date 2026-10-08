import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AuthSession, googleAuth } from '../api';

type Props = {
  onAuthenticated: (session: AuthSession) => void;
  sessionError?: string;
};

export default function AuthScreen({ onAuthenticated, sessionError }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSuccess = async (credential?: string) => {
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
          <GoogleLogin onSuccess={(response) => handleSuccess(response.credential)} onError={() => setError('Google sign-in was cancelled or failed.')} useOneTap theme="filled_black" shape="pill" size="large" width="100%" />
        </div>
        {busy && <div className="auth-status">Opening your space…</div>}
        {sessionError && <div className="form-error">{sessionError}</div>}
        {error && <div className="form-error">{error}</div>}
      </section>
    </main>
  );
}
