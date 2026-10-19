import type { ComboMotion, ComboStep } from './types.js';

export const repeatGapMs = 700;

// 결정타 뒤 140ms만 늦추고 두 단계로 정상 속도에 복귀한다. 수동 배속과는 별개다.
const finalSlowSegments = [
  { endMs: 65, scale: 0.55 },
  { endMs: 105, scale: 0.75 },
  { endMs: 140, scale: 0.9 },
] as const;

export type ComboHitStop = {
  readonly timeMs: number;
  readonly durationMs: number;
  readonly kind?: 'hit' | 'super';
};

export type ComboSnapshot = {
  readonly motion: ComboMotion;
  readonly step: ComboStep;
  readonly stepIndex: number;
  readonly stepElapsedMs: number;
  readonly elapsedMs: number;
  readonly durationMs: number;
  readonly x: number;
  readonly y: number;
  readonly paused: boolean;
  readonly waiting: boolean;
  readonly opacity: number;
};

export function comboDuration(motion: ComboMotion): number {
  return motion.steps.reduce((sum, step) => sum + step.durationMs, 0);
}

function movementProgress(
  progress: number,
  curve: 'ease-in' | 'ease-out' | 'hold' | undefined,
): number {
  if (curve === 'hold') return 0;
  if (curve === 'ease-in') return progress * progress;
  if (curve === 'ease-out') return 1 - (1 - progress) * (1 - progress);
  return progress;
}

export type ComboPose = Omit<ComboSnapshot, 'paused' | 'waiting' | 'opacity'>;

// 잔상도 재생 시점에서 계산해 정지·시간 탐색·다시 재생의 결과를 같게 유지한다.
export function sampleComboMotion(
  motion: ComboMotion,
  timeMs: number,
): ComboPose {
  const durationMs = comboDuration(motion);
  const elapsedMs = Math.max(
    0,
    Math.min(Number.isFinite(timeMs) ? timeMs : 0, durationMs),
  );
  let remaining = Math.min(elapsedMs, durationMs);
  let stepIndex = motion.steps.length - 1;
  for (const [index, step] of motion.steps.entries()) {
    if (remaining < step.durationMs || index === stepIndex) {
      stepIndex = index;
      break;
    }
    remaining -= step.durationMs;
  }
  const step = motion.steps[stepIndex]!;
  const next = motion.steps[stepIndex + 1] ?? step;
  const blend = Math.min(1, remaining / step.durationMs);
  const horizontalBlend = movementProgress(blend, step.movementCurve?.x);
  const verticalBlend = movementProgress(blend, step.movementCurve?.y);
  return {
    motion,
    step,
    stepIndex,
    stepElapsedMs: remaining,
    elapsedMs,
    durationMs,
    x: step.x + (next.x - step.x) * horizontalBlend,
    y: (step.y ?? 0) + ((next.y ?? 0) - (step.y ?? 0)) * verticalBlend,
  };
}

/** 동작 선택·시간·정지를 소유하며 그리기와 입력에 의존하지 않는다. */
export class ComboPlayer {
  private motion: ComboMotion;
  private elapsedMs = 0;
  private paused = false;
  private speed = 1;
  private repeating = true;
  private hitStops: readonly ComboHitStop[] = [];
  private nextHitStop = 0;
  private hitStopRemainingMs = 0;
  private activeStop: ComboHitStop | undefined;
  private finalSlowStartMs: number | undefined;

  constructor(motion: ComboMotion) {
    this.motion = motion;
  }

  play(motion: ComboMotion = this.motion): void {
    this.motion = motion;
    this.elapsedMs = 0;
    this.paused = false;
    this.nextHitStop = 0;
    this.hitStopRemainingMs = 0;
    this.activeStop = undefined;
  }

  /** 같은 기술의 표시 박자만 교체할 때 정지 사건과 반복 대기 시간을 보존한다. */
  replacePresentation(motion: ComboMotion): void {
    this.motion = motion;
    this.elapsedMs = Math.min(
      this.elapsedMs,
      comboDuration(motion) + (this.repeating ? repeatGapMs : 0),
    );
  }

  setHitStops(hitStops: readonly ComboHitStop[]): void {
    const active = this.activeStop;
    const remaining = this.hitStopRemainingMs;
    this.hitStops = hitStops
      .filter(
        (stop) =>
          Number.isFinite(stop.timeMs) &&
          stop.timeMs >= 0 &&
          Number.isFinite(stop.durationMs) &&
          stop.durationMs > 0,
      )
      .sort((a, b) => a.timeMs - b.timeMs);
    this.resetHitStopCursor();
    // 표시 옵션을 바꾸어도 같은 정지 사건이 남아 있으면 남은 시간을 보존한다.
    if (
      active &&
      this.hitStops.some(
        (stop) =>
          stop.timeMs === active.timeMs &&
          stop.durationMs === active.durationMs &&
          (stop.kind ?? 'hit') === (active.kind ?? 'hit'),
      )
    ) {
      this.activeStop = active;
      this.hitStopRemainingMs = remaining;
    }
  }

  private resetHitStopCursor(): void {
    const next = this.hitStops.findIndex(
      (stop) => stop.timeMs > this.elapsedMs,
    );
    this.nextHitStop = next < 0 ? this.hitStops.length : next;
    this.hitStopRemainingMs = 0;
    this.activeStop = undefined;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  get hitStopped(): boolean {
    return this.hitStopRemainingMs > 0;
  }

  get stopKind(): 'hit' | 'super' | undefined {
    return this.hitStopped ? (this.activeStop?.kind ?? 'hit') : undefined;
  }

  get hitStopElapsedMs(): number | undefined {
    return this.stopKind === 'hit' && this.activeStop
      ? this.activeStop.durationMs - this.hitStopRemainingMs
      : undefined;
  }

  setFinalSlowMotion(timeMs: number | undefined): void {
    this.finalSlowStartMs =
      timeMs !== undefined && Number.isFinite(timeMs) && timeMs >= 0
        ? timeMs
        : undefined;
  }

  get presentationSpeed(): number {
    const start = this.finalSlowStartMs;
    if (start === undefined || this.elapsedMs < start) return 1;
    return (
      finalSlowSegments.find(({ endMs }) => this.elapsedMs < start + endMs)
        ?.scale ?? 1
    );
  }

  private nextSlowBoundary(): number {
    const start = this.finalSlowStartMs;
    if (start === undefined) return Infinity;
    return (
      [start, ...finalSlowSegments.map(({ endMs }) => start + endMs)].find(
        (time) => time > this.elapsedMs + 0.0001,
      ) ?? Infinity
    );
  }

  setSpeed(speed: number): void {
    if (Number.isFinite(speed) && speed > 0) this.speed = speed;
  }

  setRepeating(repeating: boolean): void {
    this.repeating = repeating;
    const clamped = Math.min(this.elapsedMs, comboDuration(this.motion));
    if (clamped !== this.elapsedMs) {
      this.elapsedMs = clamped;
      this.resetHitStopCursor();
    }
  }

  seek(elapsedMs: number): void {
    if (!Number.isFinite(elapsedMs)) return;
    this.elapsedMs = Math.max(
      0,
      Math.min(elapsedMs, comboDuration(this.motion)),
    );
    this.paused = true;
    this.resetHitStopCursor();
  }

  showStep(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.motion.steps.length - 1));
    this.seek(
      this.motion.steps
        .slice(0, clamped)
        .reduce((sum, step) => sum + step.durationMs, 0),
    );
  }

  update(deltaMs: number): void {
    if (this.paused || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
    const duration = comboDuration(this.motion);
    let remaining = deltaMs * this.speed;
    // 명중 정지는 재생 시간을 소비하지만 동작 시각은 진행하지 않는다.
    // 시점 탐색은 정지 이벤트를 건너뛰며 반복 시작에서만 다시 무장한다.
    while (remaining > 0) {
      if (this.hitStopRemainingMs > 0) {
        const consumed = Math.min(remaining, this.hitStopRemainingMs);
        this.hitStopRemainingMs -= consumed;
        if (this.hitStopRemainingMs <= 0) this.activeStop = undefined;
        remaining -= consumed;
        continue;
      }
      const stop = this.hitStops[this.nextHitStop];
      if (stop && stop.timeMs <= duration && stop.timeMs <= this.elapsedMs) {
        this.hitStopRemainingMs = stop.durationMs;
        this.activeStop = stop;
        this.nextHitStop++;
        continue;
      }
      const end = duration + (this.repeating ? repeatGapMs : 0);
      if (this.elapsedMs >= end) {
        if (!this.repeating) break;
        this.elapsedMs = 0;
        this.nextHitStop = 0;
        continue;
      }
      const boundary = Math.min(
        end,
        stop && stop.timeMs <= duration ? stop.timeMs : Infinity,
        this.nextSlowBoundary(),
      );
      const scale = this.presentationSpeed;
      const required = (boundary - this.elapsedMs) / scale;
      const consumed = Math.min(remaining, required);
      // 정지·배속 경계를 넘지 않아 프레임 간격이 달라도 같은 시각에 전환한다.
      this.elapsedMs =
        consumed >= required ? boundary : this.elapsedMs + consumed * scale;
      remaining -= consumed;
    }
  }

  /** 현재 표시 설정으로 처음부터 한 주기를 재생한다. 화면의 시각·정지는 바꾸지 않는다. */
  createReplay(): {
    readonly player: ComboPlayer;
    readonly durationMs: number;
    readonly repeating: boolean;
  } {
    const player = new ComboPlayer(this.motion);
    player.setSpeed(this.speed);
    player.setRepeating(this.repeating);
    player.setHitStops(this.hitStops);
    player.setFinalSlowMotion(this.finalSlowStartMs);
    player.play();
    const duration = comboDuration(this.motion);
    const end = duration + (this.repeating ? repeatGapMs : 0);
    const stops = this.hitStops
      .filter((stop) => stop.timeMs <= duration)
      .reduce((sum, stop) => sum + stop.durationMs, 0);
    let slowExtra = 0;
    if (this.finalSlowStartMs !== undefined) {
      let previousEnd = 0;
      for (const segment of finalSlowSegments) {
        const span = Math.max(
          0,
          Math.min(end, this.finalSlowStartMs + segment.endMs) -
            (this.finalSlowStartMs + previousEnd),
        );
        slowExtra += span * (1 / segment.scale - 1);
        previousEnd = segment.endMs;
      }
    }
    return {
      player,
      durationMs: (end + stops + slowExtra) / this.speed,
      repeating: this.repeating,
    };
  }

  get snapshot(): ComboSnapshot {
    const durationMs = comboDuration(this.motion);
    const waiting = this.elapsedMs >= durationMs;
    return {
      ...sampleComboMotion(this.motion, this.elapsedMs),
      paused: this.paused,
      waiting,
      opacity:
        waiting && this.repeating && !this.paused
          ? Math.max(0, 1 - (this.elapsedMs - durationMs - 400) / 300)
          : 1,
    };
  }
}
