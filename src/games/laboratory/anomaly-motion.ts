import { anomalyDetails, type Scenario } from './anomalies.js';
import { frameTriggerX } from './spatial-rules.js';
import { ceiling, smooth } from './event-rules.js';
import type { PlayerSnapshot } from './game.js';

export type AnomalySnapshot = {
  readonly elapsed: number;
  readonly activeElapsed: number | null;
  readonly machineX: number;
  readonly machineLean: number;
  readonly machineStride: number;
  readonly pipeBends: readonly number[];
  readonly blackoutX: number;
  readonly ceilingSlam: number | null;
  readonly invasion: number;
  readonly backstageDoorOpen: number;
  readonly backstageReturning: boolean;
  readonly returnDoorOpen: number;
};

export class AnomalyMotion {
  private elapsed = 0;
  private activeElapsed: number | null = null;
  private machineX = 1420;
  private machineLean = 0;
  private machineStride = 0;
  private machineUnwatched = 0;
  private machineApproaches = 0;
  private wasUnwatched = false;
  private readonly pipeBends = [0, 0, 0, 0, 0];
  private readonly history: { time: number; x: number }[] = [];
  private blackoutX = 1180;
  private ceilingSlam: number | null = null;
  private invasion = 0;
  private backstageDoorOpen = 0;
  private backstageReturning = false;
  private returnDoorOpen = 0;

  update(
    seconds: number,
    scenario: Scenario,
    player: PlayerSnapshot,
    previous: PlayerSnapshot,
  ): boolean {
    this.elapsed += seconds;
    if (scenario === 'normal') return false;
    const previousActive = this.activeElapsed;
    if (this.activeElapsed !== null) this.activeElapsed += seconds;
    if (
      scenario === 'blackout' &&
      previousActive !== null &&
      previousActive < 0.32 &&
      (this.activeElapsed ?? 0) >= 0.32
    )
      this.blackoutX = player.x + 120;
    const revealed =
      scenario === 'frame-escape'
        ? player.x >= frameTriggerX &&
          player.facing === 1 &&
          player.flashRemaining > 0
        : player.x >= anomalyDetails[scenario].observeX;
    if (this.activeElapsed === null && revealed) {
      this.activeElapsed = 0;
      this.blackoutX = player.x + 105;
    }
    if (scenario === 'bent-pipes') {
      this.history.push({ time: this.elapsed, x: player.x });
      while (
        this.history.length > 1 &&
        this.history[1]!.time < this.elapsed - 1.5
      )
        this.history.shift();
      this.pipeBends.forEach((bend, index) => {
        if (this.activeElapsed === null || this.activeElapsed < index * 0.16)
          return;
        const delay = 0.16 + index * 0.15;
        const targetX =
          this.history.find((pose) => pose.time >= this.elapsed - delay)?.x ??
          player.x;
        const target = Math.max(
          -120,
          Math.min(120, (targetX - (1460 + index * 120)) * 0.5),
        );
        this.pipeBends[index] =
          bend + (target - bend) * Math.min(1, seconds * 5);
      });
    }
    if (scenario === 'creeping-machine' && this.activeElapsed !== null) {
      const distance = player.x - this.machineX;
      const unwatched = distance * player.facing > 0;
      if (unwatched && !this.wasUnwatched) this.machineApproaches++;
      this.machineUnwatched = unwatched ? this.machineUnwatched + seconds : 0;
      const moving =
        unwatched && this.machineUnwatched > 0.18 && Math.abs(distance) > 90;
      const speed = moving
        ? Math.sign(distance) * Math.min(400, 170 + this.machineApproaches * 75)
        : 0;
      const travel =
        Math.sign(speed) *
        Math.min(
          Math.abs(speed) * seconds,
          Math.max(0, Math.abs(distance) - 90),
        );
      this.machineX += travel;
      this.machineStride += Math.abs(travel) / 45;
      this.machineLean +=
        ((moving ? -Math.sign(speed) * 0.055 : 0) - this.machineLean) *
        Math.min(1, seconds * (moving ? 5 : 12));
      this.wasUnwatched = unwatched;
    }
    if (scenario === 'lowering-ceiling') {
      if (this.ceilingSlam !== null) this.ceilingSlam += seconds;
      else if (player.x >= ceiling.trigger && (this.activeElapsed ?? 0) >= 0.8)
        this.ceilingSlam = 0;
    }
    if (scenario === 'room-invasion' && this.activeElapsed !== null) {
      const approach = smooth((player.x - 900) / 620);
      this.invasion = Math.max(
        this.invasion,
        Math.min(approach, this.invasion + seconds * 0.45),
      );
    }
    if (scenario === 'folding-stage') {
      if (this.activeElapsed !== null && player.x < previous.x)
        this.backstageReturning = true;
      if (this.backstageReturning) {
        const approach = Math.max(0, Math.min(1, (850 - player.x) / 500));
        this.returnDoorOpen = Math.max(
          this.returnDoorOpen,
          Math.min(approach, this.returnDoorOpen + seconds * 0.65),
        );
      }
      const proximity = Math.max(0, Math.min(1, (player.x - 1690) / 290));
      this.backstageDoorOpen = Math.max(
        this.backstageDoorOpen,
        Math.min(proximity, this.backstageDoorOpen + seconds * 0.65),
      );
    }
    return this.activeElapsed !== null;
  }

  get snapshot(): AnomalySnapshot {
    return {
      elapsed: this.elapsed,
      activeElapsed: this.activeElapsed,
      machineX: this.machineX,
      machineLean: this.machineLean,
      machineStride: this.machineStride,
      pipeBends: [...this.pipeBends],
      blackoutX: this.blackoutX,
      ceilingSlam: this.ceilingSlam,
      invasion: this.invasion,
      backstageDoorOpen: this.backstageDoorOpen,
      backstageReturning: this.backstageReturning,
      returnDoorOpen: this.returnDoorOpen,
    };
  }
}
