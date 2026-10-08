type Props = {
  title: string;
  currentTime: number;
  duration: number;
  volume: number;
  paused: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (value: number) => void;
  onVolume: (value: number) => void;
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

export default function PlayerControls(props: Props) {
  const progress = props.duration > 0 ? Math.min(100, (props.currentTime / props.duration) * 100) : 0;
  return (
    <div className="player-controls">
      <div className="player-title"><strong>Now playing</strong><span>{props.title}</span></div>
      <input className="player-progress" type="range" min="0" max={props.duration || 1} value={Math.min(props.currentTime, props.duration || 1)} style={{ '--progress': `${progress}%` } as CSSProperties} onChange={(event) => props.onSeek(Number(event.target.value))} aria-label="Seek song" />
      <div className="player-row">
        <span>{formatTime(props.currentTime)}</span>
        <div className="player-buttons">
          <button type="button" onClick={props.onPrevious} disabled={!props.canGoPrevious} aria-label="Previous song">|◀</button>
          <button className="player-main-button" type="button" onClick={props.onToggle} aria-label={props.paused ? 'Play' : 'Pause'}>{props.paused ? '▶' : '❚❚'}</button>
          <button type="button" onClick={props.onNext} disabled={!props.canGoNext} aria-label="Next song">▶|</button>
        </div>
        <label className="player-volume">🔊 <input type="range" min="0" max="100" value={props.volume} onChange={(event) => props.onVolume(Number(event.target.value))} aria-label="Volume" /></label>
        <span>{formatTime(props.duration)}</span>
      </div>
    </div>
  );
}
import type { CSSProperties } from 'react';
