import type { PlayerSnapshot } from './game.js';

export type ChaseSnapshot = {
  readonly phase: 'idle' | 'warning' | 'chasing' | 'falling';
  readonly elapsed: number;
  readonly offset: number;
  readonly caught: PlayerSnapshot | null;
};

// 화면의 추격과 포획 시점은 렌더링 속도나 DOM 크기에 의존하지 않는다.
export class FrameChase {
  private phase: ChaseSnapshot['phase'] = 'idle';
  private elapsed = 0;
  private offset = 0;
  private outside = false;
  private caught: PlayerSnapshot | null = null;

  update(seconds: number, player: PlayerSnapshot, activeElapsed: number): void {
    if (activeElapsed >= 0.55 && player.x >= 2190) this.outside = true;
    if (this.phase === 'idle') {
      if (!this.outside || player.facing !== -1) return;
      this.phase = 'warning';
      this.elapsed = 0;
    }
    this.elapsed += seconds;
    if (this.phase === 'warning') {
      if (this.elapsed < 0.26) return;
      this.phase = 'chasing';
      this.elapsed = 0;
    }
    if (this.phase !== 'chasing') return;
    const previous = this.offset;
    this.offset = 70 * this.elapsed + 560 * this.elapsed ** 2;
    // 경계가 몸을 가로지를 때 포획한다. 빠른 점프로 한 틱에 지나가도 놓치지 않는다.
    if (2160 + Math.max(previous, this.offset) >= player.x - 14) {
      this.phase = 'falling';
      this.elapsed = 0;
      this.caught = player;
    }
  }

  fall(seconds: number): boolean {
    this.elapsed += seconds;
    return this.elapsed >= 1.05;
  }

  get snapshot(): ChaseSnapshot {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      offset: this.offset,
      caught: this.caught,
    };
  }
}
