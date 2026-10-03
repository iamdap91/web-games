import { roomFlip } from './event-rules.js';

export class MirroredLab {
  private elapsed: number | null = null;
  private flipFinishX: number | null = null;

  update(seconds: number, activeElapsed: number | null, playerX: number): void {
    if ((activeElapsed ?? 0) < roomFlip.duration) return;
    this.flipFinishX ??= playerX;
    if (this.elapsed !== null) this.elapsed += seconds;
    else if (Math.abs(playerX - this.flipFinishX) >= roomFlip.returnDistance)
      this.elapsed = 0;
  }

  get mirrorElapsed(): number | null {
    return this.elapsed;
  }
}
