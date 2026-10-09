import { overdriveIntro } from './overdrive-intro.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
export class BattleSound {
    context = null;
    muted = false;
    roarBuffer = null;
    roared = false;
    voices = new Set();
    async load(signal) {
        const asset = manifest.assets.find((entry) => entry.id === 'audio/tiger-roar');
        if (!asset?.audio)
            return;
        try {
            const response = await fetch(new URL(`../../../../${asset.audio.localPath}`, import.meta.url), { signal });
            if (!response.ok)
                return;
            const data = await response.arrayBuffer();
            if (signal.aborted)
                return;
            // 첫 발동 전에 디코딩하되 실제 재생은 사용자 입력으로 잠금을 해제한다.
            this.context ??= new AudioContext();
            const context = this.context;
            const buffer = await context.decodeAudioData(data);
            if (!signal.aborted && this.context === context)
                this.roarBuffer = buffer;
        }
        catch {
            /* 음원을 읽을 수 없으면 저음 타격만으로 전투를 계속한다. */
        }
    }
    unlock() {
        if (this.muted)
            return;
        try {
            this.context ??= new AudioContext();
            if (this.context.state === 'suspended')
                void this.context.resume().catch(() => { });
        }
        catch {
            /* 소리를 사용할 수 없는 환경에서도 전투는 계속한다. */
        }
    }
    toggle() {
        this.muted = !this.muted;
        if (this.muted)
            this.stop();
        else
            this.unlock();
        return this.muted;
    }
    tone(frequency, end, duration, volume, delay = 0, waveform = 'triangle') {
        const context = this.context;
        if (!context || this.muted || context.state !== 'running')
            return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime + delay;
        oscillator.type = waveform;
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain).connect(context.destination);
        this.voices.add(oscillator);
        oscillator.onended = () => {
            this.voices.delete(oscillator);
            oscillator.disconnect();
            gain.disconnect();
        };
        oscillator.start(now);
        oscillator.stop(now + duration);
    }
    impact(impact) {
        // 일반 턴·오버드라이브 타격은 무음으로 두고 필살기 타격음만 유지한다.
        if (!impact.barrage)
            return;
        if (impact.barrage.final) {
            this.strike();
            this.releasePower();
            this.playRoar({ rate: 0.84, volume: 0.76, cutoff: 6000, delay: 0 });
            return;
        }
        const kick = impact.barrage.hit >= 4;
        this.tone(kick ? 130 + impact.barrage.hit * 4 : 230, 38, 0.065, 0.12);
        this.noise({
            duration: 0.055,
            volume: kick ? 0.085 : 0.065,
            band: 'bandpass',
            frequency: impact.barrage.hit % 2 ? 1900 : 950,
            endFrequency: 500,
            attack: 0.003,
        });
    }
    noise(options) {
        const context = this.context;
        if (!context || this.muted || context.state !== 'running')
            return;
        const { duration, volume, band, frequency, endFrequency, attack } = options;
        const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * duration), context.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const samples = buffer.getChannelData(channel);
            for (let i = 0; i < samples.length; i++) {
                samples[i] = Math.random() * 2 - 1;
            }
        }
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        const now = context.currentTime + (options.delay ?? 0);
        source.buffer = buffer;
        filter.type = band;
        filter.Q.value = 0.8;
        filter.frequency.setValueAtTime(frequency, now);
        filter.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        source.connect(filter).connect(gain).connect(context.destination);
        this.voices.add(source);
        source.onended = () => {
            this.voices.delete(source);
            source.disconnect();
            filter.disconnect();
            gain.disconnect();
        };
        source.start(now);
        source.stop(now + duration);
    }
    unleash() {
        this.roared = false;
        this.tone(58, 100, overdriveIntro.chargeEnd, 0.055, 0, 'sine');
        for (const delay of [0.04, overdriveIntro.windupCycle + 0.04]) {
            this.noise({
                duration: 0.28,
                volume: 0.065,
                band: 'bandpass',
                frequency: 580,
                endFrequency: 2400,
                attack: 0.13,
                delay,
            });
        }
        this.noise({
            duration: overdriveIntro.impactAt,
            volume: 0.1,
            band: 'lowpass',
            frequency: 350,
            endFrequency: 2600,
            attack: overdriveIntro.chargeEnd,
        });
    }
    beginBarrage() {
        this.stop();
        this.tone(65, 240, 0.23, 0.1, 0, 'sine');
        this.noise({
            duration: 0.24,
            volume: 0.09,
            band: 'bandpass',
            frequency: 400,
            endFrequency: 2300,
            attack: 0.12,
        });
    }
    updateIntro(time) {
        if (this.roared || time < overdriveIntro.tigerAt)
            return;
        this.roared = true;
        // 실제 연출 시간을 따라 발동하므로 준비 중 창을 벗어나도 포효가 먼저 나가지 않는다.
        this.playRoar({ rate: 0.92, volume: 0.72, cutoff: 6500, delay: 0 });
        this.playRoar({ rate: 0.78, volume: 0.16, cutoff: 1300, delay: 0.015 });
    }
    strike() {
        this.tone(125, 30, 0.3, 0.22, 0, 'sine');
        this.noise({
            duration: 0.09,
            volume: 0.2,
            band: 'bandpass',
            frequency: 1200,
            endFrequency: 650,
            attack: 0.003,
        });
    }
    releasePower() {
        this.tone(68, 27, 0.48, 0.13, 0, 'sine');
    }
    playRoar(options) {
        const context = this.context;
        if (!context ||
            !this.roarBuffer ||
            this.muted ||
            context.state !== 'running')
            return;
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        const now = context.currentTime + options.delay;
        const duration = Math.min(this.roarBuffer.duration / options.rate, options.duration ?? Infinity);
        source.buffer = this.roarBuffer;
        source.playbackRate.value = options.rate;
        filter.type = 'lowpass';
        filter.frequency.value = options.cutoff;
        filter.Q.value = 0.5;
        gain.gain.setValueAtTime(options.volume, now);
        gain.gain.setValueAtTime(options.volume, now + duration * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        source.connect(filter).connect(gain).connect(context.destination);
        this.voices.add(source);
        source.onended = () => {
            this.voices.delete(source);
            source.disconnect();
            filter.disconnect();
            gain.disconnect();
        };
        source.start(now);
        source.stop(now + duration);
    }
    stop() {
        this.voices.forEach((voice) => voice.stop());
        this.voices.clear();
    }
    dispose() {
        this.stop();
        if (this.context)
            void this.context.close().catch(() => { });
        this.context = null;
        this.roarBuffer = null;
    }
}
