import {
  pushKickFrames,
  turnKickFrames,
  sweepKickFrames,
  straightPunchFrames,
  tigerFistFrames,
} from '../../resources/characters/ataho/combat-frames.js';
import {
  sequenceFrame,
  strikeFrame,
} from '../../resources/characters/ataho/motion-frame.js';
import type { Point } from './combatant.js';

export const tigerBarrageRules = {
  name: '초구취호패타',
  dashAt: 0.18,
  arriveAt: 0.3,
  windupAt: 1.46,
  finalAt: 1.73,
  duration: 2.15,
  strikeDamage: 5,
  finalDamage: 135,
  hitStop: 0.012,
  finalStop: 0.13,
} as const;

const hitTimes = [
  // 기존 난무 구간 안에 19타를 넣어 마무리까지 총 20타를 쏟아붓는다.
  ...Array.from({ length: 19 }, (_, index) => 0.32 + index * 0.06),
  tigerBarrageRules.finalAt,
] as const;

export type TigerBarrageSnapshot = {
  readonly targetId: number;
  readonly origin: Point;
  readonly destination: Point;
  readonly target: Point;
  readonly elapsed: number;
  readonly hits: number;
  readonly damage: number;
};

export type BarrageStrike = {
  readonly hit: number;
  readonly final: boolean;
  readonly damage: number;
};

/** 난무의 시간과 타격 순서를 소유해 표시 프레임과 무관하게 각 타격을 한 번 적용한다. */
export class TigerBarrage {
  private elapsed = 0;
  private nextHit = 0;
  private hits = 0;
  private damage = 0;

  constructor(
    private readonly setup: Omit<
      TigerBarrageSnapshot,
      'elapsed' | 'hits' | 'damage'
    >,
  ) {}

  get snapshot(): TigerBarrageSnapshot {
    return {
      ...this.setup,
      elapsed: this.elapsed,
      hits: this.hits,
      damage: this.damage,
    };
  }

  get done(): boolean {
    return this.elapsed >= tigerBarrageRules.duration;
  }

  update(dt: number): readonly BarrageStrike[] {
    this.elapsed = Math.min(tigerBarrageRules.duration, this.elapsed + dt);
    const strikes: BarrageStrike[] = [];
    while (
      this.nextHit < hitTimes.length &&
      this.elapsed >= hitTimes[this.nextHit]!
    ) {
      const final = this.nextHit === hitTimes.length - 1;
      this.nextHit++;
      strikes.push({
        hit: this.nextHit,
        final,
        damage: final
          ? tigerBarrageRules.finalDamage
          : tigerBarrageRules.strikeDamage,
      });
    }
    return strikes;
  }

  recordHit(damage: number): void {
    this.hits++;
    this.damage += damage;
  }
}

function barrageMotion(time: number): { animation: string; frame: number } {
  if (time < tigerBarrageRules.dashAt)
    return {
      animation: 'overdrive-charge',
      frame: sequenceFrame([0, 1, 2, 3, 4], time / tigerBarrageRules.dashAt),
    };
  if (time < tigerBarrageRules.arriveAt)
    return { animation: 'straight-punch', frame: 0 };
  if (time < 0.6) {
    const next = hitTimes.find((at) => at > time) ?? 0.62;
    const previous = [...hitTimes].reverse().find((at) => at <= time);
    const age = previous === undefined ? Infinity : time - previous;
    const frame =
      age < 0.018
        ? straightPunchFrames.contact
        : next - time < 0.022
          ? sequenceFrame(straightPunchFrames.windup, 1 - (next - time) / 0.022)
          : sequenceFrame(straightPunchFrames.recovery, (age - 0.018) / 0.02);
    return { animation: 'straight-punch', frame };
  }
  if (time < 0.89)
    return {
      animation: 'battle-kick',
      frame: strikeFrame(pushKickFrames, {
        time,
        windupAt: 0.6,
        contactAt: 0.62,
        recoverAt: 0.75,
        endAt: 0.89,
      }),
    };
  if (time < 1.12)
    return {
      animation: 'sweep-kick',
      frame: strikeFrame(sweepKickFrames, {
        time,
        windupAt: 0.89,
        contactAt: 0.92,
        recoverAt: 0.99,
        endAt: 1.12,
      }),
    };
  if (time < 1.3)
    return {
      animation: 'turn-kick',
      frame: strikeFrame(turnKickFrames, {
        time,
        windupAt: 1.12,
        contactAt: 1.16,
        recoverAt: 1.24,
        endAt: 1.3,
      }),
    };
  if (time < tigerBarrageRules.windupAt) {
    // 도약과 착지를 가진 기존 날라차기 포즈로 공중 회전 양끝을 연결한다.
    const air = [
      { animation: 'flying-kick', frame: 2 },
      { animation: 'flying-kick', frame: 3 },
      { animation: 'somersault', frame: 0 },
      { animation: 'somersault', frame: 1 },
      { animation: 'somersault', frame: 2 },
      { animation: 'somersault', frame: 3 },
      { animation: 'flying-kick', frame: 12 },
      { animation: 'flying-kick', frame: 13 },
      { animation: 'flying-kick', frame: 14 },
    ];
    const progress = (time - 1.3) / (tigerBarrageRules.windupAt - 1.3);
    return air[Math.min(air.length - 1, Math.floor(progress * air.length))]!;
  }
  if (time < 1.62)
    return {
      animation: 'tiger-fist',
      frame: sequenceFrame(
        [0, 1, 2],
        (time - tigerBarrageRules.windupAt) /
          (1.62 - tigerBarrageRules.windupAt),
      ),
    };
  if (time < tigerBarrageRules.finalAt)
    return { animation: 'tiger-fist', frame: 2 };
  if (time < 1.98)
    return { animation: 'tiger-fist', frame: tigerFistFrames.contact };
  return {
    animation: 'tiger-fist',
    frame: sequenceFrame(
      [5, 0],
      (time - 1.98) / (tigerBarrageRules.duration - 1.98),
    ),
  };
}

export function barrageHitTime(hit: number): number {
  return hitTimes[hit - 1] ?? 0;
}

export function barragePose(state: TigerBarrageSnapshot): {
  readonly point: Point;
  readonly height: number;
  readonly animation: string;
  readonly frame: number;
  readonly direction: number;
} {
  const time = state.elapsed;
  const direction = state.target.x < state.destination.x ? -1 : 1;
  const progress = Math.max(
    0,
    Math.min(
      1,
      (time - tigerBarrageRules.dashAt) /
        (tigerBarrageRules.arriveAt - tigerBarrageRules.dashAt),
    ),
  );
  const travel = 1 - Math.pow(1 - progress, 3);
  const jab =
    time >= tigerBarrageRules.arriveAt && time < tigerBarrageRules.windupAt
      ? Math.sin(time * 70) * 0.075
      : time >= tigerBarrageRules.finalAt
        ? Math.max(
            0,
            1 -
              (time - tigerBarrageRules.finalAt) /
                (tigerBarrageRules.duration - tigerBarrageRules.finalAt),
          ) * 0.18
        : 0;
  const motion = barrageMotion(time);
  return {
    point: {
      x:
        state.origin.x +
        (state.destination.x - state.origin.x) * travel +
        direction * jab,
      z: state.origin.z + (state.destination.z - state.origin.z) * travel,
    },
    height:
      time >= 1.3 && time < tigerBarrageRules.windupAt
        ? Math.sin(
            ((time - 1.3) / (tigerBarrageRules.windupAt - 1.3)) * Math.PI,
          ) * 0.42
        : 0,
    animation: motion.animation,
    frame: motion.frame,
    direction,
  };
}
