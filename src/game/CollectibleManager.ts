import Phaser from 'phaser';
import { WORLD } from '../utils/physics';
import { audio } from '../utils/audio';
import { bus } from '../utils/eventBus';

const COIN_SCORE = 50;

export class CollectibleManager {
  readonly group: Phaser.Physics.Arcade.Group;
  private scene: Phaser.Scene;
  private distanceToNext = 400;
  private elapsed = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
  }

  reset(): void {
    this.group.children.each((child) => {
      this.recycle(child as Phaser.Physics.Arcade.Sprite);
      return true;
    });
    this.distanceToNext = 400;
    this.elapsed = 0;
  }

  update(delta: number, speed: number): void {
    const dt = delta / 1000;
    this.elapsed += dt;
    const scrolled = speed * dt;

    this.group.children.each((child) => {
      const coin = child as Phaser.Physics.Arcade.Sprite;
      if (coin.active) {
        coin.x -= scrolled;
        if (coin.x < -60) this.recycle(coin);
      }
      return true;
    });

    this.distanceToNext -= scrolled;
    if (this.distanceToNext <= 0) {
      this.spawn();
      const gap = Phaser.Math.FloatBetween(250, 600) - Math.min(this.elapsed * 2, 250);
      this.distanceToNext = Math.max(gap, 180);
    }
  }

  private spawn(): void {
    const groundY = WORLD.HEIGHT - WORLD.GROUND_HEIGHT;
    let coin = this.group.getFirstDead(false) as Phaser.Physics.Arcade.Sprite | null;
    if (!coin) {
      coin = this.group.create(0, 0, 'coin') as Phaser.Physics.Arcade.Sprite;
    }
    coin.setTexture('coin');
    coin.setActive(true).setVisible(true);
    coin.setDepth(9);

    const floatY = groundY - 58 - Math.random() * 40;
    coin.setPosition(WORLD.WIDTH + 30, floatY);

    const body = coin.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setSize(18, 18);
    body.setOffset(5, 5);

    this.scene.tweens.add({
      targets: coin,
      y: floatY - 8,
      duration: 600 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  collect(coin: Phaser.Physics.Arcade.Sprite): void {
    if (!coin.active) return;
    this.recycle(coin);

    const emitter = this.scene.add.particles(coin.x, coin.y, 'coin_particle', {
      speed: { min: 40, max: 120 },
      angle: { min: 220, max: 320 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 8,
      tint: 0xffd700
    });
    this.scene.time.delayedCall(500, () => emitter.destroy());

    audio.play('collect');
    bus.emit('game:coin');
  }

  static getCoinScore(): number {
    return COIN_SCORE;
  }

  private recycle(coin: Phaser.Physics.Arcade.Sprite): void {
    coin.setActive(false).setVisible(false);
    (coin.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.killTweensOf(coin);
    coin.x = -500;
  }
}
