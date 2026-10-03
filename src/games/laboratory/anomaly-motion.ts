import { anomalyDetails, type Scenario } from './anomalies.js';
import { frameTriggerX } from './spatial-rules.js';
import { ceiling, roomFlip } from './event-rules.js';
import type { PlayerSnapshot } from './game.js';

export type AnomalySnapshot = {
  readonly elapsed: number;
  readonly activeElapsed: number | null;
  readonly mirrorElapsed: number | null;
  readonly machineX: number;
  readonly machineLean: number;
  readonly machineStride: number;
  readonly blackoutX: number;
  readonly ceilingSlam: number | null;
  readonly backstageDoorOpen: number;
  readonly backstageReturning: boolean;
  readonly returnDoorOpen: number;
};

export class AnomalyMotion {
  private elapsed = 0;
  private activeElapsed: number | null = null;
  private mirrorElapsed: number | null = null;
  private flipFinishX: number | null = null;
  private machineX = 1420;
  private machineLean = 0;
  private machineStride = 0;
  private machineUnwatched = 0;
  private machineApproaches = 0;
  private wasUnwatched = false;
  private blackoutX = 1180;
  private ceilingSlam: number | null = null;
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
    if (
      scenario === 'mirrored-lab' &&
      (this.activeElapsed ?? 0) >= roomFlip.duration
    ) {
      this.flipFinishX ??= player.x;
      if (this.mirrorElapsed !== null) this.mirrorElapsed += seconds;
      else if (Math.abs(player.x - this.flipFinishX) >= roomFlip.returnDistance)
        this.mirrorElapsed = 0;
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
      else if (player.x >= ceiling.trigger) this.ceilingSlam = 0;
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
      mirrorElapsed: this.mirrorElapsed,
      machineX: this.machineX,
      machineLean: this.machineLean,
      machineStride: this.machineStride,
      blackoutX: this.blackoutX,
      ceilingSlam: this.ceilingSlam,
      backstageDoorOpen: this.backstageDoorOpen,
      backstageReturning: this.backstageReturning,
      returnDoorOpen: this.returnDoorOpen,
    };
  }
}
