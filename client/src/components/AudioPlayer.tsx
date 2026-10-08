import { useEffect, useRef } from 'react';
import type { PlayerApi } from './YouTubePlayer';

type Props = {
  src: string;
  onReady: (player: PlayerApi) => void;
  onEnded: () => void;
  onProgress: (currentTime: number, duration: number) => void;
  onPlaying: () => void;
  onPaused: () => void;
};

export default function AudioPlayer({ src, onReady, onEnded, onProgress, onPlaying, onPaused }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const callbacks = useRef({ onReady, onEnded, onProgress, onPlaying, onPaused });

  useEffect(() => {
    callbacks.current = { onReady, onEnded, onProgress, onPlaying, onPaused };
  }, [onReady, onEnded, onProgress, onPlaying, onPaused]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const player: PlayerApi = {
      playVideo: () => { void audio.play(); },
      pauseVideo: () => audio.pause(),
      seekTo: (seconds) => { audio.currentTime = seconds; },
      setVolume: (nextVolume) => { audio.volume = Math.max(0, Math.min(1, nextVolume / 100)); },
      getCurrentTime: () => audio.currentTime,
      getDuration: () => audio.duration || 0,
    };
    const onTimeUpdate = () => callbacks.current.onProgress(audio.currentTime, audio.duration || 0);
    const onPlay = () => callbacks.current.onPlaying();
    const onPause = () => callbacks.current.onPaused();
    const onEndedEvent = () => callbacks.current.onEnded();
    const onLoadedMetadata = () => {
      callbacks.current.onReady(player);
      callbacks.current.onProgress(audio.currentTime, audio.duration || 0);
      void audio.play().catch(() => callbacks.current.onPaused());
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEndedEvent);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEndedEvent);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [src]);

  return <audio ref={audioRef} className="audio-player" src={src} preload="metadata" />;
}
