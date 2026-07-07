/**
 * ObstacleManager — spawns, recycles and difficulty-scales obstacles.
 *
 * Fairness guarantee: the gap between consecutive obstacles is always at
 * least `jumpClearDistance(speed) * SAFETY` pixels, i.e. the distance the
 * world scrolls during one full jump arc plus margin — so every layout
 * the spawner can produce is physically clearable.
 *
 * Object pooling: dead obstacles are deactivated and reused instead of
 * destroyed, so a long run allocates a fixed amount of memory.
 */

import Phaser from 'phaser';
import type { ObstacleKind } from '../types';
import { jumpClearDistance, WORLD, clamp } from '../utils/physics';

interface ObstacleSpec {
  kind: ObstacleKind;
  texture: string;
  /** Hitbox shrink factor relative to the texture, for fair collisions. */
  hitboxScale: { x: number; y: number };
  /** Sits flush into the ground rather than on top of it. */
  sunken?: boolean;
  /** Minimum speed (difficulty gate) before this obstacle appears. */
  minSpeed: number;
  weight: number;
}

const SPECS: ObstacleSpec[] = [
  { kind: 'stone', texture: 'obs_stone', hitboxScale: { x: 0.78, y: 0.7 }, minSpeed: 0, weight: 3 },
  { kind: 'bush', texture: 'obs_bush', hitboxScale: { x: 0.8, y: 0.7 }, minSpeed: 0, weight: 3 },
  { kind: 'cactus', texture: 'obs_cactus', hitboxScale: { x: 0.6, y: 0.85 }, minSpeed: 360, weight: 3 },
  { kind: 'crate', texture: 'obs_crate', hitboxScale: { x: 0.85, y: 0.85 }, minSpeed: 400, weight: 2 },
  { kind: 'ledge', texture: 'obs_ledge', hitboxScale: { x: 0.85, y: 0.7 }, minSpeed: 440, weight: 2 },
  { kind: 'spikes', texture: 'obs_spikes', hitboxScale: { x: 0.85, y: 0.6 }, minSpeed: 480, weight: 2 },
  { kind: 'pit', texture: 'obs_pit', hitboxScale: { x: 0.7, y: 0.9 }, sunken: true, minSpeed: 520, weight: 2 }
];

/** Gap safety multiplier on top of the physical minimum. */
const SAFETY = 1.35;

export class ObstacleManager {
  readonly group: Phaser.Physics.Arcade.Group;
  private scene: Phaser.Scene;
  /** Distance (world px) remaining until the next spawn. */
  private distanceToNext = 600;
  private elapsed = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
  }

  reset(): void {
    this.group.children.each((child) => {
      this.recycle(child as Phaser.Physics.Arcade.Sprite);
      return true;
    });
    this.distanceToNext = 700;
    this.elapsed = 0;
  }

  /**
   * @param delta  ms since last frame
   * @param speed  current world scroll speed, px/s
   */
  update(delta: number, speed: number): void {
    const dt = delta / 1000;
    this.elapsed += dt;
    const scrolled = speed * dt;

    // Move active obstacles left with the world and recycle off-screen ones.
    this.group.children.each((child) => {
      const obs = child as Phaser.Physics.Arcade.Sprite;
      if (obs.active) {
        obs.x -= scrolled;
        if (obs.x < -120) this.recycle(obs);
      }
      return true;
    });

    // Distance-based spawning is frame-rate independent.
    this.distanceToNext -= scrolled;
    if (this.distanceToNext <= 0) {
      this.spawn(speed);
      this.distanceToNext = this.nextGap(speed);
    }
  }

  /**
   * Gap until the next obstacle: never below the physical clear distance,
   * shrinking toward it as difficulty ramps.
   */
  private nextGap(speed: number): number {
    const minGap = jumpClearDistance(speed) * SAFETY + 80;
    // Difficulty: random headroom above the minimum shrinks over time.
    const easiness = clamp(1.6 - this.elapsed / 90, 0.15, 1.6);
    const headroom = Phaser.Math.FloatBetween(0.1, 0.6 + easiness) * minGap;
    return minGap + headroom;
  }

  private pickSpec(speed: number): ObstacleSpec {
    const eligible = SPECS.filter((s) => speed >= s.minSpeed);
    const total = eligible.reduce((sum, s) => sum + s.weight, 0);
    let roll = Math.random() * total;
    for (const spec of eligible) {
      roll -= spec.weight;
      if (roll <= 0) return spec;
    }
    return eligible[0];
  }

  private spawn(speed: number): void {
    const spec = this.pickSpec(speed);
    const groundY = WORLD.HEIGHT - WORLD.GROUND_HEIGHT;

    let obs = this.group.getFirstDead(false) as Phaser.Physics.Arcade.Sprite | null;
    if (!obs) {
      obs = this.group.create(0, 0, spec.texture) as Phaser.Physics.Arcade.Sprite;
    }

    obs.setTexture(spec.texture);
    obs.setActive(true).setVisible(true);
    obs.setDepth(8);

    const tex = this.scene.textures.getFrame(spec.texture);
    const w = tex.width;
    const h = tex.height;

    // Sunken obstacles (pits) sit inside the ground; others rest on it.
    const y = spec.sunken ? groundY + h * 0.32 : groundY - h / 2 + 2;
    obs.setPosition(WORLD.WIDTH + w, y);

    const body = obs.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setSize(w * spec.hitboxScale.x, h * spec.hitboxScale.y);
    body.setOffset((w - w * spec.hitboxScale.x) / 2, (h - h * spec.hitboxScale.y) / 2);

    obs.setData('kind', spec.kind);
  }

  private recycle(obs: Phaser.Physics.Arcade.Sprite): void {
    obs.setActive(false).setVisible(false);
    (obs.body as Phaser.Physics.Arcade.Body).enable = false;
    obs.x = -500;
  }
}
