import { anomalyDetails, type Scenario } from './anomalies.js';
import type { Player, PlayerSnapshot } from './player.js';
import { Blackout } from './blackout.js';
import { FoldingStage } from './folding-stage.js';
import { LoweringCeiling } from './lowering-ceiling.js';
import { MirroredLab } from './mirrored-lab.js';

export type AnomalySnapshot = {
  readonly elapsed: number;
  readonly activeElapsed: number | null;
  readonly mirrorElapsed: number | null;
  readonly blackoutX: number;
  readonly ceilingSlam: number | null;
  readonly backstageDoorOpen: number;
  readonly backstageReturning: boolean;
  readonly returnDoorOpen: number;
};

// 공통 발동 시각과 표시용 스냅샷을 연결하고, 개별 규칙은 각 이상현상이 소유한다.
export class AnomalyMotion {
  private elapsed = 0;
  private activeElapsed: number | null = null;
  private readonly blackout = new Blackout();
  private readonly stage = new FoldingStage();
  private readonly ceiling = new LoweringCeiling();
  private readonly mirror = new MirroredLab();

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
    if (scenario === 'blackout')
      this.blackout.update(previousActive, this.activeElapsed, player.x);
    const revealed = player.x >= anomalyDetails[scenario].observeX;
    if (this.activeElapsed === null && revealed) {
      this.activeElapsed = 0;
      this.blackout.reveal(player.x);
    }
    switch (scenario) {
      case 'mirrored-lab':
        this.mirror.update(seconds, this.activeElapsed, player.x);
        break;
      case 'lowering-ceiling':
        this.ceiling.update(seconds, player.x);
        break;
      case 'folding-stage':
        this.stage.update(
          seconds,
          this.activeElapsed !== null,
          player,
          previous,
        );
        break;
    }
    return this.activeElapsed !== null;
  }

  resolveCeilingContact(player: Player): boolean {
    return this.ceiling.resolveContact(player);
  }

  get snapshot(): AnomalySnapshot {
    const stage = this.stage.snapshot;
    return {
      elapsed: this.elapsed,
      activeElapsed: this.activeElapsed,
      mirrorElapsed: this.mirror.mirrorElapsed,
      blackoutX: this.blackout.position,
      ceilingSlam: this.ceiling.slamElapsed,
      backstageDoorOpen: stage.doorOpen,
      backstageReturning: stage.returning,
      returnDoorOpen: stage.returnDoorOpen,
    };
  }
}
