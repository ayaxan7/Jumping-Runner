/**
 * Procedural cartoon artwork.
 *
 * Every texture in the game (sky, parallax layers, the runner's
 * animation frames, all seven obstacle types) is drawn at boot time with
 * the Phaser Graphics API and baked into textures. This keeps the repo
 * free of binary assets, guarantees original artwork, and makes the
 * whole art style tweakable from one file.
 *
 * The runner is "Mario-inspired" in silhouette only — a chunky cartoon
 * jumper with a cap — but uses an original orange/teal palette and
 * original drawing.
 */

import Phaser from 'phaser';
import { WORLD } from '../utils/physics';

export const PALETTE = {
  skyTop: '#79C6F2',
  skyBottom: '#CDEFFF',
  sun: 0xffe066,
  mountainFar: 0x9db8d9,
  mountainNear: 0x7e9cc4,
  snow: 0xf2f7ff,
  hill: 0x6fbf63,
  hillDark: 0x57a84e,
  treeTrunk: 0x7a4f2b,
  treeLeaf: 0x3f9342,
  treeLeafLight: 0x55ab57,
  grass: 0x58b24a,
  grassDark: 0x46963a,
  dirt: 0x8b5a33,
  dirtDark: 0x744a28,
  cloud: 0xffffff,
  // Runner
  cap: 0xff8a3d,
  capDark: 0xe06a1f,
  skin: 0xffd9a0,
  shirt: 0xff8a3d,
  overalls: 0x2e6f8e,
  overallsDark: 0x215a75,
  boot: 0x5d3a1f,
  eye: 0x2b2b2b,
  // Obstacles
  cactus: 0x3e9b4f,
  cactusDark: 0x2f7c3d,
  bush: 0x2f6e35,
  thorn: 0x1d4a22,
  stone: 0x9a9a9a,
  stoneDark: 0x7d7d7d,
  stoneLight: 0xbcbcbc,
  crate: 0xb07b3e,
  crateDark: 0x8a5e2c,
  spike: 0xaab2bd,
  spikeDark: 0x7f8893,
  pit: 0x231510,
  pitEdge: 0x4a2f1c,
  // Collectibles
  coin: 0xffd700,
  coinDark: 0xdaa520
} as const;

/** Entry point — call once from the scene's create(). */
export function createAllTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('runner_run_0')) return; // hot-restart guard
  createSky(scene);
  createCloud(scene);
  createMountains(scene);
  createTreeline(scene);
  createGround(scene);
  createRunnerFrames(scene);
  createCoin(scene);
  createCoinParticle(scene);
  createObstacles(scene);
}

/* ---------------------------------------------------------------------- */
/* Environment                                                             */
/* ---------------------------------------------------------------------- */

function createSky(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('sky', WORLD.WIDTH, WORLD.HEIGHT);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, WORLD.HEIGHT);
  grad.addColorStop(0, PALETTE.skyTop);
  grad.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.WIDTH, WORLD.HEIGHT);
  tex.refresh();
}

function createCloud(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.cloud, 1);
  g.fillCircle(28, 30, 20);
  g.fillCircle(52, 22, 24);
  g.fillCircle(78, 30, 18);
  g.fillRoundedRect(14, 28, 78, 18, 9);
  g.generateTexture('cloud', 104, 52);
  g.destroy();
}

/** Tileable far-mountain ridge, 960 wide. */
function createMountains(scene: Phaser.Scene): void {
  const W = WORLD.WIDTH;
  const H = 220;
  const g = scene.add.graphics();
  // Far ridge
  g.fillStyle(PALETTE.mountainFar, 1);
  drawRidge(g, W, H, [0, 150, 240, 60, 480, 170, 700, 80, 960, 150], 40);
  // Near ridge
  g.fillStyle(PALETTE.mountainNear, 1);
  drawRidge(g, W, H, [0, 190, 160, 100, 380, 200, 600, 110, 820, 195, 960, 190], 70);
  // Snow caps on the near ridge peaks
  g.fillStyle(PALETTE.snow, 1);
  snowCap(g, 160, 100 + 70);
  snowCap(g, 600, 110 + 70);
  g.generateTexture('mountains', W, H);
  g.destroy();
}

function drawRidge(g: Phaser.GameObjects.Graphics, w: number, h: number, pts: number[], yOff: number): void {
  g.beginPath();
  g.moveTo(0, h);
  for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1] + yOff - 70);
  g.lineTo(w, h);
  g.closePath();
  g.fillPath();
}

function snowCap(g: Phaser.GameObjects.Graphics, x: number, peakY: number): void {
  g.fillTriangle(x - 26, peakY - 44, x + 26, peakY - 44, x, peakY - 70);
}

/** Tileable rolling hills + trees layer. */
function createTreeline(scene: Phaser.Scene): void {
  const W = WORLD.WIDTH;
  const H = 150;
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.hill, 1);
  g.fillEllipse(160, H + 50, 520, 200);
  g.fillEllipse(560, H + 70, 620, 230);
  g.fillEllipse(900, H + 50, 480, 190);
  g.fillStyle(PALETTE.hillDark, 1);
  g.fillEllipse(360, H + 90, 460, 180);
  g.fillEllipse(820, H + 100, 520, 190);
  // Trees scattered deterministically so the tile repeats seamlessly
  const treeXs = [70, 215, 330, 470, 610, 735, 880];
  treeXs.forEach((x, i) => drawTree(g, x, H - 14 + (i % 3) * 8, 0.75 + (i % 2) * 0.2));
  g.generateTexture('treeline', W, H);
  g.destroy();
}

function drawTree(g: Phaser.GameObjects.Graphics, x: number, baseY: number, s: number): void {
  g.fillStyle(PALETTE.treeTrunk, 1);
  g.fillRect(x - 4 * s, baseY - 26 * s, 8 * s, 26 * s);
  g.fillStyle(PALETTE.treeLeaf, 1);
  g.fillCircle(x, baseY - 40 * s, 20 * s);
  g.fillCircle(x - 14 * s, baseY - 28 * s, 14 * s);
  g.fillCircle(x + 14 * s, baseY - 28 * s, 14 * s);
  g.fillStyle(PALETTE.treeLeafLight, 1);
  g.fillCircle(x - 5 * s, baseY - 45 * s, 9 * s);
}

/** Tileable ground strip: grass lip over dirt. */
function createGround(scene: Phaser.Scene): void {
  const W = 192;
  const H = WORLD.GROUND_HEIGHT;
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.dirt, 1);
  g.fillRect(0, 0, W, H);
  // Dirt speckles
  g.fillStyle(PALETTE.dirtDark, 1);
  const speckles = [12, 40, 58, 70, 96, 34, 130, 62, 160, 44, 80, 80, 178, 76, 24, 70];
  for (let i = 0; i < speckles.length; i += 2) {
    g.fillCircle(speckles[i], speckles[i + 1] + 8, 4);
  }
  // Grass lip
  g.fillStyle(PALETTE.grass, 1);
  g.fillRect(0, 0, W, 18);
  g.fillStyle(PALETTE.grassDark, 1);
  for (let x = 0; x < W; x += 16) {
    g.fillTriangle(x, 18, x + 8, 18, x + 4, 26);
  }
  g.generateTexture('ground', W, H);
  g.destroy();
}

/* ---------------------------------------------------------------------- */
/* Runner                                                                  */
/* ---------------------------------------------------------------------- */

const RUNNER_W = 52;
const RUNNER_H = 68;

/**
 * Leg poses per animation frame: [frontLegX, frontLen, backLegX, backLen].
 * X offsets are relative to the body center; lengths give the stride.
 */
const RUN_POSES: Array<[number, number, number, number]> = [
  [9, 16, -9, 12], // full stride
  [4, 17, -2, 16], // passing
  [-8, 13, 10, 16], // opposite stride
  [-2, 16, 4, 17] // passing
];

function createRunnerFrames(scene: Phaser.Scene): void {
  RUN_POSES.forEach((pose, i) => {
    const g = scene.add.graphics();
    drawRunner(g, { legs: pose, bob: i % 2 === 0 ? 0 : 2 });
    g.generateTexture(`runner_run_${i}`, RUNNER_W, RUNNER_H);
    g.destroy();
  });

  const jump = scene.add.graphics();
  drawRunner(jump, { legs: [7, 8, -7, 7], bob: -2, jumping: true });
  jump.generateTexture('runner_jump', RUNNER_W, RUNNER_H);
  jump.destroy();

  const dead = scene.add.graphics();
  drawRunner(dead, { legs: [8, 10, -8, 10], bob: 0, dead: true });
  dead.generateTexture('runner_dead', RUNNER_W, RUNNER_H);
  dead.destroy();
}

interface RunnerPose {
  legs: [number, number, number, number];
  bob: number;
  jumping?: boolean;
  dead?: boolean;
}

function drawRunner(g: Phaser.GameObjects.Graphics, pose: RunnerPose): void {
  const cx = RUNNER_W / 2;
  const bodyTop = 24 + pose.bob;
  const bodyBottom = 50 + pose.bob;
  const [fx, flen, bx, blen] = pose.legs;

  // Back arm (behind body)
  g.fillStyle(PALETTE.shirt, 1);
  g.fillRoundedRect(cx - 16, bodyTop + 6, 8, pose.jumping ? 10 : 14, 4);

  // Legs + boots
  g.fillStyle(PALETTE.overallsDark, 1);
  g.fillRoundedRect(cx + bx - 4, bodyBottom - 4, 9, blen, 4);
  g.fillStyle(PALETTE.overalls, 1);
  g.fillRoundedRect(cx + fx - 4, bodyBottom - 4, 9, flen, 4);
  g.fillStyle(PALETTE.boot, 1);
  g.fillRoundedRect(cx + bx - 5, bodyBottom - 6 + blen, 13, 7, 3);
  g.fillRoundedRect(cx + fx - 5, bodyBottom - 6 + flen, 13, 7, 3);

  // Torso (overalls)
  g.fillStyle(PALETTE.overalls, 1);
  g.fillRoundedRect(cx - 12, bodyTop + 8, 24, bodyBottom - bodyTop - 10, 7);
  // Chest (shirt) + strap
  g.fillStyle(PALETTE.shirt, 1);
  g.fillRoundedRect(cx - 12, bodyTop + 2, 24, 10, 5);
  g.fillStyle(PALETTE.overallsDark, 1);
  g.fillRect(cx - 8, bodyTop + 2, 5, 10);
  g.fillRect(cx + 3, bodyTop + 2, 5, 10);

  // Front arm — raised when jumping
  g.fillStyle(PALETTE.shirt, 1);
  if (pose.jumping) {
    g.fillRoundedRect(cx + 8, bodyTop - 6, 8, 14, 4);
  } else {
    g.fillRoundedRect(cx + 8, bodyTop + 6, 8, 14, 4);
  }
  g.fillStyle(PALETTE.skin, 1);
  g.fillCircle(cx + 12, pose.jumping ? bodyTop - 6 : bodyTop + 21, 4);

  // Head
  g.fillStyle(PALETTE.skin, 1);
  g.fillCircle(cx + 2, bodyTop - 9, 12);
  // Cap
  g.fillStyle(PALETTE.cap, 1);
  g.fillRoundedRect(cx - 11, bodyTop - 22, 24, 12, { tl: 10, tr: 10, bl: 2, br: 2 });
  g.fillStyle(PALETTE.capDark, 1);
  g.fillRoundedRect(cx + 6, bodyTop - 13, 16, 5, 2); // brim points forward
  // Face
  if (pose.dead) {
    g.lineStyle(2, PALETTE.eye, 1);
    g.lineBetween(cx + 6, bodyTop - 12, cx + 11, bodyTop - 7);
    g.lineBetween(cx + 11, bodyTop - 12, cx + 6, bodyTop - 7);
  } else {
    g.fillStyle(PALETTE.eye, 1);
    g.fillCircle(cx + 8, bodyTop - 10, 2.4);
  }
  // Smile / frown
  g.lineStyle(2, PALETTE.eye, 1);
  if (pose.dead) {
    g.lineBetween(cx + 4, bodyTop - 1, cx + 11, bodyTop - 3);
  } else {
    g.beginPath();
    g.arc(cx + 7, bodyTop - 4, 4, 0.15 * Math.PI, 0.7 * Math.PI);
    g.strokePath();
  }
}

/* ---------------------------------------------------------------------- */
/* Collectibles                                                            */
/* ---------------------------------------------------------------------- */

function createCoin(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.coin, 1);
  g.fillCircle(14, 14, 12);
  g.fillStyle(PALETTE.coinDark, 1);
  g.fillCircle(14, 14, 9);
  g.fillStyle(PALETTE.coin, 1);
  g.fillRect(10, 6, 8, 16);
  g.fillStyle(0xfff5cc, 0.6);
  g.fillCircle(10, 10, 3);
  g.generateTexture('coin', 28, 28);
  g.destroy();
}

function createCoinParticle(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(0xffd700, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('coin_particle', 8, 8);
  g.destroy();
}

/* ---------------------------------------------------------------------- */
/* Obstacles                                                               */
/* ---------------------------------------------------------------------- */

function createObstacles(scene: Phaser.Scene): void {
  cactus(scene);
  bush(scene);
  stone(scene);
  crate(scene);
  spikes(scene);
  pit(scene);
  ledge(scene);
}

function cactus(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.cactus, 1);
  g.fillRoundedRect(14, 6, 14, 50, 7);
  g.fillRoundedRect(2, 16, 10, 8, 4); // left arm out
  g.fillRoundedRect(2, 8, 8, 16, 4); // left arm up
  g.fillRoundedRect(28, 26, 12, 8, 4); // right arm
  g.fillStyle(PALETTE.cactusDark, 1);
  for (let y = 12; y < 52; y += 10) g.fillRect(19, y, 3, 5);
  g.generateTexture('obs_cactus', 42, 58);
  g.destroy();
}

function bush(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.bush, 1);
  g.fillCircle(14, 22, 13);
  g.fillCircle(30, 18, 15);
  g.fillCircle(44, 23, 12);
  g.fillStyle(PALETTE.thorn, 1);
  const thorns = [8, 12, 22, 6, 36, 6, 48, 13];
  for (let i = 0; i < thorns.length; i += 2) {
    g.fillTriangle(thorns[i] - 3, thorns[i + 1] + 6, thorns[i] + 3, thorns[i + 1] + 6, thorns[i], thorns[i + 1] - 4);
  }
  g.generateTexture('obs_bush', 58, 36);
  g.destroy();
}

function stone(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.stoneDark, 1);
  g.fillEllipse(24, 22, 46, 28);
  g.fillStyle(PALETTE.stone, 1);
  g.fillEllipse(22, 18, 40, 24);
  g.fillStyle(PALETTE.stoneLight, 1);
  g.fillEllipse(15, 13, 14, 8);
  g.generateTexture('obs_stone', 48, 36);
  g.destroy();
}

function crate(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.crate, 1);
  g.fillRoundedRect(0, 0, 42, 42, 4);
  g.lineStyle(4, PALETTE.crateDark, 1);
  g.strokeRoundedRect(2, 2, 38, 38, 3);
  g.lineBetween(4, 4, 38, 38);
  g.lineBetween(38, 4, 4, 38);
  g.generateTexture('obs_crate', 42, 42);
  g.destroy();
}

function spikes(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.spikeDark, 1);
  g.fillRect(0, 26, 60, 6);
  for (let i = 0; i < 4; i++) {
    const x = 4 + i * 14;
    g.fillStyle(PALETTE.spike, 1);
    g.fillTriangle(x, 28, x + 12, 28, x + 6, 2);
    g.fillStyle(0xffffff, 0.35);
    g.fillTriangle(x + 6, 28, x + 9, 28, x + 6, 6);
  }
  g.generateTexture('obs_spikes', 60, 32);
  g.destroy();
}

/** A dark pit set into the ground — jump it or fall in. */
function pit(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.pitEdge, 1);
  g.fillRoundedRect(0, 0, 84, 26, 6);
  g.fillStyle(PALETTE.pit, 1);
  g.fillRoundedRect(5, 4, 74, 20, 5);
  // Jagged top edge teeth
  g.fillStyle(PALETTE.grassDark, 1);
  for (let x = 6; x < 78; x += 12) g.fillTriangle(x, 0, x + 8, 0, x + 4, 7);
  g.generateTexture('obs_pit', 84, 26);
  g.destroy();
}

/** Broken platform edge — a cracked raised slab. */
function ledge(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(PALETTE.stoneDark, 1);
  g.fillRoundedRect(0, 6, 64, 22, { tl: 6, tr: 0, bl: 2, br: 0 });
  g.fillStyle(PALETTE.stone, 1);
  g.fillRoundedRect(0, 2, 60, 10, { tl: 5, tr: 0, bl: 0, br: 0 });
  // Cracked right end
  g.fillStyle(PALETTE.stoneDark, 1);
  g.fillTriangle(58, 2, 64, 14, 56, 14);
  g.fillTriangle(60, 14, 66, 28, 52, 28);
  g.lineStyle(2, 0x5f5f5f, 1);
  g.lineBetween(40, 6, 48, 18);
  g.lineBetween(48, 18, 44, 26);
  g.generateTexture('obs_ledge', 66, 30);
  g.destroy();
}
