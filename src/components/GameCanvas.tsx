/**
 * GameCanvas — mounts the Phaser game into a div exactly once and
 * destroys it on unmount. Kept dead simple: all game/UI communication
 * goes through the event bus, never through props.
 */

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { createGame } from '../game/createGame';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    gameRef.current = createGame(containerRef.current);
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="game-canvas" />;
}
