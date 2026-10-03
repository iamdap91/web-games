import type { PlayerSnapshot } from './game.js';
import { openingFrameEdge } from './spatial-rules.js';

export const pursuit = {
  grace: 1.25,
  boundary: 2160,
  startSpeed: 0,
  acceleration: 650,
  topSpeed: 520,
} as const;

export type ChaseSnapshot = {
  readonly phase: 'idle' | 'warning' | 'chasing' | 'falling';
  readonly elapsed: number;
  readonly boundary: number;
  readonly caught: PlayerSnapshot | null;
};

// 추격 경계는 월드 좌표로 관리해 카메라 이동과 화면 크기에 영향을 받지 않는다.
export class FrameChase {
  private phase: ChaseSnapshot['phase'] = 'idle';
  private elapsed = 0;
  private boundary: number = pursuit.boundary;
  private caught: PlayerSnapshot | null = null;

  update(seconds: number, player: PlayerSnapshot, activeElapsed: number): void {
    if (this.phase === 'idle') {
      if (player.x < 1400 + openingFrameEdge(activeElapsed) + 14) return;
      this.phase = 'warning';
      this.elapsed = 0;
      return;
    }
    this.elapsed += seconds;
    if (this.phase === 'warning') {
      if (player.x + 18 <= pursuit.boundary) {
        this.phase = 'chasing';
        this.elapsed = 0;
      } else if (this.elapsed >= pursuit.grace) {
        this.capture(player);
      }
      return;
    }
    if (this.phase !== 'chasing') return;
    const speed = Math.min(
      pursuit.topSpeed,
      pursuit.startSpeed + pursuit.acceleration * this.elapsed,
    );
    this.boundary -= speed * seconds;
    if (player.x + 14 >= this.boundary) this.capture(player);
  }

  private capture(player: PlayerSnapshot): void {
    this.phase = 'falling';
    this.elapsed = 0;
    this.caught = player;
  }

  fall(seconds: number): boolean {
    this.elapsed += seconds;
    return this.elapsed >= 1.05;
  }

  get snapshot(): ChaseSnapshot {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      boundary: this.boundary,
      caught: this.caught,
    };
  }
}
