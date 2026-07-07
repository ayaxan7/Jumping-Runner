/**
 * useCamera — requests webcam access and exposes the MediaStream, with
 * granular error states so the UI can explain exactly what went wrong
 * (denied vs. missing vs. busy vs. unsupported).
 *
 * The hook deliberately returns the *stream* rather than owning a video
 * element: one stream can feed several <video> consumers at once (the
 * hidden detection element, the calibration preview, the in-game
 * monitor) without re-prompting the user.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraStatus } from '../types';

interface UseCameraResult {
  stream: MediaStream | null;
  status: CameraStatus;
  errorMessage: string | null;
  /** Re-attempt acquisition (e.g. after the user grants permission). */
  retry: () => void;
}

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user',
    frameRate: { ideal: 30 }
  }
};

export function useCamera(enabled: boolean): UseCameraResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function acquire() {
      setStatus('requesting');
      setErrorMessage(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMessage(
          'This browser does not support camera access. Use a recent Chrome, Edge or Firefox over HTTPS.'
        );
        return;
      }

      try {
        const media = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = media;
        setStream(media);
        setStatus('active');
      } catch (err) {
        if (cancelled) return;
        const e = err as DOMException;
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          setStatus('denied');
          setErrorMessage(
            'Camera access denied. Click the camera icon in the address bar, allow access, then press Retry.'
          );
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
          setStatus('not-found');
          setErrorMessage('No camera detected. Plug in a webcam and press Retry.');
        } else if (e.name === 'NotReadableError') {
          setStatus('error');
          setErrorMessage('The camera is in use by another application. Close it and press Retry.');
        } else {
          setStatus('error');
          setErrorMessage(`Could not start the camera (${e.name || 'unknown error'}).`);
        }
      }
    }

    void acquire();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    };
  }, [enabled, attempt]);

  return { stream, status, errorMessage, retry };
}
