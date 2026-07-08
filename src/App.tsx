/**
 * App — top-level state machine and wiring hub.
 *
 *   LOADING → CALIBRATION → READY (countdown) → RUNNING ⇄ PAUSED → GAME_OVER
 *
 * Responsibilities:
 *   - Owns the camera MediaStream (useCamera) and feeds it to:
 *       a) a hidden, always-mounted <video> used for pose inference, and
 *       b) any visible CameraView (calibration preview, in-game monitor).
 *   - Runs pose detection (usePoseDetection) which publishes jump events on
 *     the event bus; Phaser consumes them inside RunnerScene.
 *   - Mounts the Phaser canvas once and overlays React UI on top.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { CalibrationScreen } from './components/CalibrationScreen';
import { Countdown } from './components/Countdown';
import { HUD } from './components/HUD';
import { PauseMenu } from './components/PauseMenu';
import { GameOver } from './components/GameOver';
import { SettingsPanel } from './components/SettingsPanel';
import { CameraView } from './components/CameraView';
import { useCamera } from './hooks/useCamera';
import { usePoseDetection } from './hooks/usePoseDetection';
import { bus } from './utils/eventBus';
import { audio } from './utils/audio';
import type { GameOverPayload, GameState } from './types';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('LOADING');
  const [gameOverPayload, setGameOverPayload] = useState<GameOverPayload | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { stream, status: cameraStatus, errorMessage: cameraError, retry } = useCamera(true);

  // Hidden persistent video element that feeds the pose detector.
  const detectionVideoRef = useRef<HTMLVideoElement>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = detectionVideoRef.current;
    if (!video) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
      if (stream) {
        video
          .play()
          .then(() => setVideoEl(video))
          .catch(() => setVideoEl(video));
      } else {
        setVideoEl(null);
      }
    }
  }, [stream]);

  // Pose detection runs whenever we have a video and aren't in pure LOADING.
  const detectionActive =
    gameState === 'CALIBRATION' ||
    gameState === 'READY' ||
    gameState === 'RUNNING' ||
    gameState === 'PAUSED';

  const { modelStatus, modelError, latestPose, jumpDetector } = usePoseDetection(
    videoEl,
    detectionActive,
  );

  // LOADING → CALIBRATION as soon as the app shell is up.
  useEffect(() => {
    setGameState('CALIBRATION');
  }, []);

  // Whether the next countdown should emit ui:start (first run) or ui:restart.
  const pendingStartRef = useRef<'start' | 'restart'>('start');
  const hasRunOnceRef = useRef(false);

  // game:over from Phaser.
  useEffect(() => {
    const off = bus.on('game:over', (payload) => {
      setGameOverPayload(payload);
      setGameState('GAME_OVER');
    });
    return off;
  }, []);

  const beginCountdown = useCallback((mode: 'start' | 'restart') => {
    pendingStartRef.current = mode;
    setGameState('READY');
  }, []);

  const handleCalibrated = useCallback(() => {
    beginCountdown(hasRunOnceRef.current ? 'restart' : 'start');
  }, [beginCountdown]);

  const handleCountdownDone = useCallback(() => {
    if (pendingStartRef.current === 'start') {
      bus.emit('ui:start');
    } else {
      bus.emit('ui:restart');
    }
    hasRunOnceRef.current = true;
    setGameState('RUNNING');
  }, []);

  const handlePause = useCallback(() => {
    bus.emit('ui:pause');
    setGameState('PAUSED');
  }, []);

  const handleResume = useCallback(() => {
    bus.emit('ui:resume');
    setGameState('RUNNING');
  }, []);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleRestart = useCallback(() => {
    setGameOverPayload(null);
    jumpDetector.reset();
    beginCountdown('restart');
  }, [beginCountdown, jumpDetector]);

  const handleRecalibrate = useCallback(() => {
    setGameOverPayload(null);
    jumpDetector.clearCalibration();
    setGameState('CALIBRATION');
  }, [jumpDetector]);

  // Pause when the tab is hidden mid-run.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && gameState === 'RUNNING') handlePause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [gameState, handlePause]);

  // Stop music when leaving RUNNING via React-only paths.
  useEffect(() => {
    if (gameState !== 'RUNNING') audio.stopMusic();
  }, [gameState]);

  const inPlay = gameState === 'RUNNING' || gameState === 'PAUSED';

  return (
    <div className="app">
      {/* Hidden video that powers pose inference for the whole app. */}
      <video ref={detectionVideoRef} className="detection-video" muted playsInline autoPlay />

      <div className="game-layer">
        <GameCanvas />

        {inPlay && <HUD onPause={handlePause} />}

        {inPlay && (
          <div className="camera-monitor">
            <CameraView stream={stream} poseRef={latestPose} showSkeleton />
          </div>
        )}
      </div>

      {gameState === 'CALIBRATION' && (
        <CalibrationScreen
          stream={stream}
          poseRef={latestPose}
          jumpDetector={jumpDetector}
          cameraStatus={cameraStatus}
          cameraError={cameraError}
          modelStatus={modelStatus}
          modelError={modelError}
          onCameraRetry={retry}
          onStart={handleCalibrated}
        />
      )}

      {gameState === 'READY' && <Countdown onDone={handleCountdownDone} />}

      {gameState === 'PAUSED' && !settingsOpen && (
        <PauseMenu onResume={handleResume} onRestart={handleRestart} onSettings={handleOpenSettings} />
      )}

      {settingsOpen && <SettingsPanel onClose={handleCloseSettings} />}

      {gameState === 'GAME_OVER' && gameOverPayload && (
        <GameOver
          result={gameOverPayload}
          onRestart={handleRestart}
          onRecalibrate={handleRecalibrate}
        />
      )}
    </div>
  );
}
