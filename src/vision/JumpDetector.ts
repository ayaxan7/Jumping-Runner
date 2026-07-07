/**
 * JumpDetector — converts a stream of pose frames into discrete,
 * debounced "the human actually jumped" events.
 *
 * Design goals (and how each is met):
 *
 *  1. Ignore arm waving         → only hip + shoulder landmarks are used;
 *                                 arms never enter the math.
 *  2. Ignore small movements    → displacement must exceed `jumpThreshold`,
 *                                 measured as a fraction of torso length.
 *  3. Ignore camera shake/noise → moving-average smoothing window plus a
 *                                 requirement for N consecutive frames
 *                                 above threshold before triggering.
 *  4. Distance-invariant        → everything is normalized by torso length
 *                                 (shoulder center → hip center), so it works
 *                                 whether the user stands 1 m or 3 m away.
 *  5. Posture drift tolerant    → while grounded, the baseline slowly adapts
 *                                 with an EMA so the user can shuffle around
 *                                 without breaking calibration.
 *  6. No double triggers        → explicit GROUNDED → AIRBORNE state machine
 *                                 with hysteresis (separate landing threshold)
 *                                 plus a hard cooldown timer.
 *
 * The class is pure logic with zero DOM/TFJS dependencies, so it can be
 * unit-tested by feeding it synthetic keypoint streams.
 */

import type {
  CalibrationData,
  JumpDetectorConfig,
  JumpMeterSample,
  Keypoint,
  PoseFrame
} from '../types';

export const DEFAULT_JUMP_CONFIG: JumpDetectorConfig = {
  jumpThreshold: 0.2,
  landingThreshold: 0.09,
  cooldownMs: 450,
  smoothingWindow: 4,
  minConfidence: 0.3
};

/** Consecutive confident frames above threshold required to trigger. */
const CONSECUTIVE_FRAMES_TO_TRIGGER = 2;
/** EMA factor for slow baseline drift compensation while grounded. */
const BASELINE_DRIFT_ALPHA = 0.015;

type Phase = 'UNCALIBRATED' | 'GROUNDED' | 'AIRBORNE';

interface BodySample {
  hipY: number;
  torso: number;
}

export class JumpDetector {
  private config: JumpDetectorConfig;
  private phase: Phase = 'UNCALIBRATED';
  private baseline: CalibrationData | null = null;

  private window: number[] = [];
  private framesAboveThreshold = 0;
  private lastJumpAt = -Infinity;
  private jumpPending = false;
  private lastMeter: JumpMeterSample;

  constructor(config: Partial<JumpDetectorConfig> = {}) {
    this.config = { ...DEFAULT_JUMP_CONFIG, ...config };
    this.lastMeter = {
      displacement: 0,
      threshold: this.config.jumpThreshold,
      airborne: false,
      tracking: false
    };
  }

  /* ------------------------------------------------------------------ */
  /* Calibration                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Build the standing baseline from frames collected while the user
   * holds still. Uses the median (not the mean) so a stray bad frame
   * cannot poison the baseline.
   */
  initializeBaseline(frames: PoseFrame[]): CalibrationData | null {
    const samples = frames
      .map((f) => this.extractBody(f.keypoints))
      .filter((s): s is BodySample => s !== null);

    if (samples.length < 5) return null;

    const hipYs = samples.map((s) => s.hipY).sort((a, b) => a - b);
    const torsos = samples.map((s) => s.torso).sort((a, b) => a - b);
    const median = (arr: number[]) => arr[Math.floor(arr.length / 2)];

    this.baseline = {
      baselineHipY: median(hipYs),
      torsoLength: Math.max(1, median(torsos)),
      capturedAt: performance.now()
    };
    this.phase = 'GROUNDED';
    this.window = [];
    this.framesAboveThreshold = 0;
    this.jumpPending = false;
    return this.baseline;
  }

  get isCalibrated(): boolean {
    return this.baseline !== null;
  }

  get calibration(): CalibrationData | null {
    return this.baseline;
  }

  /* ------------------------------------------------------------------ */
  /* Per-frame update                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Feed one pose frame. Returns the live meter sample for UI display.
   * Call `isJumpDetected()` afterwards to consume a pending jump event.
   */
  updatePose(frame: PoseFrame): JumpMeterSample {
    const body = this.extractBody(frame.keypoints);

    if (!body || !this.baseline) {
      this.lastMeter = { ...this.lastMeter, tracking: false };
      return this.lastMeter;
    }

    // Moving-average smoothing of the hip Y position.
    this.window.push(body.hipY);
    if (this.window.length > this.config.smoothingWindow) this.window.shift();
    const smoothedHipY = this.window.reduce((a, b) => a + b, 0) / this.window.length;

    // Upward displacement, normalized by torso length. Screen Y grows
    // downward, so "baseline minus current" is positive when rising.
    const displacement = (this.baseline.baselineHipY - smoothedHipY) / this.baseline.torsoLength;

    const now = frame.timestamp;
    const cooledDown = now - this.lastJumpAt >= this.config.cooldownMs;

    if (this.phase === 'GROUNDED') {
      if (displacement > this.config.jumpThreshold) {
        // Require sustained displacement to reject single-frame noise spikes.
        this.framesAboveThreshold++;
        if (this.framesAboveThreshold >= CONSECUTIVE_FRAMES_TO_TRIGGER && cooledDown) {
          this.phase = 'AIRBORNE';
          this.jumpPending = true;
          this.lastJumpAt = now;
          this.framesAboveThreshold = 0;
        }
      } else {
        this.framesAboveThreshold = 0;
        // Slow baseline drift compensation: tolerate the user gradually
        // shifting posture or the camera settling, without ever adapting
        // fast enough to absorb a real jump.
        this.baseline.baselineHipY +=
          (smoothedHipY - this.baseline.baselineHipY) * BASELINE_DRIFT_ALPHA;
      }
    } else if (this.phase === 'AIRBORNE') {
      // Hysteresis: landing requires dropping well below the jump
      // threshold, preventing flutter at the boundary.
      if (displacement < this.config.landingThreshold) {
        this.phase = 'GROUNDED';
        this.framesAboveThreshold = 0;
      }
    }

    this.lastMeter = {
      displacement,
      threshold: this.config.jumpThreshold,
      airborne: this.phase === 'AIRBORNE',
      tracking: true
    };
    return this.lastMeter;
  }

  /**
   * Edge-triggered: returns true exactly once per detected jump,
   * then clears the pending flag.
   */
  isJumpDetected(): boolean {
    if (this.jumpPending) {
      this.jumpPending = false;
      return true;
    }
    return false;
  }

  get meter(): JumpMeterSample {
    return this.lastMeter;
  }

  reset(): void {
    this.phase = this.baseline ? 'GROUNDED' : 'UNCALIBRATED';
    this.window = [];
    this.framesAboveThreshold = 0;
    this.jumpPending = false;
    this.lastJumpAt = -Infinity;
  }

  /** Drop calibration entirely (user wants to recalibrate). */
  clearCalibration(): void {
    this.baseline = null;
    this.phase = 'UNCALIBRATED';
    this.reset();
  }

  configure(partial: Partial<JumpDetectorConfig>): void {
    this.config = { ...this.config, ...partial };
    this.lastMeter = { ...this.lastMeter, threshold: this.config.jumpThreshold };
  }

  /* ------------------------------------------------------------------ */
  /* Landmark extraction                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Pull hip center + torso length from a keypoint set.
   * Returns null when the required landmarks are missing or below the
   * confidence floor — such frames are ignored entirely so low-light
   * jitter can never fire a jump.
   */
  private extractBody(keypoints: Keypoint[]): BodySample | null {
    const byName = new Map(keypoints.map((k) => [k.name, k]));
    const lHip = byName.get('left_hip');
    const rHip = byName.get('right_hip');
    const lSho = byName.get('left_shoulder');
    const rSho = byName.get('right_shoulder');

    const ok = (k?: Keypoint): k is Keypoint =>
      !!k && (k.score ?? 0) >= this.config.minConfidence;

    if (!ok(lHip) || !ok(rHip) || !ok(lSho) || !ok(rSho)) return null;

    const hipY = (lHip.y + rHip.y) / 2;
    const hipX = (lHip.x + rHip.x) / 2;
    const shoY = (lSho.y + rSho.y) / 2;
    const shoX = (lSho.x + rSho.x) / 2;
    const torso = Math.hypot(hipX - shoX, hipY - shoY);

    if (torso < 10) return null; // degenerate detection
    return { hipY, torso };
  }
}
