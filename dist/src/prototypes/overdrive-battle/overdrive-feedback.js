import { actionPosition } from './world.js';
import { overdriveIntro } from './overdrive-intro.js';
/** 타격 정지와 독립된 연출 시간을 소유한다. 창 이탈·일시정지는 전달된 dt=0을 따른다. */
export class OverdriveFeedback {
    strikes = [];
    presence = 0;
    windup = 0;
    focus = { x: 0, z: 0 };
    update(dt, state) {
        this.strikes = this.strikes
            .map((strike) => ({ ...strike, age: strike.age + dt }))
            .filter((strike) => strike.age < strike.duration);
        const active = state.phase === 'overdrive';
        const entering = state.phase === 'breaking' && state.phaseTime >= overdriveIntro.burstAt;
        this.presence +=
            (Number(active || entering) - this.presence) * Math.min(1, dt * 14);
        const action = active ? state.action : null;
        this.windup =
            action?.driveBeat !== undefined &&
                (action.driveFinisher || action.driveBeat === 1) &&
                action.elapsed < action.contactTime
                ? Math.pow(action.elapsed / action.contactTime, 2) *
                    (action.driveFinisher ? 1 : 0.5)
                : 0;
        const hero = action ? actionPosition(action) : state.player;
        const target = state.enemies.find((enemy) => enemy.id === action?.targetIds[0]);
        const focus = target
            ? { x: (hero.x + target.x) / 2, z: (hero.z + target.z) / 2 }
            : hero;
        const blend = Math.min(1, dt * 12);
        this.focus = {
            x: this.focus.x + (focus.x - this.focus.x) * blend,
            z: this.focus.z + (focus.z - this.focus.z) * blend,
        };
    }
    addImpacts(impacts) {
        for (const impact of impacts) {
            const drive = impact.drive;
            if (!drive?.primary)
                continue;
            this.strikes.push({
                impact: { ...impact, drive },
                age: 0,
                duration: drive.finisher ? 0.3 : drive.beat === 1 ? 0.24 : 0.16,
            });
        }
        this.strikes = this.strikes.slice(-4);
    }
    get snapshot() {
        let zoom = this.windup * 0.035;
        let dim = this.windup * 0.28;
        let kick = { x: 0, z: 0 };
        for (const { impact, age, duration } of this.strikes) {
            const kind = impact.drive.finisher;
            const opening = impact.drive.beat === 1;
            const envelope = Math.pow(1 - age / duration, 2);
            zoom = Math.max(zoom, (kind ? 0.04 : opening ? 0.025 : 0) * envelope);
            dim = Math.max(dim, (kind ? 0.32 : opening ? 0.16 : 0) * envelope);
            const strength = kind === 'push' ? 0.18 : kind ? 0.14 : opening ? 0.1 : 0.045;
            const impulse = Math.cos(age * (kind === 'sweep' ? 46 : 60)) * envelope * strength;
            const side = kind === 'sweep' ? 0.55 : 0;
            kick = {
                x: kick.x + (impact.aim.x - impact.aim.z * side) * impulse,
                z: kick.z + (impact.aim.z + impact.aim.x * side) * impulse,
            };
        }
        return {
            strikes: this.strikes,
            zoom: this.presence * 0.04 + zoom,
            focus: this.focus,
            kick,
            dim,
        };
    }
    reset() {
        this.strikes = [];
        this.presence = this.windup = 0;
        this.focus = { x: 0, z: 0 };
    }
}
