import { clamp, ellipse, label, line, mix, noise, polygon, ring, smooth, stage, star, windowed, } from './drawing.js';
import { atahoPosition, battleLayout, drawAtaho, drawBear, drawBattleActors, } from './battle.js';
import { opticalScene } from './camera-scene.js';
import { height, width } from './types.js';
function halo(ctx, x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, '#aacddd00');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function transmitted(ctx, frame) {
    opticalScene(ctx, frame);
    if (!frame.enhanced)
        return;
    const { impact, contactMs } = battleLayout;
    const power = windowed(frame.timeMs, contactMs, contactMs + 480, 55);
    ctx.save();
    ctx.globalAlpha *= (frame.reducedMotion ? 0.45 : 1) * power;
    ctx.globalCompositeOperation = 'lighter';
    for (const pass of [0, 1, 2]) {
        ctx.filter = pass === 0 ? 'blur(11px)' : pass === 1 ? 'blur(3px)' : 'none';
        const thickness = pass === 0 ? 24 : pass === 1 ? 10 : 3;
        const color = pass === 0 ? '#6bbde870' : pass === 1 ? '#b0eafa' : '#fffbd9';
        line(ctx, [
            { x: impact.x - 17, y: impact.y + 42 },
            { x: impact.x + 8, y: impact.y - 36 },
        ], color, thickness);
        line(ctx, [
            { x: impact.x - 33, y: impact.y + 7 },
            { x: impact.x + 28, y: impact.y - 4 },
        ], color, thickness);
    }
    ctx.restore();
    label(ctx, '같은 어퍼컷의 실제 접촉에서 선택한 짧은 선만 발광');
}
function para(ctx, frame) {
    opticalScene(ctx, frame);
    if (frame.enhanced) {
        ctx.save();
        // 그림자 파라는 원화를 어둡게 물들이고 빛 파라는 밝기를 더한다. 색막으로 검은 선을 덮지 않는다.
        ctx.globalCompositeOperation = 'multiply';
        const shade = ctx.createLinearGradient(0, 0, width * 0.72, 0);
        shade.addColorStop(0, '#423166ee');
        shade.addColorStop(0.45, '#69509a88');
        shade.addColorStop(1, '#ffffff00');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'screen';
        const light = ctx.createLinearGradient(width * 0.35, 0, width, 0);
        light.addColorStop(0, '#f2ac5e00');
        light.addColorStop(1, '#f2ac5eaa');
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
    label(ctx, '왼쪽 그림자 파라 multiply / 오른쪽 빛 파라 screen · 원화 윤곽 유지');
}
/** 광학 처리는 완성한 장면을 한 번 캡처한 뒤 적용한다. 원화별 필터의 중복 노출을 피한다. */
class CameraSceneSurface {
    canvas;
    context;
    constructor(owner) {
        this.canvas = owner.canvas.ownerDocument.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        const context = this.canvas.getContext('2d');
        if (!context)
            throw new Error('촬영 처리용 Canvas를 만들 수 없습니다.');
        this.context = context;
    }
    capture(frame) {
        this.context.clearRect(0, 0, width, height);
        opticalScene(this.context, frame);
        return this.canvas;
    }
    dispose() {
        this.canvas.width = 0;
        this.canvas.height = 0;
    }
}
const sceneSurfaces = new WeakMap();
function captureScene(ctx, frame) {
    let surface = sceneSurfaces.get(ctx);
    if (!surface) {
        surface = new CameraSceneSurface(ctx);
        sceneSurfaces.set(ctx, surface);
    }
    return surface.capture(frame);
}
const wavePadding = 36;
/** 한 렌더러의 굴절 입력 표면만 소유하며, 장면은 프레임마다 한 번 그린다. */
class WavyGlassSurface {
    canvas;
    context;
    output;
    outputContext;
    constructor(owner) {
        this.canvas = owner.canvas.ownerDocument.createElement('canvas');
        this.canvas.width = width + wavePadding * 2;
        this.canvas.height = height;
        const context = this.canvas.getContext('2d');
        if (!context)
            throw new Error('파도 유리용 Canvas를 만들 수 없습니다.');
        this.context = context;
        this.output = owner.canvas.ownerDocument.createElement('canvas');
        this.output.width = width;
        this.output.height = height;
        const outputContext = this.output.getContext('2d');
        if (!outputContext)
            throw new Error('파도 유리 출력 Canvas를 만들 수 없습니다.');
        this.outputContext = outputContext;
    }
    draw(ctx, frame) {
        const source = this.context;
        source.save();
        source.clearRect(0, 0, this.canvas.width, height);
        source.translate(wavePadding, 0);
        opticalScene(source, frame);
        source.restore();
        // 가장자리 화소를 여유 영역에 연장해 굴절 뒤에도 빈 화면을 샘플링하지 않는다.
        source.save();
        source.imageSmoothingEnabled = false;
        source.drawImage(this.canvas, wavePadding, 0, 1, height, 0, 0, wavePadding, height);
        source.drawImage(this.canvas, width + wavePadding - 1, 0, 1, height, width + wavePadding, 0, wavePadding, height);
        source.restore();
        const output = this.outputContext;
        output.clearRect(0, 0, width, height);
        output.save();
        output.imageSmoothingEnabled = true;
        const amplitude = frame.reducedMotion ? 2 : 23;
        for (let y = 0; y < height; y++) {
            const offset = Math.sin(y * 0.034 - frame.timeMs / 570) * amplitude +
                Math.sin(y * 0.081 + frame.timeMs / 920) * amplitude * 0.3;
            output.drawImage(this.canvas, wavePadding - offset, y, width, 1, 0, y, width, 1);
        }
        output.restore();
        // 축소한 표시 Canvas에 1px 행을 따로 그리면 반화소 이음매가 생긴다.
        ctx.drawImage(this.output, 0, 0);
    }
    dispose() {
        this.canvas.width = 0;
        this.canvas.height = 0;
        this.output.width = 0;
        this.output.height = 0;
    }
}
const waveSurfaces = new WeakMap();
/** 렌더 ctx를 폐기하는 화면 소유자가 함께 호출한다. */
export function disposeCameraOptics(ctx) {
    waveSurfaces.get(ctx)?.dispose();
    waveSurfaces.delete(ctx);
    sceneSurfaces.get(ctx)?.dispose();
    sceneSurfaces.delete(ctx);
}
function wavyGlass(ctx, frame) {
    if (!frame.enhanced)
        opticalScene(ctx, frame);
    else {
        let surface = waveSurfaces.get(ctx);
        if (!surface) {
            surface = new WavyGlassSurface(ctx);
            waveSurfaces.set(ctx, surface);
        }
        surface.draw(ctx, frame);
    }
    label(ctx, '연속적인 수평 굴절 · 가장자리까지 같은 장면을 유지');
}
function diffusion(ctx, frame) {
    const scene = captureScene(ctx, frame);
    ctx.drawImage(scene, 0, 0);
    if (frame.enhanced) {
        ctx.save();
        ctx.globalAlpha *= frame.reducedMotion ? 0.22 : 0.64;
        ctx.globalCompositeOperation = 'screen';
        // 어두운 윤곽은 검정으로 떨어뜨려 빛이 번질 부분만 합성한다.
        ctx.filter = 'brightness(0.6) contrast(12) blur(18px)';
        ctx.drawImage(scene, 0, 0);
        ctx.restore();
    }
    label(ctx, '밝은 부분에서만 부드러운 확산 · 어두운 선과 얼굴은 유지');
}
function blur(ctx, frame) {
    const amount = frame.enhanced
        ? windowed(frame.timeMs, 1250, 2550, 360) *
            (frame.reducedMotion ? 0.025 : 0.24)
        : 0;
    const scene = captureScene(ctx, frame);
    const exposures = amount > 0 ? 19 : 1;
    for (let i = 0; i < exposures; i++) {
        const zoom = 1 + (i / Math.max(1, exposures - 1)) * amount;
        ctx.save();
        // 1, 1/2, 1/3...으로 누적하면 모든 노출이 같은 비율로 섞인다.
        ctx.globalAlpha *= 1 / (i + 1);
        ctx.translate(battleLayout.impact.x, battleLayout.impact.y);
        ctx.scale(zoom, zoom);
        ctx.translate(-battleLayout.impact.x, -battleLayout.impact.y);
        ctx.drawImage(scene, 0, 0);
        ctx.restore();
    }
    label(ctx, '타점을 중심으로 방향이 있는 방사형 번짐 · 초점 흐림과 구별');
}
function flare(ctx, frame, anamorphic) {
    opticalScene(ctx, frame);
    contactLightCore(ctx, frame);
    const source = battleLayout.impact;
    const power = windowed(frame.timeMs, battleLayout.contactMs, battleLayout.contactMs + 650, 120);
    if (frame.enhanced) {
        ctx.save();
        ctx.globalAlpha *= power * (frame.reducedMotion ? 0.45 : 0.95);
        // 렌즈 내부 반사광은 장면을 가리는 색 고리가 아니라 기존 빛에 더해지는 빛상이다.
        ctx.globalCompositeOperation = 'screen';
        if (anamorphic) {
            halo(ctx, source.x, source.y, 80, '#7dcfe180');
            for (const thickness of [15, 5, 1.5]) {
                const streak = ctx.createLinearGradient(source.x - 560, 0, source.x + 560, 0);
                streak.addColorStop(0, '#80d9ff00');
                streak.addColorStop(0.35, '#80d9ff35');
                streak.addColorStop(0.5, thickness < 2 ? '#fffef6' : '#80d9ff99');
                streak.addColorStop(0.65, '#80d9ff35');
                streak.addColorStop(1, '#80d9ff00');
                ctx.beginPath();
                ctx.moveTo(source.x - 560, source.y);
                ctx.lineTo(source.x + 560, source.y);
                ctx.strokeStyle = streak;
                ctx.lineWidth = thickness;
                ctx.stroke();
            }
        }
        else {
            const center = { x: width / 2, y: height / 2 };
            for (let i = 0; i < 6; i++) {
                const p = 0.18 + i * 0.47;
                const x = mix(source.x, center.x * 2 - source.x, p);
                const y = mix(source.y, center.y * 2 - source.y, p);
                const radius = 20 + noise(i) * 48;
                const color = ['#e5a88b80', '#81d1cc65', '#a79ee675'][i % 3];
                ctx.save();
                ctx.globalAlpha *= 0.24;
                ellipse(ctx, x, y, radius, radius, color);
                ctx.restore();
                ring(ctx, x, y, radius, radius, color, 3);
            }
        }
        ctx.restore();
    }
    label(ctx, anamorphic
        ? '같은 접촉광에서 가로로 뻗는 긴 빛띠'
        : '같은 접촉광과 화면 중심을 잇는 축 위의 고스트');
}
function crossLight(ctx, frame) {
    opticalScene(ctx, frame);
    const source = battleLayout.impact;
    const amount = windowed(frame.timeMs, battleLayout.contactMs, battleLayout.contactMs + 550, 80);
    if (frame.enhanced) {
        const size = 24 + amount * (frame.reducedMotion ? 30 : 85);
        ctx.save();
        ctx.globalAlpha = amount;
        star(ctx, source.x, source.y, size, '#f7f3d5', 4);
        ellipse(ctx, source.x, source.y, 7, 7, '#96d4e6');
        ctx.restore();
    }
    label(ctx, '한 광점의 짧은 네 방향 강조 · 긴 수평 플레어와 구별');
}
function rackFocus(ctx, frame) {
    const focus = smooth((frame.timeMs - 1900) / 500);
    const blur = frame.reducedMotion ? 1 : 14;
    ctx.save();
    ctx.filter = frame.enhanced
        ? `blur(${frame.reducedMotion ? 1 : 5}px)`
        : 'none';
    stage(ctx);
    ctx.restore();
    ctx.save();
    ctx.filter = frame.enhanced ? `blur(${blur * (1 - focus)}px)` : 'none';
    drawBear(ctx, frame);
    ctx.restore();
    ctx.save();
    ctx.filter = frame.enhanced ? `blur(${blur * focus}px)` : 'none';
    drawAtaho(ctx, frame);
    ctx.restore();
    label(ctx, focus < 0.5
        ? '아타호의 어퍼컷에 초점'
        : '맞은 곰왕으로 초점 이동 · 전투 시각과 배치는 동일');
}
function multiBokeh(ctx, frame) {
    ctx.save();
    ctx.filter = frame.enhanced
        ? `blur(${frame.reducedMotion ? 2 : 9}px)`
        : 'none';
    // 산·설원은 같은 배경 판이다. 점광원의 위치는 같고 초점에 따른 번짐 면적만 달라진다.
    stage(ctx);
    ctx.restore();
    // 같은 점광원의 초점이 벗어나면 조리개 모양의 넓은 빛망울로 퍼진다.
    for (let i = 0; i < 11; i++) {
        const x = 80 + i * 81;
        const y = 205 + Math.sin(i * 1.8) * 42;
        const radius = frame.enhanced
            ? frame.reducedMotion
                ? 10
                : 22 + noise(i) * 9
            : 7;
        ctx.save();
        ctx.filter = frame.enhanced ? 'blur(2px)' : 'none';
        ellipse(ctx, x, y, radius, radius, frame.enhanced ? '#e4be773b' : '#e4be7790');
        if (frame.enhanced)
            ring(ctx, x, y, radius, radius, '#f4dc9b48', 1.5);
        ctx.restore();
    }
    drawBattleActors(ctx, frame);
    ctx.save();
    ctx.filter = frame.enhanced
        ? `blur(${frame.reducedMotion ? 3 : 24}px)`
        : 'none';
    for (const x of [90, 850]) {
        ctx.fillStyle = '#111c28';
        ctx.fillRect(x, 100, 48, 440);
        ellipse(ctx, x + 20, 170, 76, 120, '#2b4750');
    }
    ctx.restore();
    label(ctx, '전경 큰 흐림 / 전투 선명 / 배경 작은 흐림 · 점광원은 큰 빛망울로');
}
function contactLightPower(frame) {
    return windowed(frame.timeMs, battleLayout.contactMs, battleLayout.contactMs + 650, 120);
}
/** 비교 양쪽에 같은 선명한 광원을 두어 광원과 필터의 차이를 분리한다. */
function contactLightCore(ctx, frame) {
    const { impact } = battleLayout;
    ctx.save();
    ctx.filter = 'none';
    ctx.globalAlpha *= contactLightPower(frame) * (frame.reducedMotion ? 0.6 : 1);
    star(ctx, impact.x, impact.y, 10, '#fff5d9');
    ellipse(ctx, impact.x, impact.y, 4, 4, '#fffdf3');
    ctx.restore();
}
function foggy(ctx, frame) {
    opticalScene(ctx, frame);
    contactLightCore(ctx, frame);
    if (frame.enhanced) {
        ctx.save();
        ctx.globalAlpha *= frame.reducedMotion ? 0.65 : 1;
        ctx.fillStyle = '#dce4d74f';
        ctx.fillRect(0, 0, width, height);
        // stage의 달과 접촉 순간의 광원에만 확산을 붙인다.
        halo(ctx, 765, 95, 210, '#e5edf06b');
        ctx.save();
        ctx.globalAlpha *= contactLightPower(frame);
        halo(ctx, battleLayout.impact.x, battleLayout.impact.y, 220, '#ede6c390');
        ctx.restore();
        const veil = ctx.createLinearGradient(0, 0, 0, height);
        veil.addColorStop(0, '#dfe4df33');
        veil.addColorStop(1, '#dfe4df12');
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
    label(ctx, '젖빛 대비 감소 + 실제 달·접촉광의 확산 · 공중 안개 입자 없음');
}
function doubleShadow(ctx, frame) {
    stage(ctx);
    if (frame.enhanced) {
        const position = atahoPosition(frame);
        const air = clamp((battleLayout.attacker.ground - position.ground) / 180);
        ctx.save();
        ctx.beginPath();
        ctx.save();
        ctx.translate(position.x + 18, battleLayout.attacker.ground + 12);
        ctx.scale(1.25 * (1 - air * 0.35), 1.45 * (1 - air * 0.25));
        // 별도 지면 마스크 하나에만 반노출한다. 겹침으로 농도가 진해지지 않게 한 경로로 채운다.
        ctx.moveTo(-45, 3);
        ctx.bezierCurveTo(-52, -5, -21, -13, 7, -8);
        ctx.bezierCurveTo(24, -16, 53, -20, 64, -10);
        ctx.bezierCurveTo(94, -14, 120, -6, 112, 1);
        ctx.bezierCurveTo(130, 12, 88, 23, 55, 14);
        ctx.bezierCurveTo(27, 24, -18, 16, -45, 3);
        ctx.closePath();
        ctx.restore();
        ctx.moveTo(battleLayout.target.x + 175, battleLayout.target.ground + 12);
        ctx.ellipse(battleLayout.target.x + 35, battleLayout.target.ground + 12, 140, 25, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#102031';
        ctx.globalAlpha *= 0.56;
        ctx.fill();
        ctx.restore();
    }
    // 배우 PNG를 지면에 눕히지 않고 같은 시각의 원본 동작을 그대로 표시한다.
    drawBear(ctx, frame);
    drawAtaho(ctx, frame);
    label(ctx, frame.enhanced
        ? '影ダブラシ · 별도 지면 그림자에 눈밭의 색·무늬가 비침'
        : '같은 배우와 눈밭 · 지면 그림자 마스크 없음');
}
function glow(ctx, frame) {
    opticalScene(ctx, frame);
    const { impact } = battleLayout;
    if (frame.enhanced) {
        ctx.save();
        ctx.globalAlpha *=
            contactLightPower(frame) * (frame.reducedMotion ? 0.6 : 1);
        ctx.globalCompositeOperation = 'screen';
        halo(ctx, impact.x, impact.y, frame.reducedMotion ? 75 : 175, '#75cfeab0');
        ctx.filter = `blur(${frame.reducedMotion ? 7 : 18}px)`;
        ellipse(ctx, impact.x, impact.y, 32, 32, '#78c8e3a0');
        ctx.restore();
    }
    contactLightCore(ctx, frame);
    label(ctx, '같은 선명한 접촉광의 핵 + 주변 번짐 · 몸과 설원 윤곽은 유지');
}
function incidentLight(ctx, frame) {
    stage(ctx);
    if (frame.enhanced) {
        ctx.save();
        ctx.globalAlpha *= frame.reducedMotion ? 0.32 : 0.85;
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const x = 90 + i * 58;
            ctx.moveTo(x, -20);
            ctx.lineTo(x + 20, -20);
            ctx.lineTo(x + 350, 445);
            ctx.lineTo(x + 260, 445);
            ctx.closePath();
        }
        const sunlight = ctx.createLinearGradient(0, -20, 0, 445);
        sunlight.addColorStop(0, '#fff0b899');
        sunlight.addColorStop(0.35, '#efcd8080');
        sunlight.addColorStop(1, '#efcd8018');
        ctx.fillStyle = sunlight;
        ctx.fill();
        ctx.save();
        // 빛 밖까지 고르게 빛나는 입자를 뿌리지 않고 각 광주 안의 먼지만 드러낸다.
        ctx.clip();
        for (let i = 0; i < 48; i++) {
            const y = 60 + ((noise(i) * 370 + frame.timeMs * 0.018) % 370);
            const origin = 90 + (i % 4) * 58;
            const progress = (y + 20) / 465;
            const x = mix(origin + 260 * progress, origin + 20 + 330 * progress, noise(i + 200));
            ellipse(ctx, x, y, 1.2 + noise(i + 50), 1.2 + noise(i + 50), '#fff2cbd0');
        }
        ctx.restore();
        ellipse(ctx, 535, 429, 210, 21, '#ecd7a360');
        ctx.restore();
    }
    drawBattleActors(ctx, frame);
    polygon(ctx, [
        { x: 0, y: 4 },
        { x: 200, y: 75 },
        { x: 130, y: 98 },
        { x: 90, y: 170 },
        { x: 66, y: 155 },
        { x: 96, y: 88 },
        { x: 0, y: 30 },
    ], '#2c455b');
    label(ctx, '입사광은 사선 광주·틴들 현상으로 해석 · 공간의 먼지와 빛줄기');
}
/** 광원·합성·피사계 표현은 각각 다른 그리기 범위를 사용한다. */
export function drawCameraOptics(ctx, id, frame) {
    switch (id) {
        case 'camera-transmitted-light':
            transmitted(ctx, frame);
            break;
        case 'camera-para':
            para(ctx, frame);
            break;
        case 'camera-wavy-glass':
            wavyGlass(ctx, frame);
            break;
        case 'camera-diffusion':
            diffusion(ctx, frame);
            break;
        case 'camera-blur':
            blur(ctx, frame);
            break;
        case 'camera-lens-flare':
            flare(ctx, frame, false);
            break;
        case 'camera-anamorphic':
            flare(ctx, frame, true);
            break;
        case 'camera-cross-light':
            crossLight(ctx, frame);
            break;
        case 'camera-rack-focus':
            rackFocus(ctx, frame);
            break;
        case 'camera-multi-bokeh':
            multiBokeh(ctx, frame);
            break;
        case 'camera-foggy':
            foggy(ctx, frame);
            break;
        case 'camera-double-shadow':
            doubleShadow(ctx, frame);
            break;
        case 'camera-glow':
            glow(ctx, frame);
            break;
        case 'camera-incident-light':
            incidentLight(ctx, frame);
            break;
        default:
            return false;
    }
    return true;
}
