import type { PlayerSnapshot } from './player.js';
import { smooth } from './event-rules.js';
import { cameraPosition } from './spatial-rules.js';

export const loading = {
  wait: 3.2,
  ramp: 2,
  force: 360,
  capture: 26,
  disappear: 0.85,
} as const;
export type WheelSnapshot = {
  readonly phase: 'waiting' | 'pulling' | 'caught';
  readonly elapsed: number;
  readonly x: number;
  readonly strength: number;
  readonly caughtElapsed: number | null;
};

export class LoadingWheel {
  private elapsed = 0;
  private phase: WheelSnapshot['phase'] = 'waiting';
  private x = 500;
  private caughtAt: number | null = null;

  update(seconds: number, player: PlayerSnapshot): void {
    this.elapsed += seconds;
    if (this.phase === 'waiting' && this.elapsed >= loading.wait) {
      // 흡수를 시작하는 순간 화면 중앙을 공간에 고정한다. 이후 돌아서면 멀어진다.
      this.x = cameraPosition(player.x) + 500;
      this.phase = 'pulling';
    }
    if (
      this.phase === 'pulling' &&
      Math.abs(player.x - this.x) <= loading.capture
    ) {
      this.phase = 'caught';
      this.caughtAt = this.elapsed;
    }
  }

  get snapshot(): WheelSnapshot {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      x: this.x,
      strength: smooth((this.elapsed - loading.wait) / loading.ramp),
      caughtElapsed:
        this.caughtAt === null ? null : this.elapsed - this.caughtAt,
    };
  }
}
