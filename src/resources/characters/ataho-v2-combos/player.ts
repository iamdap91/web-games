import type { ComboMotion, ComboStep } from './types.js';

export const repeatGapMs = 700;

export type ComboHitStop = {
  readonly timeMs: number;
  readonly durationMs: number;
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
  curve: 'ease-in' | 'ease-out' | undefined,
): number {
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

  constructor(motion: ComboMotion) {
    this.motion = motion;
  }

  play(motion: ComboMotion = this.motion): void {
    this.motion = motion;
    this.elapsedMs = 0;
    this.paused = false;
    this.nextHitStop = 0;
    this.hitStopRemainingMs = 0;
  }

  setHitStops(hitStops: readonly ComboHitStop[]): void {
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
  }

  private resetHitStopCursor(): void {
    const next = this.hitStops.findIndex(
      (stop) => stop.timeMs > this.elapsedMs,
    );
    this.nextHitStop = next < 0 ? this.hitStops.length : next;
    this.hitStopRemainingMs = 0;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  get hitStopped(): boolean {
    return this.hitStopRemainingMs > 0;
  }

  setSpeed(speed: number): void {
    if (Number.isFinite(speed) && speed > 0) this.speed = speed;
  }

  setRepeating(repeating: boolean): void {
    this.repeating = repeating;
    this.elapsedMs = Math.min(this.elapsedMs, comboDuration(this.motion));
    this.resetHitStopCursor();
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
        remaining -= consumed;
        continue;
      }
      const stop = this.hitStops[this.nextHitStop];
      if (
        stop &&
        stop.timeMs <= duration &&
        stop.timeMs >= this.elapsedMs &&
        stop.timeMs <= this.elapsedMs + remaining
      ) {
        remaining -= stop.timeMs - this.elapsedMs;
        this.elapsedMs = stop.timeMs;
        this.hitStopRemainingMs = stop.durationMs;
        this.nextHitStop++;
        continue;
      }
      const end = duration + (this.repeating ? repeatGapMs : 0);
      const advance = Math.min(remaining, end - this.elapsedMs);
      this.elapsedMs += advance;
      remaining -= advance;
      if (this.elapsedMs < end || !this.repeating) break;
      this.elapsedMs = 0;
      this.nextHitStop = 0;
    }
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
