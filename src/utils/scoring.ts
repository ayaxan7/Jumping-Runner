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
  MILESTONE: 250,
  /** Bonus points awarded per coin collected. */
  COIN_BONUS: 50
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

const CONFIG_KEY = 'jump-runner:config';

export interface SavedConfig {
  jumpThreshold: number;
  keyboardMode: boolean;
}

export function loadConfig(): SavedConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { jumpThreshold: 0.2, keyboardMode: false };
    return JSON.parse(raw) as SavedConfig;
  } catch {
    return { jumpThreshold: 0.2, keyboardMode: false };
  }
}

export function saveConfig(config: SavedConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* non-fatal */
  }
}

const LEADERBOARD_KEY = 'jump-runner:leaderboard';
const MAX_LEADERBOARD = 5;

export interface LeaderboardEntry {
  score: number;
  distance: number;
  collected: number;
  date: string;
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_LEADERBOARD) : [];
  } catch {
    return [];
  }
}

export function saveLeaderboard(entry: LeaderboardEntry): LeaderboardEntry[] {
  const entries = loadLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  const top = entries.slice(0, MAX_LEADERBOARD);
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top));
  } catch {
    /* non-fatal */
  }
  return top;
}

export function clearLeaderboard(): void {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
  } catch {
    /* non-fatal */
  }
}


