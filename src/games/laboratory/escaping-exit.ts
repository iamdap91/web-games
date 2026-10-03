import type { PlayerSnapshot } from './game.js';

export const escapingExit = {
  home: 203,
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
  private x: number = escapingExit.home;
  private phase: ExitPhase = 'idle';
  private elapsed = 0;
  private attempts = 0;
  private home: number = escapingExit.home;
  private from: number = escapingExit.home;
  private target: number = escapingExit.home;
  private retreat = 0;
  private lean = 0;
  private revealed = false;

  update(
    seconds: number,
    player: PlayerSnapshot,
    previous: PlayerSnapshot,
  ): void {
    if (this.phase === 'caught') return;
    this.elapsed += seconds;
    const before = this.x;
    const approaching = player.x < previous.x;
    const distance = player.x - this.x;
    if (this.phase === 'idle') {
      // 오른쪽을 탐색할 때도 시야 가장자리에서 움직이는 입구를 발견할 수 있다.
      if (player.x >= 560 && player.facing === 1)
        this.x += Math.max(0, Math.min(player.x - 310 - this.x, 700 * seconds));
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
        : this.retreat + Math.max(0, player.x - previous.x);
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
        this.x = Math.min(this.home, this.x + 190 * seconds);
      if (this.x === this.home) this.changePhase('resting');
    }
    const speed = (this.x - before) / Math.max(seconds, 0.001);
    const targetLean = Math.max(-0.075, Math.min(0.075, -speed * 0.00015));
    this.lean += (targetLean - this.lean) * Math.min(1, seconds * 14);
    if (Math.abs(this.x - escapingExit.home) > 2 || this.attempts > 0)
      this.revealed = true;
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
    this.target = this.x - (this.attempts === 1 ? 440 : 340);
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
      lean: this.lean + startled * 0.025,
      bounce:
        this.phase === 'fleeing'
          ? Math.abs(Math.sin(this.elapsed * 32)) * 4
          : startled * 3,
    };
  }
}
