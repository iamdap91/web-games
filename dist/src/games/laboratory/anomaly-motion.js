import { anomalyDetails } from './anomalies.js';
import { Blackout } from './blackout.js';
import { FoldingStage } from './folding-stage.js';
import { LoweringCeiling } from './lowering-ceiling.js';
import { MirroredLab } from './mirrored-lab.js';
// 공통 발동 시각과 표시용 스냅샷을 연결하고, 개별 규칙은 각 이상현상이 소유한다.
export class AnomalyMotion {
    elapsed = 0;
    activeElapsed = null;
    blackout = new Blackout();
    stage = new FoldingStage();
    ceiling = new LoweringCeiling();
    mirror = new MirroredLab();
    update(seconds, scenario, player, previous) {
        this.elapsed += seconds;
        if (scenario === 'normal')
            return false;
        const previousActive = this.activeElapsed;
        if (this.activeElapsed !== null)
            this.activeElapsed += seconds;
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
                this.stage.update(seconds, this.activeElapsed !== null, player, previous);
                break;
        }
        return this.activeElapsed !== null;
    }
    resolveCeilingContact(player) {
        return this.ceiling.resolveContact(player);
    }
    get snapshot() {
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
