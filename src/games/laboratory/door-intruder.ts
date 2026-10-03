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
  recover: 0.32,
  turn: 0.22,
  secondBrace: 0.18,
  withdraw: 0.65,
  close: 0.28,
  drag: 1.15,
} as const;
const handsAt = intruderTiming.drag + 0.22;
const faceAt = handsAt + 0.12;
const blackoutAt = faceAt + 0.2 + 0.12;
export const intruderScare = {
  bars: 0.18,
  look: 0.9,
  lookDuration: 0.22,
  hands: handsAt,
  handDuration: 0.2,
  face: faceAt,
  faceDuration: 0.2,
  blackout: blackoutAt,
  finish: blackoutAt + 0.18,
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

const firstEnd =
  intruderTiming.brace + intruderTiming.strike + intruderTiming.hold;
const turnStart = firstEnd + intruderTiming.recover;
const turnEnd = turnStart + intruderTiming.turn;
const secondStrike = turnEnd + intruderTiming.secondBrace;
const secondEnd = secondStrike + intruderTiming.strike + intruderTiming.hold;
const withdrawStart = secondEnd + intruderTiming.recover;
const withdrawEnd = withdrawStart + intruderTiming.withdraw;
const closedAt = withdrawEnd + intruderTiming.close;
const attackWindows = [
  { start: intruderTiming.brace, end: firstEnd },
  { start: secondStrike, end: secondEnd },
] as const;
export const intruderPivotX =
  intruderDoor.openingX + intruderDoor.openingWidth / 2;

export type Point = { readonly x: number; readonly y: number };
export type IntruderSnapshot = {
  readonly elapsed: number | null;
  readonly attackElapsed: number | null;
  readonly caughtElapsed: number | null;
  readonly grip: Point | null;
  readonly phase:
    | 'hidden'
    | 'fingers'
    | 'bracing'
    | 'striking'
    | 'recovering'
    | 'turning'
    | 'withdrawing'
    | 'gone'
    | 'caught';
};

// 붙잡은 방향은 고정하되, 손보다 늦게 나오는 몸의 등장 시계는 계속 흐른다.
function poseTime(state: IntruderSnapshot): number {
  return (state.attackElapsed ?? 0) - (state.caughtElapsed ?? 0);
}

export function intruderTurn(state: IntruderSnapshot): number {
  return smooth((poseTime(state) - turnStart) / intruderTiming.turn);
}

export function intruderWithdrawal(state: IntruderSnapshot): number {
  if (state.caughtElapsed !== null) return 0;
  return smooth((poseTime(state) - withdrawStart) / intruderTiming.withdraw);
}

export function intruderReveal(state: IntruderSnapshot): {
  readonly fingers: number;
  readonly hand: number;
  readonly body: number;
} {
  const strike =
    state.attackElapsed === null
      ? -1
      : state.attackElapsed - intruderTiming.brace;
  const remaining = 1 - intruderWithdrawal(state);
  return {
    fingers: smooth(((state.elapsed ?? 0) - 0.25) / 1.1),
    hand: smooth(strike / intruderTiming.strike) * remaining,
    body:
      smooth(
        (strike - intruderTiming.bodyDelay) / intruderTiming.bodyDuration,
      ) * remaining,
  };
}

export function intruderDoorOpen(state: IntruderSnapshot): number {
  const strike = Math.max(0, (state.attackElapsed ?? 0) - intruderTiming.brace);
  const pushed = 1 - (1 - Math.min(1, strike / 0.17)) ** 3;
  const closing =
    state.caughtElapsed === null
      ? smooth((poseTime(state) - withdrawEnd) / intruderTiming.close)
      : 0;
  return (0.06 * intruderReveal(state).fingers + pushed * 0.88) * (1 - closing);
}

export function intruderExtension(attack: number | null): number {
  if (attack === null) return 0;
  const start = attack >= secondStrike ? secondStrike : intruderTiming.brace;
  const t = attack - start;
  if (t < 0) return 0;
  if (t < intruderTiming.strike)
    return 1 - (1 - t / intruderTiming.strike) ** 3;
  return (
    1 -
    smooth(
      (t - intruderTiming.strike - intruderTiming.hold) /
        intruderTiming.recover,
    )
  );
}

// 그림은 항상 왼쪽을 향한 원형으로 만들고, 문 중앙을 기준으로 몸 전체를 돌린다.
export function intruderLocalHand(state: IntruderSnapshot): Point {
  const extension = intruderExtension(poseTime(state));
  const normal = {
    x: intruderDoor.seamX - extension * 446,
    y: intruderDoor.wristY + extension * 38,
  };
  if (state.caughtElapsed === null || state.grip === null) return normal;
  const gripX =
    intruderTurn(state) < 0.5
      ? state.grip.x
      : intruderPivotX * 2 - state.grip.x;
  const drag = smooth((state.caughtElapsed - 0.12) / 0.9);
  return {
    x: gripX + (intruderPivotX - gripX) * drag,
    y: state.grip.y + (282 - state.grip.y) * drag,
  };
}

export function intruderHand(state: IntruderSnapshot): Point {
  const hand = intruderLocalHand(state);
  return {
    x:
      intruderPivotX +
      (hand.x - intruderPivotX) * (1 - intruderTurn(state) * 2),
    y: hand.y,
  };
}

function intruderPhase(
  state: Omit<IntruderSnapshot, 'phase'>,
): IntruderSnapshot['phase'] {
  if (state.caughtElapsed !== null) return 'caught';
  if (state.elapsed === null) return 'hidden';
  const attack = state.attackElapsed;
  if (attack === null) return 'fingers';
  if (attack < intruderTiming.brace) return 'bracing';
  if (attack < firstEnd) return 'striking';
  if (attack < turnStart) return 'recovering';
  if (attack < turnEnd) return 'turning';
  if (attack < secondStrike) return 'bracing';
  if (attack < secondEnd) return 'striking';
  if (attack < withdrawStart) return 'recovering';
  return attack < closedAt ? 'withdrawing' : 'gone';
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
    if (attack === null) return;
    const previousAttack = before.attackElapsed ?? 0;
    // 방향 전환과 팔 회수에는 판정이 없다. 긴 프레임도 공격 구간만 검사한다.
    for (const window of attackWindows) {
      const start = Math.max(previousAttack, window.start);
      const end = Math.min(attack, window.end);
      if (start >= end) continue;
      const duration = attack - previousAttack;
      const at = (time: number): PlayerSnapshot => {
        const fraction = (time - previousAttack) / duration;
        return {
          ...player,
          x: previous.x + (player.x - previous.x) * fraction,
          y: previous.y + (player.y - previous.y) * fraction,
        };
      };
      const from = intruderHand({ ...before, attackElapsed: start });
      const hand = intruderHand({ ...this.snapshot, attackElapsed: end });
      if (!sweptGrab(from, hand, at(start), at(end))) continue;
      this.caughtElapsed = 0;
      this.grip = hand;
      // 한 프레임이 방향 전환까지 넘어가도 잡은 쪽에서 끌어들인다.
      this.attackElapsed = end;
      return;
    }
  }

  get snapshot(): IntruderSnapshot {
    const state = {
      elapsed: this.elapsed,
      attackElapsed: this.attackElapsed,
      caughtElapsed: this.caughtElapsed,
      grip: this.grip,
    };
    return { ...state, phase: intruderPhase(state) };
  }
}
