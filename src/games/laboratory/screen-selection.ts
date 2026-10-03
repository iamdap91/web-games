import { world } from './layout.js';
import type { PlayerSnapshot } from './player.js';

export const selectionTiming = {
  trigger: 1100,
  sweep: 3.6,
  pause: 0.55,
  erased: 0.85,
} as const;
export type SelectionSnapshot = {
  readonly elapsed: number | null;
  readonly boundary: number;
  readonly deleted: boolean;
  readonly caughtElapsed: number | null;
};

export class ScreenSelection {
  private elapsed: number | null = null;
  private caughtAt: number | null = null;

  update(seconds: number, player: PlayerSnapshot): void {
    if (this.elapsed === null) {
      if (player.x < selectionTiming.trigger) return;
      this.elapsed = 0;
    } else this.elapsed += seconds;
    if (
      this.caughtAt === null &&
      this.deleted &&
      player.x + 18 >= this.boundary
    )
      this.caughtAt = this.elapsed;
  }

  private get deleted(): boolean {
    return (
      this.elapsed !== null &&
      this.elapsed >= selectionTiming.sweep + selectionTiming.pause
    );
  }
  private get boundary(): number {
    return this.elapsed === null
      ? world.width
      : 2100 - 1650 * Math.min(1, this.elapsed / selectionTiming.sweep);
  }
  get snapshot(): SelectionSnapshot {
    return {
      elapsed: this.elapsed,
      boundary: this.boundary,
      deleted: this.deleted,
      caughtElapsed:
        this.caughtAt === null ? null : this.elapsed! - this.caughtAt,
    };
  }
}
