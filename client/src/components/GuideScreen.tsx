import { useState } from "react";

type Platform = "web" | "extension" | "mobile";

const steps: Record<Platform, { icon: string; title: string; steps: { heading: string; body: string; code?: string }[] }> = {
  web: {
    icon: "🌐",
    title: "Web App",
    steps: [
      { heading: "Sign in with Google", body: "Visit nightwrapup.ziax.online and click \"Sign in with Google\". Your session is managed automatically with secure httpOnly cookies — no passwords required." },
      { heading: "Create a Library", body: "Click the ⋯ menu next to \"Library\" in the left sidebar. Give your library a name (e.g. \"Late Night Beats\") and an optional description, then press Create library." },
      { heading: "Play your music", body: "Select any library from the sidebar to see its songs. Click ▶ on any track to start playing. Songs with a Cloudinary audio URL play natively; others open the YouTube player." },
      { heading: "Generate a Mobile Key", body: "Go to Profile → Mobile listening. Choose any 8-digit numeric code (e.g. 48291637), then press Save mobile key. Use this code to log in on the mobile app.", code: "Profile → Mobile listening → Save mobile key" },
      { heading: "Connect the Chrome Extension", body: "After signing in, the extension content script running on this page automatically reads your extension token from localStorage and stores it in chrome.storage.local. No copy-pasting needed." },
    ],
  },
  extension: {
    icon: "🧩",
    title: "Chrome Extension",
    steps: [
      { heading: "Install the extension", body: "Open chrome://extensions, enable Developer mode, click Load unpacked, and select the NightY folder from your NightWrapUp--Bot directory.", code: "chrome://extensions → Developer mode → Load unpacked → NightY/" },
      { heading: "Sign in on the web app first", body: "The extension has no standalone login. Open nightwrapup.ziax.online and sign in with Google. The content script will automatically sync your extension token." },
      { heading: "Browse YouTube", body: "Go to any YouTube video page (youtube.com/watch, youtu.be, or music.youtube.com). A floating NightWrapUp icon appears in the corner." },
      { heading: "Click the floating icon to save", body: "Click the floating robot icon on the YouTube page. It sends the current YouTube URL to your selected library in one click. The icon turns green on success, red on error." },
      { heading: "Select your default library", body: "Click the NightWrapUp toolbar icon to open the popup. Choose a library from the dropdown — it will be remembered for all future quick-saves from YouTube pages." },
      { heading: "Create a library from the popup", body: "In the extension popup, use the \"Create library\" form to add a new library. It calls POST /api/extension/libraries with your extension JWT.", code: "PUT /api/extension/libraries/:id/songs\nBody: { \"youtubeUrl\": \"https://www.youtube.com/watch?v=...\" }" },
    ],
  },
  mobile: {
    icon: "📱",
    title: "Mobile App",
    steps: [
      { heading: "Generate your mobile key first (web)", body: "Log in at nightwrapup.ziax.online, go to Profile → Mobile listening, and save an 8-digit numeric key. This is your mobile password.", code: "Profile → Mobile listening → Save mobile key" },
      { heading: "Open the mobile app", body: "Install NightWrapUp from the Expo build or run it via Expo Go. On the login screen, enter your Google account email and the 8-digit key you just created." },
      { heading: "Tokens are stored securely", body: "After login, the app stores access and refresh tokens in the platform secure keychain (Android Keystore / iOS Keychain via expo-secure-store).", code: "Key: nightwrapup_access_token\nKey: nightwrapup_refresh_token" },
      { heading: "Browse your libraries", body: "The home screen lists all your libraries synced from MongoDB via GET /api/libraries. Tap any library to see its tracks." },
      { heading: "Play and download", body: "Tap a track with status \"ready\" to play it via Cloudinary CDN. You can also download for offline playback — the app checks your local cache before hitting the network." },
      { heading: "Token refresh is automatic", body: "On a 401 response, the app silently calls /auth/mobile-refresh once. If that also fails, it clears the session and returns you to the login screen.", code: "POST /auth/mobile-refresh\n{ \"refreshToken\": \"STORED_REFRESH_TOKEN\" }" },
    ],
  },
};

const architecture = [
  { label: "Backend API", url: "https://apinightwrapup.ziax.online/api", desc: "Node.js · Express · MongoDB" },
  { label: "Web Frontend", url: "https://nightwrapup.ziax.online", desc: "React 18 · Vite · TypeScript" },
  { label: "Chrome Extension", url: "chrome://extensions", desc: "Manifest V3 · Vanilla JS" },
  { label: "Mobile App", url: "#", desc: "Expo · React Native · TypeScript" },
  { label: "Audio CDN", url: "https://cloudinary.com", desc: "Cloudinary · MP3 hosting" },
  { label: "Database", url: "#", desc: "MongoDB Atlas · Users · Libraries · Songs" },
];

const authPaths = [
  { client: "Web App", method: "Google OAuth + httpOnly Cookies", color: "#7c3aed", icon: "🌐", detail: "Sign in with Google → server sets secure httpOnly cookie → automatic refresh via /auth/refresh" },
  { client: "Chrome Extension", method: "Extension JWT (Bearer)", color: "#0ea5e9", icon: "🧩", detail: "Sign in on web app → content script reads localStorage token → stored in chrome.storage.local" },
  { client: "Mobile App", method: "Secret Key + JWT Tokens", color: "#10b981", icon: "📱", detail: "Email + 8-digit key → server returns accessToken + refreshToken → stored in expo-secure-store" },
];

export default function GuideScreen({ onBack }: { onBack: () => void }) {
  const [activePlatform, setActivePlatform] = useState<Platform>("web");
  const platform = steps[activePlatform];

  return (
    <div className="guide-page">
      <button className="back-link" type="button" onClick={onBack}>← Back to studio</button>

      <div className="guide-hero">
        <div className="guide-hero-badge">Documentation</div>
        <h1 className="guide-hero-title">How to use <span>NightWrapUp</span></h1>
        <p className="guide-hero-sub">One YouTube music library — three ways to use it. Browse on the web, save from YouTube with a single click, and listen on your phone.</p>
      </div>

      <section className="guide-section glass-card">
        <div className="guide-section-header">
          <span className="eyebrow">System overview</span>
          <h2>Three clients. One shared API.</h2>
          <p>Every client talks to the same backend server, the same MongoDB database, and the same Cloudinary audio CDN.</p>
        </div>
        <div className="guide-arch-grid">
          {architecture.map((item) => (
            <div key={item.label} className="guide-arch-card">
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
              {item.url !== "#" && (
                <a href={item.url} target="_blank" rel="noreferrer" className="guide-arch-url">
                  {item.url.replace("https://", "")}
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="guide-section glass-card">
        <div className="guide-section-header">
          <span className="eyebrow">Authentication</span>
          <h2>Three different auth paths</h2>
          <p>Each client has its own login method. No client can use another client&apos;s tokens.</p>
        </div>
        <div className="guide-auth-grid">
          {authPaths.map((a) => (
            <div key={a.client} className="guide-auth-card" style={{ "--auth-color": a.color } as React.CSSProperties}>
              <div className="guide-auth-icon">{a.icon}</div>
              <strong>{a.client}</strong>
              <span className="guide-auth-method">{a.method}</span>
              <p>{a.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="guide-section glass-card">
        <div className="guide-section-header">
          <span className="eyebrow">Step-by-step guides</span>
          <h2>Get started on your platform</h2>
        </div>
        <div className="guide-tabs" role="tablist">
          {(Object.keys(steps) as Platform[]).map((key) => (
            <button key={key} role="tab" aria-selected={activePlatform === key}
              className={`guide-tab ${activePlatform === key ? "active" : ""}`}
              type="button" onClick={() => setActivePlatform(key)}>
              <span>{steps[key].icon}</span>
              {steps[key].title}
            </button>
          ))}
        </div>
        <div className="guide-steps">
          {platform.steps.map((step, i) => (
            <div key={i} className="guide-step">
              <div className="guide-step-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="guide-step-body">
                <strong>{step.heading}</strong>
                <p>{step.body}</p>
                {step.code && <pre className="guide-code"><code>{step.code}</code></pre>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="guide-section glass-card">
        <div className="guide-section-header">
          <span className="eyebrow">What happens when you save a song</span>
          <h2>The full data flow</h2>
        </div>
        <div className="guide-flow">
          {[
            { icon: "▶", label: "YouTube URL", sub: "From extension popup or mobile app" },
            { icon: "→", label: null, sub: null },
            { icon: "⚙", label: "Backend Server", sub: "Validates auth · extracts video ID · fetches metadata" },
            { icon: "→", label: null, sub: null },
            { icon: "☁", label: "Cloudinary", sub: "Downloads audio · converts to MP3 · hosts the file" },
            { icon: "→", label: null, sub: null },
            { icon: "🎵", label: "Song ready", sub: "status: ready · audio.url set · play button enabled" },
          ].map((node, i) =>
            node.label === null ? (
              <div key={i} className="guide-flow-arrow">→</div>
            ) : (
              <div key={i} className="guide-flow-node">
                <div className="guide-flow-icon">{node.icon}</div>
                <strong>{node.label}</strong>
                {node.sub && <span>{node.sub}</span>}
              </div>
            )
          )}
        </div>
      </section>

      <section className="guide-section glass-card">
        <div className="guide-section-header">
          <span className="eyebrow">Song lifecycle</span>
          <h2>Audio processing states</h2>
          <p>After saving a YouTube URL, the server processes it asynchronously. Songs go through three states:</p>
        </div>
        <div className="guide-status-grid">
          <div className="guide-status-card status-pending">
            <span className="status-dot" />
            <strong>pending</strong>
            <p>Song saved to database. Server is downloading and converting the audio. Play button is hidden.</p>
          </div>
          <div className="guide-status-card status-ready">
            <span className="status-dot" />
            <strong>ready</strong>
            <p>MP3 uploaded to Cloudinary. audio.url is set. Play button is enabled across all clients.</p>
          </div>
          <div className="guide-status-card status-failed">
            <span className="status-dot" />
            <strong>failed</strong>
            <p>Conversion failed (e.g. restricted video). Song remains in library but cannot be played.</p>
          </div>
        </div>
      </section>

      <section className="guide-section glass-card">
        <div className="guide-section-header">
          <span className="eyebrow">Developer setup</span>
          <h2>Run everything locally</h2>
        </div>
        <div className="guide-devsetup">
          {[
            { title: "1. Backend server", commands: ["cd D:\\MainPojects\\NightWrapUp\\server", "cp .env.example .env  # fill in MONGODB_URI, JWT_SECRET, GOOGLE_CLIENT_ID, CLOUDINARY_*", "npm install", "npm run dev  # → http://localhost:5000"] },
            { title: "2. Web frontend", commands: ["cd D:\\MainPojects\\NightWrapUp\\client", "cp .env.example .env", "npm install", "npm run dev  # → http://localhost:5173"] },
            { title: "3. Chrome extension", commands: ["Open chrome://extensions", "Enable \"Developer mode\"", "Click \"Load unpacked\"", "Select: D:\\MainPojects\\NightWrapUp--Bot\\NightY\\", "# Then log in on the web app to sync your extension token"] },
            { title: "4. Mobile app", commands: ["cd D:\\MainPojects\\NighWrapExpoReactNativeApp\\Nighty", "npm install", "npx expo start  # scan QR with Expo Go", "# Login: your email + 8-digit key from the web app"] },
          ].map((block) => (
            <div key={block.title} className="guide-devblock">
              <strong>{block.title}</strong>
              <pre className="guide-code"><code>{block.commands.join("\n")}</code></pre>
            </div>
          ))}
          <div className="guide-dep-order">
            <span className="eyebrow">Dependency order</span>
            <p>Backend must be running before any client. Web app must be accessible before the extension gets a token. Mobile secret key must be set on the web before mobile login works.</p>
          </div>
        </div>
      </section>

      <section className="guide-section glass-card">
        <div className="guide-section-header">
          <span className="eyebrow">Security model</span>
          <h2>How your data is protected</h2>
        </div>
        <div className="guide-security-grid">
          {[
            { title: "Web sessions", icon: "🔒", desc: "httpOnly cookies — inaccessible from JavaScript. Short-lived access token + longer refresh token." },
            { title: "Extension JWT", icon: "🎟", desc: "Short-lived JWT with type: \"extension\". Verified by a dedicated middleware. Sender origin checked before storing." },
            { title: "Mobile tokens", icon: "📲", desc: "Stored in Android Keystore / iOS Keychain via expo-secure-store. Never in AsyncStorage or plain preferences." },
            { title: "Mobile key", icon: "🔑", desc: "Your 8-digit key is stored directly (retrievable for display). All API traffic uses HTTPS only." },
            { title: "CORS policy", icon: "🛡", desc: "Only nightwrapup.ziax.online, chrome-extension://* and moz-extension://* origins are permitted." },
            { title: "Secrets", icon: "🗝", desc: "JWT secrets and Cloudinary credentials live only in the server .env file — never in any client code." },
          ].map((item) => (
            <div key={item.title} className="guide-security-card">
              <span className="guide-security-icon">{item.icon}</span>
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
