/**
 * HUD — in-game overlay: live score (top-left), high score (top-right),
 * pause + mute controls, and a bottom status strip with the tracking
 * indicator, mini jump meter and the small camera monitor.
 */

import { useEffect, useState } from 'react';
import { JumpMeter } from './JumpMeter';
import { bus } from '../utils/eventBus';
import { audio } from '../utils/audio';
import { loadHighScore } from '../utils/scoring';

interface HUDProps {
  onPause: () => void;
}

export function HUD({ onPause }: HUDProps) {
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [tracking, setTracking] = useState(true);
  const [muted, setMuted] = useState(audio.isMuted);

  useEffect(() => {
    const offScore = bus.on('game:score', ({ score, distance }) => {
      setScore(score);
      setDistance(distance);
    });
    const offTracking = bus.on('vision:tracking', setTracking);
    const offMute = bus.on('audio:mute', setMuted);
    setHighScore(loadHighScore());
    return () => {
      offScore();
      offTracking();
      offMute();
    };
  }, []);

  return (
    <div className="hud" aria-live="off">
      <div className="hud__top">
        <div className="scorecard">
          <span className="scorecard__label">Score</span>
          <span className="scorecard__value">{score.toLocaleString()}</span>
          <span className="scorecard__sub">{distance.toLocaleString()} m</span>
        </div>
        <div className="hud__buttons">
          <button
            className="icon-btn"
            onClick={() => setMuted(audio.toggleMute())}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button className="icon-btn" onClick={onPause} aria-label="Pause game" title="Pause">
            ⏸
          </button>
        </div>
        <div className="scorecard scorecard--high">
          <span className="scorecard__label">Best</span>
          <span className="scorecard__value">{Math.max(highScore, score).toLocaleString()}</span>
        </div>
      </div>

      <div className="hud__bottom">
        <div className={`tracking ${tracking ? 'tracking--ok' : 'tracking--lost'}`} role="status">
          <span className="pill__dot" aria-hidden="true" />
          {tracking ? 'Tracking you — jump for real to jump!' : 'Can’t see you! Step back into frame.'}
        </div>
        <JumpMeter compact />
      </div>
    </div>
  );
}
