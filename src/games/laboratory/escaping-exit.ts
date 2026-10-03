import type { PlayerSnapshot } from './game.js';

export const escapingExit = {
  left: 203,
  right: 2243,
} as const;
type ExitPhase =
  'idle' | 'startled' | 'fleeing' | 'resting' | 'returning' | 'caught';
export type EscapingExitSnapshot = {
  readonly x: number;
  readonly phase: ExitPhase;
  readonly elapsed: number;
  readonly attempts: number;
  readonly revealed: boolean;
  readonly lean: number;
  readonly bounce: number;
};

export class EscapingExit {
  private x: number = escapingExit.left;
  private phase: ExitPhase = 'idle';
  private elapsed = 0;
  private attempts = 0;
  private home: number = escapingExit.left;
  private from: number = escapingExit.left;
  private target: number = escapingExit.left;
  private retreat = 0;
  private lean = 0;
  private revealed = false;

  constructor(private readonly outward: -1 | 1 = -1) {
    this.x =
      this.home =
      this.from =
      this.target =
        outward === -1 ? escapingExit.left : escapingExit.right;
  }

  update(
    seconds: number,
    player: PlayerSnapshot,
    previous: PlayerSnapshot,
  ): void {
    if (this.phase === 'caught') return;
    this.elapsed += seconds;
    const before = this.x;
    const approaching = (player.x - previous.x) * this.outward > 0;
    const distance = (this.x - player.x) * this.outward;
    if (this.phase === 'idle') {
      if (approaching && distance < 235) this.startle();
    } else if (this.phase === 'startled') {
      if (this.elapsed >= 0.035) this.changePhase('fleeing');
    } else if (this.phase === 'fleeing') {
      const duration = 0.48;
      const t = Math.min(1, this.elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 2);
      this.x = this.from + (this.target - this.from) * eased;
      if (t === 1) this.changePhase('resting');
    } else if (this.phase === 'resting') {
      this.retreat = approaching
        ? 0
        : this.retreat + Math.max(0, (previous.x - player.x) * this.outward);
      if (this.retreat >= 48) {
        this.from = this.x;
        this.changePhase('returning');
      } else if (
        approaching &&
        distance < 235 &&
        this.elapsed >= (this.attempts === 1 ? 0.65 : 0.4)
      )
        this.startle();
    } else if (this.phase === 'returning') {
      // 돌아오기 시작한 문은 접근만으로 취소하지 않아 페인트에 확실한 기회를 준다.
      if (this.elapsed > 0.18)
        this.x -=
          this.outward * Math.min(Math.abs(this.home - this.x), 190 * seconds);
      if (this.x === this.home) this.changePhase('resting');
    }
    const speed = (this.x - before) / Math.max(seconds, 0.001);
    const targetLean = Math.max(-0.075, Math.min(0.075, -speed * 0.00015));
    this.lean += (targetLean - this.lean) * Math.min(1, seconds * 14);
    if (this.attempts > 0) this.revealed = true;
    // 플래시점프로 한 틱에 문을 넘어도 상대 이동 구간으로 접촉을 판정한다.
    const oldDistance = previous.x - before;
    const newDistance = player.x - this.x;
    if (
      player.y >= 140 &&
      Math.min(oldDistance, newDistance) <= 64 &&
      Math.max(oldDistance, newDistance) >= -64
    )
      this.changePhase('caught');
  }

  private startle(): void {
    this.attempts++;
    this.home = this.from = this.x;
    this.target = this.x + this.outward * (this.attempts === 1 ? 440 : 340);
    this.retreat = 0;
    this.changePhase('startled');
  }

  private changePhase(phase: ExitPhase): void {
    this.phase = phase;
    this.elapsed = 0;
    this.retreat = 0;
  }

  get snapshot(): EscapingExitSnapshot {
    const startled =
      this.phase === 'startled'
        ? Math.sin((this.elapsed / 0.035) * Math.PI)
        : 0;
    return {
      x: this.x,
      phase: this.phase,
      elapsed: this.elapsed,
      attempts: this.attempts,
      revealed: this.revealed,
      lean: this.lean - this.outward * startled * 0.025,
      bounce:
        this.phase === 'fleeing'
          ? Math.abs(Math.sin(this.elapsed * 32)) * 4
          : startled * 3,
    };
  }
}
