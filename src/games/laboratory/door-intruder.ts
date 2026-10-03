import type { PlayerSnapshot } from './game.js';
import { smooth } from './event-rules.js';

export const intruderTiming = {
  revealX: 1000,
  reachX: 1250,
  fingers: 2.1,
  bodyDelay: 0.18,
  bodyDuration: 0.48,
  brace: 0.62,
  strike: 0.28,
  hold: 0.2,
  recover: 0.75,
  drag: 1.15,
} as const;
// 회색 연구소 문에서 실제 문짝이 차지하는 좁은 입구. 그림과 손 판정이 같은 기준을 쓴다.
export const intruderDoor = {
  x: 1460,
  y: 140,
  width: 166,
  height: 200,
  openingX: 1491,
  openingY: 228,
  openingWidth: 65,
  openingHeight: 111,
  seamX: 1556,
  wristY: 274,
} as const;

export type Point = { readonly x: number; readonly y: number };
export type IntruderSnapshot = {
  readonly elapsed: number | null;
  readonly attackElapsed: number | null;
  readonly caughtElapsed: number | null;
  readonly grip: Point | null;
  readonly phase:
    'hidden' | 'fingers' | 'bracing' | 'striking' | 'lodged' | 'caught';
};

export function intruderReveal(state: IntruderSnapshot): {
  readonly fingers: number;
  readonly hand: number;
  readonly body: number;
} {
  const strike =
    state.attackElapsed === null
      ? -1
      : state.attackElapsed - intruderTiming.brace;
  return {
    fingers: smooth(((state.elapsed ?? 0) - 0.25) / 1.1),
    hand: smooth(strike / intruderTiming.strike),
    body: smooth(
      (strike - intruderTiming.bodyDelay) / intruderTiming.bodyDuration,
    ),
  };
}

export function intruderExtension(attack: number | null): number {
  if (attack === null) return 0;
  const t = attack - intruderTiming.brace;
  if (t < 0) return 0;
  if (t < intruderTiming.strike)
    return 1 - (1 - t / intruderTiming.strike) ** 3;
  return (
    1 -
    smooth(
      (t - intruderTiming.strike - intruderTiming.hold) /
        intruderTiming.recover,
    ) *
      0.3
  );
}

export function intruderHand(state: IntruderSnapshot): Point {
  const extension = intruderExtension(state.attackElapsed);
  const normal = {
    x: intruderDoor.seamX - extension * 446,
    y: intruderDoor.wristY + extension * 38,
  };
  if (state.caughtElapsed === null || state.grip === null) return normal;
  const drag = smooth((state.caughtElapsed - 0.12) / 0.9);
  return {
    x: state.grip.x + (1523 - state.grip.x) * drag,
    y: state.grip.y + (282 - state.grip.y) * drag,
  };
}

// 손과 캐릭터의 상대 이동을 함께 검사해 플래시점프 중에도 접촉을 놓치지 않는다.
function sweptGrab(
  from: Point,
  to: Point,
  previous: PlayerSnapshot,
  player: PlayerSnapshot,
): boolean {
  const start = [from.x - previous.x, from.y - (previous.y - 31)];
  const end = [to.x - player.x, to.y - (player.y - 31)];
  let entry = 0;
  let exit = 1;
  for (let axis = 0; axis < 2; axis++) {
    const a = start[axis]!;
    const delta = end[axis]! - a;
    const radius = axis === 0 ? 40 : 51;
    if (Math.abs(delta) < 0.0001) {
      if (Math.abs(a) > radius) return false;
    } else {
      const first = (-radius - a) / delta;
      const last = (radius - a) / delta;
      entry = Math.max(entry, Math.min(first, last));
      exit = Math.min(exit, Math.max(first, last));
      if (entry > exit) return false;
    }
  }
  return true;
}

export class DoorIntruder {
  private elapsed: number | null = null;
  private attackElapsed: number | null = null;
  private caughtElapsed: number | null = null;
  private grip: Point | null = null;

  update(
    seconds: number,
    player: PlayerSnapshot,
    previous: PlayerSnapshot = player,
  ): void {
    if (this.caughtElapsed !== null) {
      this.caughtElapsed += seconds;
      this.elapsed = (this.elapsed ?? 0) + seconds;
      this.attackElapsed = (this.attackElapsed ?? 0) + seconds;
      return;
    }
    if (this.elapsed === null) {
      if (player.x < intruderTiming.revealX) return;
      this.elapsed = 0;
    }
    this.elapsed += seconds;
    const before = this.snapshot;
    if (this.attackElapsed !== null) this.attackElapsed += seconds;
    else if (
      this.elapsed >= intruderTiming.fingers &&
      player.x >= intruderTiming.reachX
    )
      this.attackElapsed = 0;
    const attack = this.attackElapsed;
    if (
      attack === null ||
      attack < intruderTiming.brace ||
      (before.attackElapsed ?? 0) >
        intruderTiming.brace + intruderTiming.strike + intruderTiming.hold
    )
      return;
    const hand = intruderHand(this.snapshot);
    if (sweptGrab(intruderHand(before), hand, previous, player)) {
      this.caughtElapsed = 0;
      this.grip = hand;
    }
  }

  get snapshot(): IntruderSnapshot {
    return {
      elapsed: this.elapsed,
      attackElapsed: this.attackElapsed,
      caughtElapsed: this.caughtElapsed,
      grip: this.grip,
      phase:
        this.caughtElapsed !== null
          ? 'caught'
          : this.elapsed === null
            ? 'hidden'
            : this.attackElapsed === null
              ? 'fingers'
              : this.attackElapsed < intruderTiming.brace
                ? 'bracing'
                : this.attackElapsed <
                    intruderTiming.brace +
                      intruderTiming.strike +
                      intruderTiming.hold
                  ? 'striking'
                  : 'lodged',
    };
  }
}
