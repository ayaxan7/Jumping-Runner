/**
 * CameraView — renders a mirrored live camera feed with an optional pose
 * skeleton overlay drawn on a canvas.
 *
 * It receives the shared MediaStream (owned by App via useCamera) and attaches
 * it to its own <video> element, so multiple CameraViews can display the same
 * stream simultaneously (calibration preview + in-game monitor).
 */

import { useEffect, useRef } from 'react';
import type { PoseFrame } from '../types';

const MIN_DRAW_CONFIDENCE = 0.3;

/** Keypoint adjacency list (MoveNet keypoint names). */
const BONES: Array<[string, string]> = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

interface CameraViewProps {
  stream: MediaStream | null;
  poseRef: React.MutableRefObject<PoseFrame | null>;
  showSkeleton: boolean;
  className?: string;
}

export function CameraView({ stream, poseRef, showSkeleton, className }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
      if (stream) {
        video.play().catch(() => {
          /* autoplay may be deferred until visible; muted+playsInline covers it */
        });
      }
    }
  }, [stream]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      ctx.clearRect(0, 0, w, h);
      if (!showSkeleton) return;

      const pose = poseRef.current;
      if (!pose) return;

      const byName = new Map(pose.keypoints.map((k) => [k.name, k]));

      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';

      for (const [a, b] of BONES) {
        const ka = byName.get(a);
        const kb = byName.get(b);
        if (!ka || !kb) continue;
        if ((ka.score ?? 0) < MIN_DRAW_CONFIDENCE || (kb.score ?? 0) < MIN_DRAW_CONFIDENCE) continue;
        ctx.beginPath();
        ctx.moveTo(ka.x, ka.y);
        ctx.lineTo(kb.x, kb.y);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      for (const kp of pose.keypoints) {
        if ((kp.score ?? 0) < MIN_DRAW_CONFIDENCE) continue;
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Highlight the hip center — the point jump detection tracks.
      const lh = byName.get('left_hip');
      const rh = byName.get('right_hip');
      if (
        lh &&
        rh &&
        (lh.score ?? 0) >= MIN_DRAW_CONFIDENCE &&
        (rh.score ?? 0) >= MIN_DRAW_CONFIDENCE
      ) {
        ctx.fillStyle = '#FF8A3D';
        ctx.beginPath();
        ctx.arc((lh.x + rh.x) / 2, (lh.y + rh.y) / 2, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [poseRef, showSkeleton]);

  return (
    <div className={`camera-view ${className ?? ''}`}>
      <video ref={videoRef} muted playsInline autoPlay />
      <canvas ref={canvasRef} />
    </div>
  );
}
