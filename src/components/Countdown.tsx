/**
 * Countdown — 3 · 2 · 1 · GO! shown in the READY state. Gives the player
 * time to get back into standing position in front of the camera.
 */

import { useEffect, useState } from 'react';
import { audio } from '../utils/audio';

interface CountdownProps {
  seconds?: number;
  onDone: () => void;
}

export function Countdown({ seconds = 3, onDone }: CountdownProps) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) {
      const t = window.setTimeout(onDone, 450);
      return () => clearTimeout(t);
    }
    audio.play('countdown');
    const t = window.setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onDone]);

  return (
    <div className="overlay overlay--clear" aria-live="assertive">
      <div className="countdown" key={count}>
        {count > 0 ? count : 'GO!'}
      </div>
      <p className="countdown__hint">Stand ready — jump in real life to jump in game</p>
    </div>
  );
}
