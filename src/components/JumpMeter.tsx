/**
 * JumpMeter — a live vertical gauge of the player's normalized hip
 * displacement against the jump threshold. It makes the invisible
 * computer-vision state visible: stand still and the bar sleeps at the
 * bottom; crouch and it dips; jump and it spikes past the orange
 * threshold tick and flashes.
 */

import { useEffect, useRef, useState } from 'react';
import { bus } from '../utils/eventBus';
import type { JumpMeterSample } from '../types';

interface JumpMeterProps {
  compact?: boolean;
}

export function JumpMeter({ compact = false }: JumpMeterProps) {
  const [sample, setSample] = useState<JumpMeterSample>({
    displacement: 0,
    threshold: 0.2,
    airborne: false,
    tracking: false
  });
  const flashRef = useRef<number>(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const offMeter = bus.on('vision:meter', setSample);
    const offJump = bus.on('player:jump', () => {
      setFlash(true);
      window.clearTimeout(flashRef.current);
      flashRef.current = window.setTimeout(() => setFlash(false), 400);
    });
    return () => {
      offMeter();
      offJump();
      window.clearTimeout(flashRef.current);
    };
  }, []);

  // Map displacement so the threshold sits at 60% of the bar height.
  const scale = 0.6 / sample.threshold;
  const fill = Math.max(0, Math.min(1, sample.displacement * scale));
  const thresholdPos = 0.6;

  return (
    <div
      className={[
        'jump-meter',
        compact ? 'jump-meter--compact' : '',
        flash ? 'jump-meter--flash' : '',
        sample.tracking ? '' : 'jump-meter--lost'
      ].join(' ')}
      role="meter"
      aria-label="Jump meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fill * 100)}
    >
      <div className="jump-meter__track">
        <div className="jump-meter__fill" style={{ height: `${fill * 100}%` }} />
        <div className="jump-meter__threshold" style={{ bottom: `${thresholdPos * 100}%` }} />
      </div>
      {!compact && <span className="jump-meter__label">{flash ? 'JUMP!' : 'lift'}</span>}
    </div>
  );
}
