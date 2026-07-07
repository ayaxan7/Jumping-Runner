/**
 * Scoring rules and high-score persistence.
 *
 * Score grows continuously with survival time and gets a smaller bonus
 * from distance travelled, so faster (later) sections are worth more.
 */

const HIGH_SCORE_KEY = 'jump-runner:high-score';
const MUTE_KEY = 'jump-runner:muted';

export const SCORING = {
  /** Points per second survived. */
  POINTS_PER_SECOND: 10,
  /** Points per 100 px of distance. */
  POINTS_PER_100PX: 1,
  /** A milestone chime plays every time the score crosses a multiple of this. */
  MILESTONE: 250
} as const;

export function computeScore(elapsedSeconds: number, distancePx: number): number {
  return Math.floor(
    elapsedSeconds * SCORING.POINTS_PER_SECOND +
      (distancePx / 100) * SCORING.POINTS_PER_100PX
  );
}

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    // localStorage can throw in private browsing modes; degrade gracefully.
    return 0;
  }
}

export function saveHighScore(score: number): boolean {
  const current = loadHighScore();
  if (score <= current) return false;
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    /* non-fatal */
  }
  return true;
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* non-fatal */
  }
}
