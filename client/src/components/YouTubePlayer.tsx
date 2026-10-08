import { useEffect, useRef } from 'react';

export type PlayerApi = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
};

type Props = {
  videoId: string;
  onReady: (player: PlayerApi) => void;
  onEnded: () => void;
  onProgress: (currentTime: number, duration: number) => void;
  onPlaying: () => void;
  onPaused: () => void;
};

export default function YouTubePlayer({ videoId, onReady, onEnded, onProgress, onPlaying, onPaused }: Props) {
  const playerHostRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onEnded, onProgress, onPlaying, onPaused });
  useEffect(() => {
    callbacks.current = { onReady, onEnded, onProgress, onPlaying, onPaused };
  }, [onReady, onEnded, onProgress, onPlaying, onPaused]);

  useEffect(() => {
    let player: { destroy: () => void } | undefined;
    let timer: number | undefined;
    let cancelled = false;
    const createPlayer = () => {
      if (cancelled || !playerHostRef.current) return;
      const youtube = (window as Window & {
        YT?: { Player: new (element: HTMLDivElement, options: {
          videoId: string;
          playerVars: Record<string, number>;
          events: {
            onReady: (event: { target: PlayerApi }) => void;
            onStateChange: (event: { data: number }) => void;
          };
        }) => { destroy: () => void } };
      }).YT;
      if (!youtube) return;
      player = new youtube.Player(playerHostRef.current, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0 },
        events: {
          onReady: (event) => {
            callbacks.current.onReady(event.target);
            timer = window.setInterval(() => {
              callbacks.current.onProgress(event.target.getCurrentTime(), event.target.getDuration());
            }, 500);
          },
          onStateChange: (event) => {
            if (event.data === 0) callbacks.current.onEnded();
            if (event.data === 1) callbacks.current.onPlaying();
            if (event.data === 2) callbacks.current.onPaused();
          },
        },
      });
    };
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if ((window as Window & { YT?: unknown }).YT) {
      createPlayer();
    } else {
      const script = (existingScript as HTMLScriptElement | null) || document.createElement('script');
      if (!existingScript) {
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
      const windowWithReady = window as Window & { onYouTubeIframeAPIReady?: () => void };
      const previousReady = windowWithReady.onYouTubeIframeAPIReady;
      windowWithReady.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        createPlayer();
      };
    }
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      try {
        player?.destroy();
      } catch (error) {
        console.warn('Unable to clean up the YouTube player.', error);
      }
    };
  }, [videoId]);

  return <div className="audio-player" aria-hidden="true"><div ref={playerHostRef} /></div>;
}
