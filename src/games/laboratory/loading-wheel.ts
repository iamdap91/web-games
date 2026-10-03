import type { PlayerSnapshot } from './game.js';
import { smooth } from './event-rules.js';

export const loading = {
  trigger: 970,
  center: 1500,
  spin: 1.4,
  grace: 0.85,
  speed: 355,
  exit: 235,
} as const;
type WheelPhase = 'waiting' | 'growing' | 'spinning' | 'chasing' | 'caught';
export type WheelSnapshot = {
  readonly phase: WheelPhase;
  readonly elapsed: number;
  readonly x: number;
  readonly radius: number;
  readonly angle: number;
  readonly anchorX: number;
  readonly passenger: {
    readonly x: number;
    readonly y: number;
    readonly rotation: number;
  } | null;
};

export class LoadingWheel {
  private phase: WheelPhase = 'waiting';
  private elapsed = 0;
  private x: number = loading.center;
  private radius = 17;
  private angle = 0;
  private catchAngle = 0;
  private anchorX = 0;
  private catchRadius = 0;

  update(seconds: number, player: PlayerSnapshot): void {
    if (this.phase === 'waiting') {
      if (player.x < loading.trigger) return;
      this.phase = 'growing';
      this.elapsed = 0;
    }
    this.elapsed += seconds;
    this.angle -=
      seconds *
      (this.phase === 'spinning' ? 14 : this.phase === 'chasing' ? 3.4 : 4.5);
    if (this.phase === 'growing') {
      this.radius = Math.max(
        this.radius,
        17 + 105 * smooth((player.x - loading.trigger) / 350),
      );
      const dx = player.x - this.x;
      const dy = player.y - 30 - (340 - this.radius);
      if (Math.hypot(dx, dy) <= this.radius + 35) {
        this.anchorX = player.x;
        this.catchAngle = Math.atan2(dy, dx);
        this.catchRadius = Math.hypot(dx, dy);
        this.phase = 'spinning';
        this.elapsed = 0;
      }
    } else if (this.phase === 'spinning' && this.elapsed >= loading.spin) {
      this.phase = 'chasing';
      this.elapsed = 0;
    } else if (this.phase === 'chasing') {
      this.x -=
        loading.speed * smooth((this.elapsed - loading.grace) / 0.7) * seconds;
      if (
        this.elapsed > loading.grace &&
        Math.hypot(player.x - this.x, player.y - 30 - (340 - this.radius)) <
          this.radius + 18
      ) {
        this.phase = 'caught';
        this.elapsed = 0;
      }
    }
  }

  get snapshot(): WheelSnapshot {
    const spinning = this.phase === 'spinning';
    const turn = Math.min(1, this.elapsed / loading.spin);
    const rotation = -(Math.PI * 5 + this.catchAngle) * turn;
    const angle = this.catchAngle + rotation;
    const radius =
      this.catchRadius + (90 - this.catchRadius) * smooth(this.elapsed / 0.3);
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      x: this.x,
      radius: this.radius,
      angle: this.angle,
      anchorX: this.anchorX,
      passenger: spinning
        ? {
            x: this.x + Math.cos(angle) * radius,
            y: 340 - this.radius + Math.sin(angle) * radius + 30,
            rotation,
          }
        : null,
    };
  }
}
