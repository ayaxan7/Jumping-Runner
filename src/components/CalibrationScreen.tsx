/**
 * CalibrationScreen — guides the player through:
 *
 *   1. Camera + model readiness check (with actionable error states).
 *   2. "Stand still" baseline capture (2.5 s of pose samples → median).
 *   3. An optional test jump to verify detection before playing.
 *   4. Start.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraView } from './CameraView';
import { JumpMeter } from './JumpMeter';
import { bus } from '../utils/eventBus';
import { audio } from '../utils/audio';
import type { JumpDetector } from '../vision/JumpDetector';
import type { CameraStatus, PoseFrame } from '../types';

const CAPTURE_MS = 2500;
const SAMPLE_INTERVAL_MS = 50;

type Step = 'check' | 'capture' | 'capturing' | 'done';

interface CalibrationScreenProps {
  stream: MediaStream | null;
  poseRef: React.MutableRefObject<PoseFrame | null>;
  jumpDetector: JumpDetector;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  modelStatus: 'loading' | 'ready' | 'error';
  modelError: string | null;
  onCameraRetry: () => void;
  onStart: () => void;
}

export function CalibrationScreen({
  stream,
  poseRef,
  jumpDetector,
  cameraStatus,
  cameraError,
  modelStatus,
  modelError,
  onCameraRetry,
  onStart
}: CalibrationScreenProps) {
  const [step, setStep] = useState<Step>(jumpDetector.isCalibrated ? 'done' : 'check');
  const [progress, setProgress] = useState(0);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [testJumped, setTestJumped] = useState(false);
  const timersRef = useRef<number[]>([]);

  const systemsReady = cameraStatus === 'active' && modelStatus === 'ready';

  /* Advance from the check step automatically once everything is live. */
  useEffect(() => {
    if (step === 'check' && systemsReady) setStep('capture');
  }, [step, systemsReady]);

  /* Light up the test-jump confirmation once calibrated. */
  useEffect(() => {
    if (step !== 'done') return;
    return bus.on('player:jump', () => setTestJumped(true));
  }, [step]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const beginCapture = useCallback(() => {
    setCaptureError(null);
    setStep('capturing');
    setProgress(0);

    const frames: PoseFrame[] = [];
    let lastTimestamp = -1;
    const startedAt = performance.now();

    const interval = window.setInterval(() => {
      const pose = poseRef.current;
      if (pose && pose.timestamp !== lastTimestamp) {
        lastTimestamp = pose.timestamp;
        frames.push(pose);
      }
      setProgress(Math.min(1, (performance.now() - startedAt) / CAPTURE_MS));
    }, SAMPLE_INTERVAL_MS);

    const finish = window.setTimeout(() => {
      clearInterval(interval);
      const baseline = jumpDetector.initializeBaseline(frames);
      if (baseline) {
        audio.play('calibrated');
        setStep('done');
      } else {
        setCaptureError(
          "Couldn't see you clearly. Step back so your shoulders and hips are in frame, then try again."
        );
        setStep('capture');
      }
    }, CAPTURE_MS + 100);

    timersRef.current.push(interval, finish);
  }, [jumpDetector, poseRef]);

  const handleStart = useCallback(() => {
    audio.unlock();
    jumpDetector.reset();
    onStart();
  }, [jumpDetector, onStart]);

  const recalibrate = useCallback(() => {
    jumpDetector.clearCalibration();
    setTestJumped(false);
    setStep('capture');
  }, [jumpDetector]);

  return (
    <div className="screen calibration">
      <header className="calibration__header">
        <h1 className="title">
          Jump <span className="title--accent">Runner</span>
        </h1>
        <p className="tagline">No keyboard. No buttons. Your legs are the controller.</p>
      </header>

      <div className="calibration__stage">
        <div className="calibration__camera-frame">
          <CameraView stream={stream} poseRef={poseRef} showSkeleton={systemsReady} />
          {!systemsReady && (
            <div className="calibration__camera-overlay">
              {renderSystemStatus(cameraStatus, cameraError, modelStatus, modelError, onCameraRetry)}
            </div>
          )}
          {step === 'capturing' && (
            <div className="calibration__camera-overlay calibration__camera-overlay--soft">
              <div className="capture-ring" aria-hidden="true" />
              <p className="capture-text">Hold still… {Math.round(progress * 100)}%</p>
              <div className="progress">
                <div className="progress__bar" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        <aside className="calibration__panel">
          {step !== 'done' ? (
            <>
              <h2 className="panel-heading">Get set up</h2>
              <ol className="steps">
                <li className={systemsReady ? 'steps__item steps__item--done' : 'steps__item steps__item--active'}>
                  Allow camera access and step back ~2 m so your <strong>shoulders and hips</strong> are visible.
                </li>
                <li className={step === 'capturing' ? 'steps__item steps__item--active' : 'steps__item'}>
                  Stand still for ~3 seconds while we capture your standing pose.
                </li>
                <li className="steps__item">Do a test jump, then start the run.</li>
              </ol>
              {captureError && <p className="error-text" role="alert">{captureError}</p>}
              <button
                className="btn btn--primary"
                onClick={beginCapture}
                disabled={!systemsReady || step === 'capturing'}
              >
                {step === 'capturing' ? 'Capturing…' : 'Capture standing pose'}
              </button>
            </>
          ) : (
            <>
              <h2 className="panel-heading">Calibrated ✓</h2>
              <p className="panel-text">
                Try a <strong>test jump</strong> — the meter should spike past the orange line.
              </p>
              <div className={`test-jump ${testJumped ? 'test-jump--ok' : ''}`}>
                {testJumped ? 'Jump detected — you’re ready!' : 'Waiting for a test jump…'}
              </div>
              <button className="btn btn--primary" onClick={handleStart}>
                Start running
              </button>
              <button className="btn btn--ghost" onClick={recalibrate}>
                Recalibrate
              </button>
            </>
          )}
          <div className="calibration__meter">
            <JumpMeter />
          </div>
        </aside>
      </div>

      <footer className="calibration__footer">
        <StatusPill ok={cameraStatus === 'active'} label="Camera" />
        <StatusPill ok={modelStatus === 'ready'} label="Pose model" />
        <StatusPill ok={jumpDetector.isCalibrated} label="Calibration" />
      </footer>
    </div>
  );
}

function renderSystemStatus(
  cameraStatus: CameraStatus,
  cameraError: string | null,
  modelStatus: 'loading' | 'ready' | 'error',
  modelError: string | null,
  onCameraRetry: () => void
) {
  if (cameraStatus === 'requesting' || cameraStatus === 'idle') {
    return (
      <>
        <div className="spinner" aria-hidden="true" />
        <p>Waiting for camera permission…</p>
        <p className="hint">Your video never leaves this device — all detection runs locally.</p>
      </>
    );
  }
  if (cameraStatus !== 'active') {
    return (
      <>
        <p className="error-text" role="alert">{cameraError ?? 'No camera detected.'}</p>
        <button className="btn btn--small" onClick={onCameraRetry}>Retry</button>
      </>
    );
  }
  if (modelStatus === 'loading') {
    return (
      <>
        <div className="spinner" aria-hidden="true" />
        <p>Loading pose model…</p>
      </>
    );
  }
  if (modelStatus === 'error') {
    return <p className="error-text" role="alert">{modelError ?? 'Pose detection unavailable.'}</p>;
  }
  return null;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`pill ${ok ? 'pill--ok' : ''}`}>
      <span className="pill__dot" aria-hidden="true" /> {label}
    </span>
  );
}
