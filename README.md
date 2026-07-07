# Jump Runner 🏃

An infinite side-scrolling runner you control with your **body** — no keyboard, no buttons. Physically jump in front of your webcam and the character jumps in the game.

Built with **React + TypeScript + Vite**, **Phaser 3**, and **TensorFlow.js (MoveNet)**. Runs 100% in the browser — no backend, no data leaves your machine.

---

## Setup

**Requirements**

- Node.js 18+ (20+ recommended)
- A webcam
- A modern desktop browser (Chrome / Edge / Firefox)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open the printed URL (usually `http://localhost:5173`) and allow camera access when prompted.

> Camera access requires a **secure context**: `localhost` works in dev; production must be served over HTTPS (Vercel does this automatically).

## Build

```bash
npm run build      # type-check + production bundle into dist/
npm run preview    # serve the production build locally
```

## Deployment (Vercel)

The repo ships with `vercel.json` (Vite framework preset, `dist` output, and a `Permissions-Policy: camera=(self)` header).

**Option A — Git integration**

1. Push this folder to a GitHub/GitLab repo.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Vercel auto-detects Vite. Click **Deploy**. Done.

**Option B — CLI**

```bash
npm i -g vercel
vercel        # preview deploy
vercel --prod # production
```

No environment variables are required.

---

## Calibration process

Before each session the game calibrates to *your* body and *your* camera position:

1. **System check** — camera permission + MoveNet model load, with live status pills.
2. **Stand still (2.5 s)** — the game samples your pose and takes the **median hip-center Y** as your standing baseline. It also measures your torso length (shoulder→hip) so detection works at any distance from the camera.
3. **Test jump** — jump once to confirm detection fires (watch the Jump Meter cross the threshold line).
4. **Start** — a 3-2-1 countdown and you're running.

Tips for good calibration:

- Stand back so your **shoulders and hips** are both in frame.
- Face the camera in decent lighting.
- Recalibrate if you move the camera or change position (button on the Game Over screen).

## How jump detection works

All logic lives in [`src/vision/JumpDetector.ts`](src/vision/JumpDetector.ts) — a pure, dependency-free class (`initializeBaseline()`, `updatePose()`, `isJumpDetected()`, `reset()`).

1. **MoveNet SinglePose Lightning** estimates 17 keypoints per frame (~24 Hz, throttled independently of the 60 FPS game loop).
2. The detector tracks the **hip center Y** (average of both hips), smoothed with a **moving average** (`smoothingWindow`, default 4 frames) to kill camera shake and pose jitter.
3. Displacement above baseline is **normalized by torso length**, so the same physical jump registers identically whether you're 1 m or 3 m from the camera.
4. A **GROUNDED → AIRBORNE state machine with hysteresis** triggers a jump only when normalized displacement exceeds `jumpThreshold` (default `0.2`, i.e. ~20% of your torso length) for **2 consecutive frames**, and arms again only after you drop back below the lower landing threshold.
5. A **cooldown** (`cooldownMs`, default 450 ms) prevents double-triggers, and low-confidence frames (`minConfidence` 0.3) are ignored entirely.
6. While you're grounded, the baseline **slowly drifts** (EMA) to compensate for you shifting position over a long run.

Why this ignores false positives:

- **Arm waving** — arms aren't part of the hip-center signal.
- **Small bounces / head bobs** — under the threshold + smoothing window.
- **Camera shake** — affects baseline and current position together; smoothing + hysteresis absorb it.
- **Stepping closer/further** — torso-normalized displacement is distance-invariant.

Tune everything in `DEFAULT_JUMP_CONFIG` (`src/vision/JumpDetector.ts`): `jumpThreshold`, `cooldownMs`, `smoothingWindow`, `minConfidence`.

---

## Game design notes

- **Fair-spawn guarantee** — minimum obstacle gap is computed from the *current speed's* jump clearance distance × 1.35 safety factor, so every layout is physically clearable.
- **Object pooling** — obstacles are recycled, never re-created; zero GC churn mid-run.
- **Procedural everything** — all art is drawn at boot with Phaser Graphics (original, no binary assets) and all audio (SFX + chiptune loop) is synthesized with WebAudio.
- **Score** — 10 pts/sec survived + 1 pt per 100 px traveled; milestone chime every 250. High score persists in `localStorage`.
- **States** — `LOADING → CALIBRATION → READY → RUNNING ⇄ PAUSED → GAME_OVER`, driven by a typed event bus between React, the vision layer, and Phaser.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| **"Camera access denied"** | Click the camera icon in the address bar → Allow → use the Retry button. |
| **"No camera detected"** | Plug in / enable a webcam, then Retry. On laptops check the physical privacy shutter. |
| **"Camera is in use by another app"** | Close Zoom/Meet/OBS etc., then Retry. |
| **"Pose detection unavailable"** | Usually a WebGL issue — update GPU drivers or try Chrome/Edge; check `chrome://gpu`. |
| **Jumps not detected** | Step back so shoulders **and** hips are visible; improve lighting; recalibrate; jump higher 🙂 — or lower `jumpThreshold`. |
| **False jumps** | Raise `jumpThreshold` or `smoothingWindow`; make sure only one person is in frame (single-pose model tracks the most prominent person). |
| **Laggy** | Close other GPU-heavy tabs. Pose inference is capped at ~24 Hz and the game targets 60 FPS on any modern desktop GPU. |
| **Blank page on Vercel** | Ensure output dir is `dist` and the framework preset is Vite (already in `vercel.json`). |

**Debug mode (no camera needed):** append `?keyboard=1` to the URL to enable a hidden Space-to-jump fallback for testing game logic.

## Project structure

```
src/
  components/   CameraView, CalibrationScreen, HUD, GameOver, PauseMenu, Countdown, JumpMeter, GameCanvas
  game/         RunnerScene, ObstacleManager, PlayerController, textures (procedural art), createGame
  vision/       PoseDetector (MoveNet wrapper), JumpDetector (pure jump logic)
  hooks/        useCamera, usePoseDetection
  utils/        eventBus, physics, scoring, audio (WebAudio synth)
  types/        shared TypeScript types
  assets/       (empty — all art & audio are generated at runtime)
```

---

© 2026 Jump Runner — original artwork, MIT-style personal use.
# Jumping-Runner
