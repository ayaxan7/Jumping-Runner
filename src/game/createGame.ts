/**
 * Phaser game factory. The React layer mounts this once into a container
 * div; the FIT scale mode keeps the 960x540 world responsive.
 */

import Phaser from 'phaser';
import { RunnerScene } from './RunnerScene';
import { WORLD } from '../utils/physics';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD.WIDTH,
    height: WORLD.HEIGHT,
    backgroundColor: '#79C6F2',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
      antialias: true,
      roundPixels: false
    },
    fps: {
      target: 60,
      smoothStep: true
    },
    scene: [RunnerScene]
  });
}
