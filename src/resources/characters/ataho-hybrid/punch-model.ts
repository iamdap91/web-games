export const punchTiming = {
  duration: 1.25,
  contact: 0.41,
  contactEnd: 0.48,
  idleGap: 1.5,
} as const;

const keys = [
  { at: 0, frame: 0, lean: 0, label: '대기' },
  { at: 0.1, frame: 1, lean: -3, label: '주먹 올리기' },
  { at: 0.23, frame: 2, lean: -6, label: '힘 모으기' },
  { at: 0.35, frame: 3, lean: 4, label: '뻗기' },
  { at: punchTiming.contact, frame: 4, lean: 12, label: '타격' },
  { at: punchTiming.contactEnd, frame: 4, lean: 12, label: '타격' },
  { at: 0.53, frame: 3, lean: 6, label: '주먹 회수' },
  { at: 0.61, frame: 5, lean: 2, label: '주먹 회수' },
  { at: 0.74, frame: 2, lean: 0, label: '자세 풀기' },
  { at: 0.9, frame: 1, lean: 0, label: '자세 풀기' },
  { at: 1.08, frame: 0, lean: 0, label: '대기로 복귀' },
  { at: punchTiming.duration, frame: 0, lean: 0, label: '대기' },
] as const;

export type PunchSnapshot = {
  readonly attackTime: number | null;
  readonly ambientTime: number;
  readonly paused: boolean;
  readonly looping: boolean;
  readonly impacts: number;
};

export function samplePunch(snapshot: PunchSnapshot): {
  frame: number;
  rawFrame: number;
  lean: number;
  breathing: number;
  impact: number;
  label: string;
} {
  const time = snapshot.attackTime;
  const breathing = Math.sin(snapshot.ambientTime * 2.2) * 0.004;
  if (time === null)
    return {
      frame: 0,
      rawFrame: 0,
      lean: 0,
      breathing,
      impact: 0,
      label: '대기',
    };
  let index = 0;
  while (index + 1 < keys.length && keys[index + 1]!.at <= time) index += 1;
  const current = keys[index]!;
  const next = keys[Math.min(index + 1, keys.length - 1)]!;
  const progress =
    next.at > current.at ? (time - current.at) / (next.at - current.at) : 0;
  const eased = progress * progress * (3 - 2 * progress);
  const impact =
    time < punchTiming.contact
      ? 0
      : Math.max(0, 1 - (time - punchTiming.contact) / 0.24);
  return {
    frame: current.frame,
    rawFrame: Math.min(7, Math.floor((time / punchTiming.duration) * 8)),
    lean: current.lean + (next.lean - current.lean) * eased,
    breathing: 0,
    impact,
    label: current.label,
  };
}

/** 재생 시간과 반복·정지·타격 횟수는 이 객체 한 곳에서 유지한다. */
export class PunchPlayer {
  private attackTime: number | null = null;
  private ambientTime = 0;
  private idleTime = 0;
  private paused = false;
  private looping = true;
  private speed = 1;
  private impacts = 0;

  get snapshot(): PunchSnapshot {
    return {
      attackTime: this.attackTime,
      ambientTime: this.ambientTime,
      paused: this.paused,
      looping: this.looping,
      impacts: this.impacts,
    };
  }

  punch(): boolean {
    if (this.attackTime !== null && this.attackTime < punchTiming.duration)
      return false;
    this.attackTime = 0;
    this.idleTime = 0;
    this.paused = false;
    return true;
  }

  idle(): void {
    this.attackTime = null;
    this.idleTime = 0;
  }

  setPaused(value: boolean): void {
    this.paused = value;
  }
  setLooping(value: boolean): void {
    this.looping = value;
    this.idleTime = 0;
  }
  setSpeed(value: number): void {
    this.speed = value === 0.25 ? 0.25 : 1;
  }

  seek(time: number): void {
    if (!Number.isFinite(time)) return;
    this.attackTime = Math.max(0, Math.min(punchTiming.duration, time));
    this.paused = true;
  }

  update(delta: number): void {
    if (this.paused || !Number.isFinite(delta) || delta <= 0) return;
    let remaining = Math.min(delta, 10) * this.speed;
    this.ambientTime += remaining;
    while (remaining > 0) {
      if (this.attackTime === null) {
        if (!this.looping) return;
        const consumed = Math.min(
          remaining,
          punchTiming.idleGap - this.idleTime,
        );
        this.idleTime += consumed;
        remaining -= consumed;
        if (this.idleTime >= punchTiming.idleGap) this.punch();
        continue;
      }
      const previous = this.attackTime;
      const consumed = Math.min(remaining, punchTiming.duration - previous);
      this.attackTime += consumed;
      remaining -= consumed;
      if (
        previous < punchTiming.contact &&
        this.attackTime >= punchTiming.contact
      )
        this.impacts += 1;
      if (this.attackTime >= punchTiming.duration) this.idle();
    }
  }
}
