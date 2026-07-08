/**
 * A tiny typed event bus that decouples the three worlds of the app:
 *
 *   vision  --jump-->  game
 *   game    --score/game-over-->  React UI
 *   React   --pause/resume/restart-->  game
 *
 * Phaser and React never import each other's internals; they only talk
 * through this bus, which keeps the architecture testable and avoids
 * stale-closure problems inside the Phaser scene.
 */

import type { GameOverPayload, JumpMeterSample } from '../types';

interface EventMap {
  /** Fired by the vision layer when a real-world jump is confirmed. */
  'player:jump': void;
  /** Continuous meter readout for the HUD / calibration overlay. */
  'vision:meter': JumpMeterSample;
  /** Pose tracking was lost / regained (low confidence). */
  'vision:tracking': boolean;
  /** Fired by the game scene roughly every 100 ms. */
  'game:score': { score: number; distance: number; speed: number };
  'game:over': GameOverPayload;
  /** Fired when a coin is collected. */
  'game:coin': void;
  /** UI commands. */
  'ui:pause': void;
  'ui:resume': void;
  'ui:restart': void;
  'ui:start': void;
  'audio:mute': boolean;
}

type Handler<T> = (payload: T) => void;

class EventBus {
  private handlers = new Map<keyof EventMap, Set<Handler<unknown>>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof EventMap>(
    event: K,
    ...payload: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    this.handlers.get(event)?.forEach((h) => h(payload[0]));
  }

  clear(): void {
    this.handlers.clear();
  }
}

/** Singleton instance shared by the whole app. */
export const bus = new EventBus();
