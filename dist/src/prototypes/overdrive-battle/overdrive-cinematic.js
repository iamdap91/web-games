import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { overdriveIntro } from './overdrive-intro.js';
import { drawDriveStrikes } from './overdrive-strikes.js';
import { barrageHitTime, tigerBarrageRules, } from './tiger-barrage.js';
function clamp(value) {
    return Math.max(0, Math.min(1, value));
}
/** 기 모으기와 호랑이는 유리 잔상에 복사하지 않고 파편 앞까지 이어 그린다. */
export class OverdriveCinematic {
    reducedMotion;
    canvas = document.createElement('canvas');
    context;
    tiger = new Image();
    rageTiger = document.createElement('canvas');
    impact = null;
    constructor(container, reducedMotion) {
        this.reducedMotion = reducedMotion;
        this.canvas.className = 'overdrive-cinematic';
        this.canvas.setAttribute('aria-hidden', 'true');
        this.canvas.hidden = true;
        this.context = this.canvas.getContext('2d');
        container.append(this.canvas);
    }
    async load() {
        const frame = manifest.assets.find((asset) => asset.id === 'hwanse/ataho')
            ?.animations['effect-tiger-fist']?.frames[0];
        if (!frame)
            throw new Error('호격권 호랑이 리소스 정보가 없습니다.');
        this.tiger.src = new URL(`../../../../${frame.localPath}`, import.meta.url).href;
        await this.tiger.decode();
        this.rageTiger.width = this.tiger.naturalWidth;
        this.rageTiger.height = this.tiger.naturalHeight;
        const context = this.rageTiger.getContext('2d');
        if (!context)
            return;
        // 원본 도트와 어두운 줄무늬를 보존한 붉은 변형을 한 번만 만든다.
        context.drawImage(this.tiger, 0, 0);
        context.globalCompositeOperation = 'multiply';
        context.fillStyle = '#ff334d';
        context.fillRect(0, 0, this.rageTiger.width, this.rageTiger.height);
        context.globalCompositeOperation = 'destination-in';
        context.drawImage(this.tiger, 0, 0);
        context.globalCompositeOperation = 'source-over';
    }
    renderDrive(options) {
        if (options.feedback.strikes.length === 0) {
            this.canvas.hidden = true;
            return;
        }
        const context = this.prepareFrame(options.width, options.height);
        if (!context)
            return;
        drawDriveStrikes(context, options.feedback, {
            ...options,
            reducedMotion: this.reducedMotion,
        });
    }
    render(options) {
        const { time, width, height, hero, fist, direction } = options;
        const context = this.prepareFrame(width, height);
        if (!context)
            return;
        const charge = clamp(time / overdriveIntro.chargeEnd);
        const release = clamp((time - overdriveIntro.burstAt) / 0.42);
        this.drawFocus(context, hero, {
            width,
            height,
            strength: charge * (1 - release),
        });
        if (time < overdriveIntro.tigerAt) {
            this.drawCharge(context, hero, time, height);
            return;
        }
        if (time >= overdriveIntro.impactAt)
            this.impact ??= options.impact;
        const impact = this.impact ?? options.impact;
        const approach = clamp((time - overdriveIntro.tigerAt) /
            (overdriveIntro.impactAt - overdriveIntro.tigerAt));
        const burst = clamp((time - overdriveIntro.burstAt) / 0.56);
        const fade = 1 - clamp((time - overdriveIntro.burstAt - 0.16) / 0.4);
        const size = Math.min(height * 0.55, width * 0.46);
        const travel = this.reducedMotion ? 0 : burst;
        const x = fist.x +
            (impact.x - fist.x) * approach +
            direction * travel * size * 0.52;
        const y = fist.y + (impact.y - fist.y) * approach - travel * size * 0.12;
        const scale = this.reducedMotion
            ? 0.85
            : 0.28 + approach * 0.57 + burst * 0.65;
        context.save();
        context.translate(x, y);
        context.scale(direction, 1);
        if (!this.reducedMotion) {
            this.drawPressure(context, size, burst, fade);
            context.globalCompositeOperation = 'screen';
            for (let i = 3; i > 0; i--) {
                context.globalAlpha = fade * 0.1 * (1 - i / 5);
                this.drawTiger(context, size * scale * (1 + i * 0.04), -size * i * 0.055);
            }
        }
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = fade * (this.reducedMotion ? 0.75 : 0.95);
        context.shadowColor = '#ffae36';
        context.shadowBlur = this.reducedMotion ? 0 : size * 0.055;
        this.drawTiger(context, size * scale, 0);
        context.restore();
    }
    prepareFrame(width, height) {
        const context = this.context;
        if (!context)
            return null;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const pixelWidth = Math.round(width * dpr);
        const pixelHeight = Math.round(height * dpr);
        if (this.canvas.width !== pixelWidth ||
            this.canvas.height !== pixelHeight) {
            this.canvas.width = pixelWidth;
            this.canvas.height = pixelHeight;
        }
        this.canvas.hidden = false;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, width, height);
        context.imageSmoothingEnabled = false;
        return context;
    }
    renderBarrage(options) {
        const { state, width, height, hero, target, direction } = options;
        const context = this.prepareFrame(width, height);
        if (!context)
            return;
        const time = state.elapsed;
        const release = clamp((time - tigerBarrageRules.finalAt) /
            (tigerBarrageRules.duration - tigerBarrageRules.finalAt));
        this.drawFocus(context, target, {
            width,
            height,
            strength: Math.min(1, time / 0.12) * (1 - release),
        });
        const size = Math.min(height * 0.5, width * 0.58);
        if (time < tigerBarrageRules.finalAt) {
            this.drawBarrageStreaks(context, state, { hero, target, size });
            if (time >= tigerBarrageRules.windupAt) {
                const charge = clamp((time - tigerBarrageRules.windupAt) /
                    (tigerBarrageRules.finalAt - tigerBarrageRules.windupAt));
                context.save();
                context.strokeStyle = '#ffb6bd';
                context.shadowColor = '#f02b4c';
                context.shadowBlur = this.reducedMotion ? 0 : 14;
                context.lineWidth = 2;
                context.globalAlpha = charge * 0.8;
                context.beginPath();
                context.arc(hero.x, hero.y, size * (this.reducedMotion ? 0.13 : 0.3 - charge * 0.22), 0, Math.PI * 2);
                context.stroke();
                context.restore();
            }
            return;
        }
        const fade = 1 - clamp((release - 0.42) / 0.58);
        const approach = this.reducedMotion ? 1 : clamp(release * 4);
        const x = hero.x +
            (target.x - hero.x) * approach +
            (this.reducedMotion ? 0 : direction * size * release * 0.35);
        const y = hero.y + (target.y - hero.y) * approach;
        context.save();
        context.translate(x, y);
        context.scale(direction, 1);
        if (!this.reducedMotion) {
            this.drawPressure(context, size * 0.8, release, fade, '#ff697c');
            const flare = context.createRadialGradient(0, 0, 0, 0, 0, size * 0.7);
            flare.addColorStop(0, `rgba(255, 170, 183, ${Math.max(0, 1 - release * 3) * 0.6})`);
            flare.addColorStop(1, 'rgba(235, 32, 64, 0)');
            context.fillStyle = flare;
            context.fillRect(-size, -size, size * 2, size * 2);
        }
        context.globalAlpha = fade * 0.96;
        // 어두운 자주색 외곽으로 붉은 호랑이의 윤곽을 받친다.
        context.shadowColor = '#321425';
        context.shadowBlur = this.reducedMotion ? 0 : 10;
        this.drawTiger(context, size * (this.reducedMotion ? 1 : 0.85 + release * 0.65), 0, this.rageTiger);
        context.restore();
    }
    drawBarrageStreaks(context, state, options) {
        const { hero, target, size } = options;
        if (this.reducedMotion)
            return;
        context.save();
        for (let hit = Math.max(1, state.hits - 2); hit <= state.hits; hit++) {
            const age = state.elapsed - barrageHitTime(hit);
            if (age < 0 || age > 0.17)
                continue;
            const fade = 1 - age / 0.17;
            const angle = hit * 2.4;
            const x = target.x + Math.cos(angle) * size * 0.035;
            const y = target.y + Math.sin(angle) * size * 0.07;
            context.globalAlpha = fade * 0.9;
            for (const outline of [true, false]) {
                context.strokeStyle = outline
                    ? '#321425'
                    : hit % 2
                        ? '#ff435d'
                        : '#ffbcc4';
                context.lineWidth = outline ? 7 : 2.5;
                context.beginPath();
                context.moveTo(hero.x, hero.y + Math.sin(angle) * size * 0.06);
                context.quadraticCurveTo((hero.x + x) / 2, y - Math.sin(angle) * size * 0.18, x, y);
                context.stroke();
                for (let ray = 0; ray < 5; ray++) {
                    const theta = angle + ray * Math.PI * 0.4;
                    const inner = size * (0.012 + age * 0.13);
                    const outer = inner + size * 0.055 * fade;
                    context.beginPath();
                    context.moveTo(x + Math.cos(theta) * inner, y + Math.sin(theta) * inner);
                    context.lineTo(x + Math.cos(theta) * outer, y + Math.sin(theta) * outer);
                    context.stroke();
                }
            }
        }
        context.restore();
    }
    drawFocus(context, hero, options) {
        const { width, height, strength } = options;
        const radius = height * 0.32;
        const shade = context.createRadialGradient(hero.x, hero.y, radius * 0.3, hero.x, hero.y, radius * 2.8);
        shade.addColorStop(0, 'rgba(8, 10, 16, 0)');
        shade.addColorStop(0.4, `rgba(8, 10, 16, ${strength * 0.28})`);
        shade.addColorStop(1, `rgba(8, 10, 16, ${strength * 0.72})`);
        context.fillStyle = shade;
        context.fillRect(0, 0, width, height);
    }
    drawCharge(context, hero, time, height) {
        const power = clamp(time / overdriveIntro.chargeEnd);
        const radius = height * (0.09 + power * 0.025);
        context.save();
        context.translate(hero.x, hero.y);
        const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
        glow.addColorStop(0, `rgba(255, 193, 65, ${power * 0.16})`);
        glow.addColorStop(1, 'rgba(255, 154, 45, 0)');
        context.fillStyle = glow;
        context.fillRect(-radius, -radius, radius * 2, radius * 2);
        if (!this.reducedMotion) {
            // 팔의 두 회전과 같은 주기로 기운이 안쪽으로 감긴다.
            const angle = (time / overdriveIntro.windupCycle) * Math.PI * 2;
            for (let i = 0; i < 3; i++) {
                context.beginPath();
                context.ellipse(0, radius * 0.2, radius * (1 + i * 0.13), radius * 0.48, -0.25, angle + i * 2.1, angle + i * 2.1 + 1.25);
                context.strokeStyle = i === 0 ? '#ffdfa0' : '#e99b39';
                context.globalAlpha = (0.35 + power * 0.5) / (1 + i * 0.6);
                context.lineWidth = Math.max(1.5, height * 0.004 - i * 0.5);
                context.stroke();
            }
            context.globalAlpha = power * 0.75;
            context.fillStyle = '#ffe0a0';
            for (let i = 0; i < 12; i++) {
                const phase = (time * 1.8 + i / 12) % 1;
                const ray = i * 2.4;
                const distance = radius * (1.65 - phase * 1.2);
                context.fillRect(Math.cos(ray) * distance, Math.sin(ray) * distance - phase * radius * 0.3, 2, 5);
            }
        }
        context.restore();
    }
    drawTiger(context, width, offset, source = this.tiger) {
        const height = (width * this.tiger.naturalHeight) / this.tiger.naturalWidth;
        // 입 앞쪽이 타격점을 향하도록 원본 오른쪽 끝을 기준으로 배치한다.
        context.drawImage(source, -width * 0.92 + offset, -height * 0.52, width, height);
    }
    drawPressure(context, size, burst, fade, color = '#ffe0a4') {
        if (burst <= 0 || fade <= 0)
            return;
        context.save();
        context.globalAlpha = fade * 0.65;
        context.strokeStyle = color;
        context.lineWidth = Math.max(1, size * 0.015 * (1 - burst));
        context.beginPath();
        context.ellipse(0, 0, size * (0.2 + burst * 1.6), size * (0.4 + burst), 0, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = fade * 0.38;
        for (let i = 0; i < 14; i++) {
            const angle = i * 2.4;
            const inner = size * (0.4 + burst * 0.8);
            const outer = inner + size * (0.2 + (i % 3) * 0.12);
            context.beginPath();
            context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner * 0.7);
            context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer * 0.7);
            context.stroke();
        }
        context.restore();
    }
    clear() {
        this.canvas.hidden = true;
        this.impact = null;
    }
    dispose() {
        this.clear();
        this.canvas.remove();
    }
}
