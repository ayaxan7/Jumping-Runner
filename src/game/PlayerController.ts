/**
 * PlayerController — owns the runner sprite: physics body, animation
 * state (run / jump / dead), squash-and-stretch juice and dust puffs.
 *
 * The runner stays at a fixed X; the world moves past it. Vision events
 * arrive via `tryJump()`, called by the scene when the bus fires.
 */

import Phaser from 'phaser';
import { PHYSICS, WORLD } from '../utils/physics';
import { audio } from '../utils/audio';

export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private dead = false;
  private wasGrounded = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    if (!scene.anims.exists('run')) {
      scene.anims.create({
        key: 'run',
        frames: [0, 1, 2, 3].map((i) => ({ key: `runner_run_${i}` })),
        frameRate: 12,
        repeat: -1
      });
    }

    const groundY = WORLD.HEIGHT - WORLD.GROUND_HEIGHT;
    this.sprite = scene.physics.add.sprite(PHYSICS.PLAYER_X, groundY - 40, 'runner_run_0');
    this.sprite.setGravityY(PHYSICS.GRAVITY_Y);
    this.sprite.setCollideWorldBounds(false);
    this.sprite.setDepth(10);
    // Forgiving hitbox: slightly narrower than the art so grazes feel fair.
    this.sprite.body!.setSize(26, 56).setOffset(13, 10);
    this.sprite.play('run');

    this.dust = scene.add.particles(0, 0, 'cloud', {
      speed: { min: 20, max: 70 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.16, end: 0.02 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 350,
      frequency: -1,
      tint: 0xd9c9a8
    });
    this.dust.setDepth(9);
  }

  get isDead(): boolean {
    return this.dead;
  }

  get grounded(): boolean {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  /** Attempt a jump; ignored mid-air (no double jumps) or when dead. */
  tryJump(): boolean {
    if (this.dead || !this.grounded) return false;
    this.sprite.setVelocityY(PHYSICS.JUMP_VELOCITY);
    this.sprite.setTexture('runner_jump');
    this.sprite.anims.stop();
    // Stretch on takeoff
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 0.88,
      scaleY: 1.12,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    this.dust.emitParticleAt(this.sprite.x - 6, this.sprite.y + 30, 6);
    audio.play('jump');
    return true;
  }

  /** Per-frame housekeeping: detect landings, swap textures. */
  update(): void {
    if (this.dead) return;
    const grounded = this.grounded;

    if (grounded && !this.wasGrounded) {
      // Just landed: squash + dust.
      this.sprite.setScale(1.1, 0.9);
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1,
        scaleY: 1,
        duration: 130,
        ease: 'Back.easeOut'
      });
      this.dust.emitParticleAt(this.sprite.x, this.sprite.y + 32, 8);
      this.sprite.play('run', true);
    } else if (!grounded) {
      this.sprite.setTexture('runner_jump');
      this.sprite.anims.stop();
    } else if (!this.sprite.anims.isPlaying) {
      this.sprite.play('run', true);
    }

    this.wasGrounded = grounded;
  }

  /** Death sequence: freeze world handled by scene; this animates the body. */
  die(): void {
    if (this.dead) return;
    this.dead = true;
    this.sprite.setTexture('runner_dead');
    this.sprite.anims.stop();
    this.sprite.setVelocity(0, -520);
    this.sprite.setAngularVelocity(0);
    // Let the body tumble off-screen through the (now disabled) floor.
    (this.sprite.body as Phaser.Physics.Arcade.Body).checkCollision.none = true;
    this.scene.tweens.add({
      targets: this.sprite,
      angle: -100,
      duration: 700,
      ease: 'Quad.easeIn'
    });
    audio.play('collision');
  }

  reset(): void {
    this.dead = false;
    this.wasGrounded = true;
    const groundY = WORLD.HEIGHT - WORLD.GROUND_HEIGHT;
    this.sprite.setPosition(PHYSICS.PLAYER_X, groundY - 40);
    this.sprite.setVelocity(0, 0);
    this.sprite.setAngle(0);
    this.sprite.setScale(1, 1);
    (this.sprite.body as Phaser.Physics.Arcade.Body).checkCollision.none = false;
    this.sprite.play('run', true);
  }
}
