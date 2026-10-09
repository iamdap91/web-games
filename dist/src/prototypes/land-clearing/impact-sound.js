/** 사용자 입력 후에만 오디오를 열고 짧은 타격음을 합성한다. */
export class ImpactSound {
    context = null;
    unlock() {
        this.context ??= new AudioContext();
        if (this.context.state === 'suspended')
            void this.context.resume().catch(() => { });
    }
    play(impact) {
        const context = this.context;
        if (!context || context.state !== 'running')
            return;
        const now = context.currentTime;
        const duration = impact.removed ? 0.22 : 0.11;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(impact.kind === 'rock' ? 95 : impact.kind === 'tree' ? 125 : 180, now);
        oscillator.frequency.exponentialRampToValueAtTime(35, now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(impact.removed ? 0.16 : 0.1, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
        };
        oscillator.start(now);
        oscillator.stop(now + duration);
    }
    dispose() {
        if (this.context)
            void this.context.close().catch(() => { });
        this.context = null;
    }
}
