/** 모형의 표시 시간만 양자화한다. 보행·입력 시간은 답사 객체가 소유한다. */
export class ModelCadence {
    seconds = 0;
    stepped = true;
    advance(delta, stepped) {
        if (!Number.isFinite(delta) || delta < 0)
            return;
        this.seconds += Math.min(delta, 0.05);
        this.stepped = stepped;
    }
    get snapshot() {
        const frame = Math.floor((this.seconds + 1e-9) * 12);
        return {
            time: this.stepped ? frame / 12 : this.seconds,
            frame,
            stepped: this.stepped,
        };
    }
}
