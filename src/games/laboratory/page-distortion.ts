import type { Scenario } from './anomalies.js';
import { smooth } from './event-rules.js';

export type PageSnapshot = {
  readonly elapsed: number | null;
  readonly expansion: number;
  readonly reveal: number;
  readonly departure: number;
};

// 귀로에서 연출을 재발동하지 않고 입구까지 남은 거리로 원래 화면에 복귀한다.
export class PageDistortion {
  private elapsed: number | null = null;
  private furthest = 900;
  private revealElapsed: number | null = null;
  private departure = 0;

  update(seconds: number, scenario: Scenario, x: number): void {
    if (scenario !== 'page-scroll' && scenario !== 'image-zoom') return;
    if (this.elapsed === null && x < 900) return;
    this.elapsed = this.elapsed === null ? 0 : this.elapsed + seconds;
    this.furthest = Math.max(this.furthest, x);
    this.departure = smooth((x - 200) / 500);
    if (this.revealElapsed !== null) this.revealElapsed += seconds;
    else if (scenario === 'image-zoom' && x >= 1450) this.revealElapsed = 0;
  }

  get snapshot(): PageSnapshot {
    return {
      elapsed: this.elapsed,
      expansion: smooth((this.furthest - 900) / 550),
      reveal:
        this.revealElapsed === null ? 0 : smooth(this.revealElapsed / 0.85),
      departure: this.departure,
    };
  }
}
