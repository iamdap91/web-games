import type { PlayerSnapshot } from './game.js';

export const cutting = {
  trigger: 1280,
  boundaries: [1550, 1240, 930, 620, 310, 0],
  interval: 0.62,
  warning: 0.42,
  descent: 0.13,
  exit: 235,
} as const;

export type CutSnapshot = {
  readonly elapsed: number | null;
  readonly count: number;
  readonly boundary: number;
  readonly caughtElapsed: number | null;
};

export function cutImpact(index: number): number {
  return cutting.warning + cutting.descent + index * cutting.interval;
}

export class RoomCutter {
  private elapsed: number | null = null;
  private count = 0;
  private caughtAt: number | null = null;

  update(seconds: number, player: PlayerSnapshot): void {
    if (this.elapsed === null) {
      if (player.x < cutting.trigger) return;
      this.elapsed = 0;
    } else this.elapsed += seconds;
    if (this.caughtAt !== null) return;
    while (
      this.count < cutting.boundaries.length &&
      this.elapsed >= cutImpact(this.count)
    )
      this.count++;
    if (player.x >= this.boundary) this.caughtAt = this.elapsed;
  }

  private get boundary(): number {
    return this.count === 0 ? 2400 : cutting.boundaries[this.count - 1]!;
  }

  get snapshot(): CutSnapshot {
    return {
      elapsed: this.elapsed,
      count: this.count,
      boundary: this.boundary,
      caughtElapsed:
        this.caughtAt === null ? null : this.elapsed! - this.caughtAt,
    };
  }
}
