/**
 * PauseMenu — resume / restart, plus a mute toggle.
 */

import { useState } from 'react';
import { audio } from '../utils/audio';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
}

export function PauseMenu({ onResume, onRestart }: PauseMenuProps) {
  const [muted, setMuted] = useState(audio.isMuted);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="card">
        <h2 id="pause-title" className="card__title">Paused</h2>
        <p className="panel-text">Catch your breath. The obstacles will wait.</p>
        <button className="btn btn--primary" onClick={onResume} autoFocus>
          Resume
        </button>
        <button className="btn btn--ghost" onClick={onRestart}>
          Restart run
        </button>
        <button className="btn btn--ghost" onClick={() => setMuted(audio.toggleMute())}>
          {muted ? 'Unmute sound' : 'Mute sound'}
        </button>
      </div>
    </div>
  );
}
