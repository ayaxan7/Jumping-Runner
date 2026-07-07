/**
 * Centralized physics tuning. Keeping every "feel" number in one file
 * makes the game easy to balance without hunting through scene code.
 *
 * All values are in pixels / pixels-per-second for a 960x540 world.
 */

export const WORLD = {
  WIDTH: 960,
  HEIGHT: 540,
  GROUND_HEIGHT: 96
} as const;

export const PHYSICS = {
  /** Downward acceleration applied to the player, px/s^2. */
  GRAVITY_Y: 2300,
  /** Initial upward velocity when a jump triggers, px/s. */
  JUMP_VELOCITY: -980,
  /** Horizontal world scroll speed at the start of a run, px/s. */
  BASE_SPEED: 320,
  /** Maximum world scroll speed, px/s. */
  MAX_SPEED: 760,
  /** Speed gained per second of survival, px/s^2. */
  SPEED_RAMP: 7.5,
  /** Fixed X position of the runner on screen. */
  PLAYER_X: 180
} as const;

/** Total airtime of a full jump (up + down), in seconds. */
export function jumpAirTime(): number {
  return (2 * Math.abs(PHYSICS.JUMP_VELOCITY)) / PHYSICS.GRAVITY_Y;
}

/**
 * Horizontal distance the world scrolls during one full jump at a given
 * speed. The obstacle spawner uses this to guarantee that every gap
 * between obstacles is physically clearable.
 */
export function jumpClearDistance(speed: number): number {
  return speed * jumpAirTime();
}

/** Peak jump height in pixels, derived from v^2 / 2g. */
export function jumpPeakHeight(): number {
  return (PHYSICS.JUMP_VELOCITY * PHYSICS.JUMP_VELOCITY) / (2 * PHYSICS.GRAVITY_Y);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
