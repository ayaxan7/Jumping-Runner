/**
 * Thin wrapper around TensorFlow.js MoveNet (SinglePose Lightning).
 *
 * MoveNet Lightning was chosen over MediaPipe BlazePose because it is
 * the fastest browser pose model (~5-8 ms/frame on a modern GPU via the
 * WebGL backend), ships entirely through npm + a small hosted model, and
 * only needs the upper-body landmarks this game cares about.
 */

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import type { Keypoint, PoseFrame } from '../types';

export class PoseDetector {
  private detector: poseDetection.PoseDetector | null = null;
  private initPromise: Promise<void> | null = null;
  private estimating = false;

  /** Idempotent — safe to call from React StrictMode double-effects. */
  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInit().catch((err) => {
        this.initPromise = null; // allow retry on failure
        throw err;
      });
    }
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    await tf.setBackend('webgl');
    await tf.ready();
    this.detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true
      }
    );
  }

  get ready(): boolean {
    return this.detector !== null;
  }

  /**
   * Estimate the pose for the current video frame.
   * Returns null while the model is busy or the video is not ready,
   * so callers can simply poll on requestAnimationFrame.
   */
  async estimate(video: HTMLVideoElement): Promise<PoseFrame | null> {
    if (!this.detector || this.estimating) return null;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
      return null;
    }
    this.estimating = true;
    try {
      const poses = await this.detector.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false
      });
      if (!poses.length) return null;
      const keypoints: Keypoint[] = poses[0].keypoints.map((kp) => ({
        x: kp.x,
        y: kp.y,
        score: kp.score,
        name: kp.name
      }));
      return { keypoints, timestamp: performance.now() };
    } catch {
      return null;
    } finally {
      this.estimating = false;
    }
  }

  dispose(): void {
    this.detector?.dispose();
    this.detector = null;
    this.initPromise = null;
  }
}
