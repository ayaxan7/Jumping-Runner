/**
 * Shared types used across the React shell, the vision pipeline and the Phaser game.
 */

/** Top-level finite state machine for the application. */
export type GameState =
  | 'LOADING'
  | 'CALIBRATION'
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'GAME_OVER';

/** A single tracked body landmark, in video pixel coordinates. */
export interface Keypoint {
  x: number;
  y: number;
  /** Detection confidence in [0, 1]. */
  score?: number;
  /** MoveNet landmark name, e.g. "left_hip". */
  name?: string;
}

/** One pose estimation result for one video frame. */
export interface PoseFrame {
  keypoints: Keypoint[];
  /** performance.now() timestamp when the frame was processed. */
  timestamp: number;
}

/** Tunable parameters for the jump detector. */
export interface JumpDetectorConfig {
  /**
   * Upward hip displacement required to register a jump,
   * expressed as a fraction of the user's torso length
   * (shoulder center → hip center). Torso-relative units make the
   * detector independent of how far the user stands from the camera.
   */
  jumpThreshold: number;
  /** Displacement below which the user is considered to have landed. */
  landingThreshold: number;
  /** Minimum time between two registered jumps, in milliseconds. */
  cooldownMs: number;
  /** Number of frames in the moving-average smoothing window. */
  smoothingWindow: number;
  /** Minimum keypoint confidence for a frame to be trusted. */
  minConfidence: number;
}

/** Baseline values captured during the calibration step. */
export interface CalibrationData {
  /** Smoothed hip-center Y while standing still, in video pixels. */
  baselineHipY: number;
  /** Smoothed shoulder→hip distance, used to normalize displacement. */
  torsoLength: number;
  capturedAt: number;
}

/** Live readout the vision layer publishes for UI display. */
export interface JumpMeterSample {
  /** Current normalized upward displacement (fraction of torso length). */
  displacement: number;
  /** Threshold the displacement must exceed to count as a jump. */
  threshold: number;
  /** Whether the detector currently believes the user is airborne. */
  airborne: boolean;
  /** Whether the current pose frame is confident enough to be used. */
  tracking: boolean;
}

export type ObstacleKind =
  | 'cactus'
  | 'bush'
  | 'stone'
  | 'crate'
  | 'spikes'
  | 'pit'
  | 'ledge';

/** Payload emitted by the game scene whenever the run ends. */
export interface GameOverPayload {
  score: number;
  distance: number;
  highScore: number;
  isNewHighScore: boolean;
}

/** Camera acquisition status used by the calibration UI. */
export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'not-found'
  | 'error';
