/**
 * Stub for optional pose-detection backends that this project never uses.
 *
 * @tensorflow-models/pose-detection statically imports `@mediapipe/pose` and
 * `@tensorflow/tfjs-backend-webgpu` for its BlazePose-MediaPipe and WebGPU code
 * paths. We only run MoveNet on the WebGL backend, so those modules are never
 * touched at runtime. Aliasing them to this stub (see vite.config.ts) avoids
 * having to install two heavy, unused dependencies.
 *
 * The named exports below exist only to satisfy the static `import { ... }`
 * statements in the bundle; they are never read because the corresponding
 * runtimes (MediaPipe / WebGPU) are never selected.
 */

// from "@mediapipe/pose"
export const Pose = undefined;

// from "@tensorflow/tfjs-backend-webgpu"
export const webgpu_util = undefined;
export const WebGPUBackend = undefined;
