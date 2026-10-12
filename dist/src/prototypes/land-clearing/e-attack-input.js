export const eAttackHoldTime = 0.45;
/** E를 누른 시간과 취소를 소유한다. 실제 대상·기세 판정은 놓는 순간 World가 수행한다. */
export class EAttackInput {
    pressedAt = null;
    press(time) {
        if (this.pressedAt === null)
            this.pressedAt = time;
    }
    progress(time) {
        return this.pressedAt === null
            ? null
            : Math.min(1, Math.max(0, time - this.pressedAt) / eAttackHoldTime);
    }
    release(time) {
        const progress = this.progress(time);
        this.cancel();
        return progress === null ? null : progress >= 1 ? 'weakStrike' : 'attack';
    }
    cancel() {
        this.pressedAt = null;
    }
}
