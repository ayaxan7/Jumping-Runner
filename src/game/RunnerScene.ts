/**
 * RunnerScene — the single Phaser scene that runs the entire game world:
 * parallax environment, the auto-running player, pooled obstacles,
 * scoring, collisions and the run lifecycle (start / pause / restart).
 *
 * It communicates with React exclusively through the event bus.
 */

import Phaser from 'phaser';
import { createAllTextures, PALETTE } from './textures';
import { PlayerController } from './PlayerController';
import { ObstacleManager } from './ObstacleManager';
import { PHYSICS, WORLD, clamp } from '../utils/physics';
import { computeScore, loadHighScore, saveHighScore, SCORING } from '../utils/scoring';
import { audio } from '../utils/audio';
import { bus } from '../utils/eventBus';

export class RunnerScene extends Phaser.Scene {
  private player!: PlayerController;
  private obstacles!: ObstacleManager;
  private clouds!: Phaser.GameObjects.TileSprite;
  private mountains!: Phaser.GameObjects.TileSprite;
  private treeline!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;

  private started = false;
  private paused = false;
  private gameOver = false;
  private elapsed = 0;
  private distance = 0;
  private speed: number = PHYSICS.BASE_SPEED;
  private lastScoreEmit = 0;
  private lastMilestone = 0;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    super('RunnerScene');
  }

  create(): void {
    createAllTextures(this);
    this.buildWorld();

    this.player = new PlayerController(this);
    this.obstacles = new ObstacleManager(this);

    // Invisible static floor.
    const groundY = WORLD.HEIGHT - WORLD.GROUND_HEIGHT;
    const floor = this.add.rectangle(WORLD.WIDTH / 2, groundY + 30, WORLD.WIDTH * 2, 60);
    this.physics.add.existing(floor, true);
    this.physics.add.collider(this.player.sprite, floor);

    this.physics.add.overlap(this.player.sprite, this.obstacles.group, (_p, o) => {
      const obs = o as Phaser.Physics.Arcade.Sprite;
      if (obs.active) this.handleDeath();
    });

    this.wireBus();

    // Hidden debug fallback for development without a camera:
    // open the app with ?keyboard=1 and press Space.
    if (new URLSearchParams(window.location.search).get('keyboard') === '1') {
      this.input.keyboard?.on('keydown-SPACE', () => this.tryJump());
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardownBus());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardownBus());
  }

  /* ------------------------------------------------------------------ */
  /* World construction                                                   */
  /* ------------------------------------------------------------------ */

  private buildWorld(): void {
    this.add.image(0, 0, 'sky').setOrigin(0).setDepth(0).setScrollFactor(0);

    // Sun
    const sun = this.add.graphics().setDepth(1);
    sun.fillStyle(PALETTE.sun, 1);
    sun.fillCircle(820, 86, 42);
    sun.fillStyle(PALETTE.sun, 0.25);
    sun.fillCircle(820, 86, 58);

    this.clouds = this.add
      .tileSprite(0, 60, WORLD.WIDTH, 60, 'cloud')
      .setOrigin(0, 0.5)
      .setDepth(2)
      .setAlpha(0.95)
      .setTileScale(0.9);

    this.mountains = this.add
      .tileSprite(0, WORLD.HEIGHT - WORLD.GROUND_HEIGHT - 110, WORLD.WIDTH, 220, 'mountains')
      .setOrigin(0, 0.5)
      .setDepth(3);

    this.treeline = this.add
      .tileSprite(0, WORLD.HEIGHT - WORLD.GROUND_HEIGHT - 64, WORLD.WIDTH, 150, 'treeline')
      .setOrigin(0, 0.5)
      .setDepth(4);

    this.ground = this.add
      .tileSprite(0, WORLD.HEIGHT - WORLD.GROUND_HEIGHT, WORLD.WIDTH, WORLD.GROUND_HEIGHT, 'ground')
      .setOrigin(0, 0)
      .setDepth(7);
  }

  /* ------------------------------------------------------------------ */
  /* Bus wiring                                                          */
  /* ------------------------------------------------------------------ */

  private wireBus(): void {
    this.unsubscribers.push(
      bus.on('player:jump', () => this.tryJump()),
      bus.on('ui:start', () => this.startRun()),
      bus.on('ui:pause', () => this.pauseRun()),
      bus.on('ui:resume', () => this.resumeRun()),
      bus.on('ui:restart', () => this.restartRun())
    );
  }

  private teardownBus(): void {
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
  }

  /* ------------------------------------------------------------------ */
  /* Run lifecycle                                                       */
  /* ------------------------------------------------------------------ */

  private startRun(): void {
    if (this.started && !this.gameOver) return;
    this.resetRunState();
    this.started = true;
    audio.startMusic();
  }

  private restartRun(): void {
    this.resetRunState();
    this.started = true;
    audio.startMusic();
  }

  private resetRunState(): void {
    this.gameOver = false;
    this.paused = false;
    this.elapsed = 0;
    this.distance = 0;
    this.speed = PHYSICS.BASE_SPEED;
    this.lastScoreEmit = 0;
    this.lastMilestone = 0;
    this.player.reset();
    this.obstacles.reset();
    this.physics.resume();
    this.cameras.main.resetFX();
  }

  private pauseRun(): void {
    if (!this.started || this.gameOver || this.paused) return;
    this.paused = true;
    this.physics.pause();
    this.player.sprite.anims.pause();
    audio.stopMusic();
  }

  private resumeRun(): void {
    if (!this.paused) return;
    this.paused = false;
    this.physics.resume();
    this.player.sprite.anims.resume();
    audio.startMusic();
  }

  private tryJump(): void {
    if (!this.started || this.paused || this.gameOver) return;
    this.player.tryJump();
  }

  private handleDeath(): void {
    if (this.gameOver || this.player.isDead) return;
    this.gameOver = true;
    this.player.die();
    audio.stopMusic();
    audio.play('gameover');
    this.cameras.main.shake(220, 0.012);
    this.cameras.main.flash(160, 255, 80, 60);

    const score = computeScore(this.elapsed, this.distance);
    const isNewHighScore = saveHighScore(score);
    const highScore = loadHighScore();

    // Give the death animation a beat before showing the overlay.
    this.time.delayedCall(900, () => {
      bus.emit('game:over', {
        score,
        distance: Math.floor(this.distance / 10), // meters-ish for display
        highScore,
        isNewHighScore
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Main loop                                                           */
  /* ------------------------------------------------------------------ */

  update(time: number, delta: number): void {
    // Ambient cloud drift runs even on menus for a lively backdrop.
    this.clouds.tilePositionX += 0.08 * (delta / 16.6);

    if (!this.started || this.paused) return;

    if (this.gameOver) {
      this.player.sprite.y += 0; // physics continues for the death tumble
      return;
    }

    const dt = delta / 1000;
    this.elapsed += dt;

    // Speed ramps linearly and clamps at MAX_SPEED.
    this.speed = clamp(
      PHYSICS.BASE_SPEED + PHYSICS.SPEED_RAMP * this.elapsed,
      PHYSICS.BASE_SPEED,
      PHYSICS.MAX_SPEED
    );
    this.distance += this.speed * dt;

    // Parallax scrolling, proportional to world speed.
    const scroll = this.speed * dt;
    this.mountains.tilePositionX += scroll * 0.12;
    this.treeline.tilePositionX += scroll * 0.35;
    this.ground.tilePositionX += scroll;

    this.obstacles.update(delta, this.speed);
    this.player.update();

    // Throttled score broadcast (~10 Hz) keeps React renders cheap.
    if (time - this.lastScoreEmit > 100) {
      this.lastScoreEmit = time;
      const score = computeScore(this.elapsed, this.distance);
      bus.emit('game:score', { score, distance: Math.floor(this.distance / 10), speed: this.speed });

      const milestone = Math.floor(score / SCORING.MILESTONE);
      if (milestone > this.lastMilestone) {
        this.lastMilestone = milestone;
        audio.play('milestone');
      }
    }
  }
}
