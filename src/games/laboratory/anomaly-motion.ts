import { anomalyDetails, type Scenario } from './anomalies.js';
import { frameTriggerX } from './spatial-rules.js';
import type { PlayerSnapshot } from './game.js';

type Trace = {
  readonly x: number;
  readonly y: number;
  readonly facing: -1 | 1;
};
export type AnomalySnapshot = {
  readonly elapsed: number;
  readonly activeElapsed: number | null;
  readonly doorX: number;
  readonly machineX: number;
  readonly shadow: Trace;
  readonly echo: Trace | null;
  readonly flowOffset: number;
  readonly blackoutX: number;
  readonly backstageDoorOpen: number;
};

export class AnomalyMotion {
  private elapsed = 0;
  private activeElapsed: number | null = null;
  private doorX = 1080;
  private machineX = 1320;
  private shadow: Trace = { x: 360, y: 340, facing: 1 };
  private echo: Trace | null = null;
  private flowOffset = 0;
  private blackoutX = 1180;
  private backstageDoorOpen = 0;
  private readonly history: { time: number; pose: Trace }[] = [];

  update(
    seconds: number,
    scenario: Scenario,
    player: PlayerSnapshot,
    previous: PlayerSnapshot,
  ): boolean {
    this.elapsed += seconds;
    if (scenario === 'normal') return false;
    if (this.activeElapsed !== null) this.activeElapsed += seconds;
    const moved = Math.abs(player.x - previous.x) > 0;
    const revealed =
      scenario === 'frame-escape'
        ? player.x >= frameTriggerX &&
          player.facing === 1 &&
          player.flashRemaining > 0
        : scenario === 'lingering-echo'
          ? player.flashRemaining > 0
          : scenario === 'late-shadow' || scenario === 'reverse-flow'
            ? moved
            : player.x >= anomalyDetails[scenario].observeX;
    if (this.activeElapsed === null && revealed) {
      this.activeElapsed = 0;
      this.blackoutX = player.x + 90;
      if (scenario === 'lingering-echo') this.echo = { ...previous };
    }
    if (scenario === 'late-shadow') {
      this.history.push({ time: this.elapsed, pose: { ...player } });
      while (
        this.history.length &&
        this.history[0]!.time <= this.elapsed - 0.65
      ) {
        this.shadow = this.history.shift()!.pose;
      }
    }
    if (scenario === 'following-door' && this.activeElapsed !== null) {
      const target = Math.max(720, Math.min(1800, player.x + 130));
      this.doorX += Math.max(
        -seconds * 170,
        Math.min(seconds * 170, target - this.doorX),
      );
    }
    if (scenario === 'creeping-machine' && this.activeElapsed !== null) {
      const distance = player.x - this.machineX;
      // 기계가 시선 뒤에 있을 때만 움직이며 몸을 통과하지 않는다.
      if (distance * player.facing > 0 && Math.abs(distance) > 135) {
        this.machineX +=
          Math.sign(distance) *
          Math.min(seconds * 260, Math.abs(distance) - 135);
      }
    }
    if (
      scenario === 'lingering-echo' &&
      this.echo &&
      this.activeElapsed !== null &&
      this.activeElapsed > 0.7
    ) {
      const distance = player.x - player.facing * 65 - this.echo.x;
      this.echo = {
        x:
          this.echo.x +
          Math.sign(distance) * Math.min(Math.abs(distance), seconds * 190),
        y: this.echo.y + (player.y - this.echo.y) * Math.min(1, seconds * 4),
        facing: distance < 0 ? -1 : 1,
      };
    }
    if (scenario === 'folding-stage') {
      const proximity = Math.max(0, Math.min(1, (player.x - 1690) / 290));
      // 한 번 들여다본 문은 벽을 닫아도 같은 방 안에서 열린 흔적을 남긴다.
      this.backstageDoorOpen = Math.max(
        this.backstageDoorOpen,
        Math.min(proximity, this.backstageDoorOpen + seconds * 0.65),
      );
    }
    if (scenario === 'reverse-flow')
      this.flowOffset -= player.facing * seconds * (moved ? 210 : 60);
    return this.activeElapsed !== null;
  }

  get snapshot(): AnomalySnapshot {
    return {
      elapsed: this.elapsed,
      activeElapsed: this.activeElapsed,
      doorX: this.doorX,
      machineX: this.machineX,
      shadow: this.shadow,
      echo: this.echo,
      flowOffset: this.flowOffset,
      blackoutX: this.blackoutX,
      backstageDoorOpen: this.backstageDoorOpen,
    };
  }
}
