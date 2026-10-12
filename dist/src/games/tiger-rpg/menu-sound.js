/** 선택을 옮긴 사용자 입력에서만 작은 음을 합성한다. 각 창이 오디오 수명을 소유한다. */
export class MenuSound {
    getEnabled;
    context = null;
    disposed = false;
    constructor(getEnabled) {
        this.getEnabled = getEnabled;
    }
    play() {
        if (this.disposed ||
            !this.getEnabled() ||
            typeof AudioContext === 'undefined')
            return;
        try {
            const context = (this.context ??= new AudioContext());
            if (context.state === 'suspended')
                void context.resume().catch(() => { });
            if (context.state === 'closed')
                return;
            const now = context.currentTime;
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(760, now);
            oscillator.frequency.exponentialRampToValueAtTime(580, now + 0.055);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.035, now + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
            oscillator.connect(gain).connect(context.destination);
            oscillator.onended = () => {
                oscillator.disconnect();
                gain.disconnect();
            };
            oscillator.start(now);
            oscillator.stop(now + 0.06);
        }
        catch {
            // 오디오를 사용할 수 없어도 메뉴 선택은 계속 동작한다.
        }
    }
    dispose() {
        this.disposed = true;
        if (this.context)
            void this.context.close().catch(() => { });
        this.context = null;
    }
}
