/**
 * usePoseDetection — owns the vision pipeline lifecycle:
 *
 *   1. Loads the MoveNet model once (with loading/error states).
 *   2. Runs a requestAnimationFrame loop, throttled to ~24 inferences/s
 *      (pose estimation does not need 60 Hz; throttling keeps the main
 *      thread free for Phaser to render at 60 FPS).
 *   3. Feeds frames into the shared JumpDetector and emits
 *      'player:jump' / 'vision:meter' / 'vision:tracking' on the bus.
 *   4. Exposes the latest raw pose for the skeleton overlay.
 */

import { useEffect, useRef, useState } from 'react';
import { PoseDetector } from '../vision/PoseDetector';
import { JumpDetector } from '../vision/JumpDetector';
import { bus } from '../utils/eventBus';
import type { PoseFrame } from '../types';

/** Target pose inference rate, Hz. */
const DETECTION_HZ = 24;
const FRAME_INTERVAL_MS = 1000 / DETECTION_HZ;

interface UsePoseDetectionResult {
  modelStatus: 'loading' | 'ready' | 'error';
  modelError: string | null;
  /** Ref holding the most recent pose — read it inside a rAF, not render. */
  latestPose: React.MutableRefObject<PoseFrame | null>;
  jumpDetector: JumpDetector;
}

/**
 * Module-level singletons: the model survives React remounts and the
 * detector's calibration survives screen transitions.
 */
const poseDetector = new PoseDetector();
const jumpDetector = new JumpDetector();

export function usePoseDetection(
  video: HTMLVideoElement | null,
  active: boolean
): UsePoseDetectionResult {
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>(
    poseDetector.ready ? 'ready' : 'loading'
  );
  const [modelError, setModelError] = useState<string | null>(null);
  const latestPose = useRef<PoseFrame | null>(null);

  /* Load the model once. */
  useEffect(() => {
    let cancelled = false;
    poseDetector
      .init()
      .then(() => {
        if (!cancelled) setModelStatus('ready');
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setModelStatus('error');
          setModelError(
            err instanceof Error
              ? `Pose detection unavailable: ${err.message}`
              : 'Pose detection unavailable. Check your connection and reload.'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Detection loop. */
  useEffect(() => {
    if (!video || !active || modelStatus !== 'ready') return;

    let rafId = 0;
    let lastRun = 0;
    let lastTracking: boolean | null = null;
    let disposed = false;

    const loop = async (now: number) => {
      if (disposed) return;
      if (now - lastRun >= FRAME_INTERVAL_MS) {
        lastRun = now;
        const frame = await poseDetector.estimate(video);
        if (disposed) return;
        if (frame) {
          latestPose.current = frame;
          const meter = jumpDetector.updatePose(frame);
          bus.emit('vision:meter', meter);
          if (meter.tracking !== lastTracking) {
            lastTracking = meter.tracking;
            bus.emit('vision:tracking', meter.tracking);
          }
          if (jumpDetector.isJumpDetected()) {
            bus.emit('player:jump');
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
    };
  }, [video, active, modelStatus]);

  return { modelStatus, modelError, latestPose, jumpDetector };
}
