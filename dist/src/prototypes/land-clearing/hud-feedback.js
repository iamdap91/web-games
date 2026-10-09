const materials = ['wood', 'stone'];
const skills = ['slam', 'rush'];
/** 게임 수치와 별도로 짧은 HUD 피드백의 수명만 소유한다. 시간 단위는 밀리초다. */
export class ClearingHudFeedback {
    amounts = { wood: 0, stone: 0 };
    gains = {
        wood: { amount: 0, until: 0 },
        stone: { amount: 0, until: 0 },
    };
    ready = { slam: false, rush: false };
    pulseUntil = { slam: 0, rush: 0 };
    constructor(state) {
        this.reset(state);
    }
    reset(state) {
        this.amounts = { wood: state.wood, stone: state.stone };
        for (const material of materials)
            this.gains[material] = { amount: 0, until: 0 };
        this.synchronizeReadiness(state);
    }
    synchronizeReadiness(state) {
        for (const skill of skills) {
            this.ready[skill] = state[skill].ready;
            this.pulseUntil[skill] = 0;
        }
    }
    update(state, now) {
        for (const material of materials) {
            const delta = state[material] - this.amounts[material];
            const gain = this.gains[material];
            if (delta > 0) {
                gain.amount = (gain.until > now ? gain.amount : 0) + delta;
                gain.until = now + 1200;
            }
            else if (delta < 0) {
                this.gains[material] = { amount: 0, until: 0 };
            }
            this.amounts[material] = state[material];
        }
        for (const skill of skills) {
            const ready = state[skill].ready;
            if (ready && !this.ready[skill])
                this.pulseUntil[skill] = now + 750;
            if (!ready)
                this.pulseUntil[skill] = 0;
            this.ready[skill] = ready;
        }
    }
    snapshot(now) {
        const gain = (material) => this.gains[material].until > now ? this.gains[material].amount : 0;
        return {
            woodGain: gain('wood'),
            stoneGain: gain('stone'),
            slamPulse: this.pulseUntil.slam > now,
            rushPulse: this.pulseUntil.rush > now,
        };
    }
}
